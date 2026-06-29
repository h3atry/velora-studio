import { app, BrowserWindow, ipcMain, screen, session } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { listMediaDevices, startStream, stopStream, getStreamStatus } from './streamService';
import {
  clearChatMessages,
  connectChat,
  disconnectChat,
  getChatMessages as getServiceChatMessages,
  getChatStatus,
  getPerformanceStats,
  setChatListeners,
  setLiveSessionActive,
} from './chatService';
import {
  connectPlatform,
  disconnectPlatform,
  getPlatformAccounts,
  isOAuthConfigured,
  refreshPlatformStreamKey,
  saveManualStreamKey,
  startOAuthRefreshTimer,
} from './auth/platformAuthService';
import type { AuthPlatform } from './auth/types';
import {
  attachWindowCrashHandlers,
  installCrashHandlers,
  logError,
  logInfo,
  logWarn,
} from './crashLogger';
import {
  getMobileChatInfo,
  handleMobileChatMessages,
  handleMobileChatPerformance,
  handleMobileChatStatus,
  regenerateMobileChatToken,
  resetMobileChatTracking,
  startMobileChatServer,
  stopMobileChatServer,
  generateMobileChatQrDataUrl,
} from './mobileChatServer';
import { registerExtendedIpcHandlers } from './ipc/registerHandlers';
import { validateStreamStart } from './ipc/validatePayload';
import { initAutoUpdater } from './services/autoUpdater';
import { startAlertsServer } from './services/alertsServer';
import { loadChatFilters } from './services/persistStore';
import { setChatFilters } from './chatService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveEnvPath(): string {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
  ];
  if (app.isPackaged) {
    candidates.unshift(path.join(path.dirname(process.execPath), '.env'));
  }
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

dotenv.config({ path: resolveEnvPath() });
const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let chatPopoutWindow: BrowserWindow | null = null;
let chatOverlayWindow: BrowserWindow | null = null;

let chatMessagesCache: unknown[] = [];
const appStartTime = Date.now();

interface ChatPopoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function chatPopoutBoundsPath(): string {
  return path.join(app.getPath('userData'), 'chat-popout-bounds.json');
}

function loadChatPopoutBounds(): Partial<ChatPopoutBounds> | null {
  try {
    const raw = fs.readFileSync(chatPopoutBoundsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ChatPopoutBounds>;
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed;
    }
  } catch {
    /* no saved bounds */
  }
  return null;
}

function saveChatPopoutBounds(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  const bounds = win.getBounds();
  const payload: ChatPopoutBounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(chatPopoutBoundsPath(), JSON.stringify(payload), 'utf-8');
  } catch (err) {
    logWarn('Falha ao salvar bounds do chat popout', { error: String(err) });
  }
}

function broadcastToAllRenderers(channel: string, payload: unknown) {
  const targets = [mainWindow, chatPopoutWindow, chatOverlayWindow].filter(
    (w) => w && !w.isDestroyed()
  );
  for (const win of targets) {
    win?.webContents.send(channel, payload);
  }
}

function getPreloadPath() {
  const mjs = path.join(__dirname, 'preload.mjs');
  const js = path.join(__dirname, 'preload.js');
  return fs.existsSync(mjs) ? mjs : js;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    backgroundColor: '#0a0b12',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0b12',
      symbolColor: '#f1f3f9',
      height: 36,
    },
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      // Mantém timers/preview ativos com janela em segundo plano durante LIVE.
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    const ttiMs = Date.now() - appStartTime;
    logInfo('TTI ready-to-show', { ms: ttiMs });
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Fallback: se o renderer travar antes do paint, ainda mostra a janela
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logWarn('ready-to-show timeout — forçando exibição');
      mainWindow.show();
    }
  }, 4000);

  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) logError('renderer-console', { message });
  });

  if (VITE_DEV_URL) {
    mainWindow.loadURL(VITE_DEV_URL);
  } else {
    const indexHtml = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(indexHtml).catch((err) => {
      logError('Falha ao carregar UI', { error: String(err), indexHtml });
    });
  }

  attachWindowCrashHandlers(mainWindow, 'main', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    logWarn('Recarregando janela principal após crash do renderer');
    mainWindow.webContents.reload();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    chatPopoutWindow?.close();
    chatOverlayWindow?.close();
  });
}

function notifyChatDocked(mode: 'popout' | 'overlay') {
  mainWindow?.webContents.send('chat-mode-changed', 'docked');
  mainWindow?.webContents.send('chat-window-closed', mode);
  mainWindow?.focus();
}

function createChatWindow(mode: 'popout' | 'overlay') {
  const isOverlay = mode === 'overlay';

  const win = new BrowserWindow({
    width: isOverlay ? 380 : 420,
    height: isOverlay ? 520 : 640,
    minWidth: 300,
    minHeight: 400,
    backgroundColor: isOverlay ? '#00000000' : '#11131a',
    transparent: isOverlay,
    frame: !isOverlay,
    autoHideMenuBar: true,
    alwaysOnTop: isOverlay,
    skipTaskbar: isOverlay,
    resizable: true,
    hasShadow: !isOverlay,
    title: 'Chat da LIVE — Velora',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenu(null);
  win.setMenuBarVisibility(false);

  const query = `?view=chat&mode=${mode}`;
  if (VITE_DEV_URL) {
    win.loadURL(`${VITE_DEV_URL}${query}`);
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), {
      query: { view: 'chat', mode },
    });
  }

  attachWindowCrashHandlers(win, `chat-${mode}`, () => {
    if (win.isDestroyed()) return;
    logWarn(`Recarregando chat ${mode} após crash`);
    win.webContents.reload();
  });

  if (isOverlay) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(width - 400, height - 560);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    const saved = loadChatPopoutBounds();
    if (saved) {
      win.setBounds({
        x: saved.x,
        y: saved.y,
        width: saved.width,
        height: saved.height,
      });
    }
    const persistBounds = () => saveChatPopoutBounds(win);
    win.on('resize', persistBounds);
    win.on('move', persistBounds);
    win.on('close', persistBounds);
  }

  win.on('closed', () => {
    if (mode === 'popout') chatPopoutWindow = null;
    else chatOverlayWindow = null;

    notifyChatDocked(mode);
  });

  return win;
}

function setupIpc() {
  ipcMain.handle('chat-open-popout', () => {
    if (chatPopoutWindow && !chatPopoutWindow.isDestroyed()) {
      chatPopoutWindow.focus();
      return;
    }
    chatPopoutWindow = createChatWindow('popout');
    mainWindow?.webContents.send('chat-mode-changed', 'popout');
  });

  ipcMain.handle('chat-open-overlay', () => {
    if (chatOverlayWindow && !chatOverlayWindow.isDestroyed()) {
      chatOverlayWindow.focus();
      return;
    }
    chatOverlayWindow = createChatWindow('overlay');
    mainWindow?.webContents.send('chat-mode-changed', 'overlay');
  });

  ipcMain.handle('chat-close-external', (_event, mode: 'popout' | 'overlay') => {
    if (mode === 'popout' && chatPopoutWindow && !chatPopoutWindow.isDestroyed()) {
      chatPopoutWindow.close();
      return;
    }
    if (mode === 'overlay' && chatOverlayWindow && !chatOverlayWindow.isDestroyed()) {
      chatOverlayWindow.close();
      return;
    }
    notifyChatDocked(mode);
  });

  ipcMain.handle('chat-return-to-docked', () => {
    if (chatPopoutWindow && !chatPopoutWindow.isDestroyed()) {
      chatPopoutWindow.close();
      return;
    }
    if (chatOverlayWindow && !chatOverlayWindow.isDestroyed()) {
      chatOverlayWindow.close();
      return;
    }
    notifyChatDocked('popout');
  });

  ipcMain.handle('chat-popout-toggle-pin', () => {
    if (!chatPopoutWindow || chatPopoutWindow.isDestroyed()) {
      return { pinned: false };
    }
    const next = !chatPopoutWindow.isAlwaysOnTop();
    chatPopoutWindow.setAlwaysOnTop(next, 'floating');
    return { pinned: next };
  });

  ipcMain.handle('chat-popout-is-pinned', () => ({
    pinned: chatPopoutWindow && !chatPopoutWindow.isDestroyed()
      ? chatPopoutWindow.isAlwaysOnTop()
      : false,
  }));

  ipcMain.on('chat-broadcast', (_event, payload: unknown) => {
    if (Array.isArray(payload)) {
      chatMessagesCache = payload;
    }
    broadcastToAllRenderers('chat-update', payload);
  });

  ipcMain.handle('chat-get-messages', () =>
    chatMessagesCache.length > 0 ? chatMessagesCache : getServiceChatMessages()
  );

  ipcMain.handle('media-list-devices', () => listMediaDevices());
  ipcMain.handle('stream-start', (_event, config) => {
    const validated = validateStreamStart(config);
    if (!validated.ok) {
      return { running: false, error: validated.error };
    }
    setLiveSessionActive(true);
    return startStream(validated.value);
  });
  ipcMain.handle('stream-stop', async () => {
    setLiveSessionActive(false);
    await stopStream();
  });
  ipcMain.handle('stream-status', () => getStreamStatus());

  ipcMain.handle('chat-connect', async (_event, config) => {
    return connectChat(config);
  });

  ipcMain.handle('chat-disconnect', async () => {
    await disconnectChat();
  });

  ipcMain.handle('chat-get-status', () => getChatStatus());
  ipcMain.handle('chat-get-performance', () => getPerformanceStats());
  ipcMain.handle('chat-clear', () => {
    clearChatMessages();
    resetMobileChatTracking();
  });

  ipcMain.handle('mobile-chat-get-info', () => getMobileChatInfo());
  ipcMain.handle('mobile-chat-restart', () => {
    stopMobileChatServer();
    resetMobileChatTracking();
    return startMobileChatServer();
  });

  ipcMain.handle('mobile-chat-regenerate-token', () => {
    regenerateMobileChatToken();
    return getMobileChatInfo();
  });

  ipcMain.handle('mobile-chat-get-qr-dataurl', (_e, url: string) =>
    generateMobileChatQrDataUrl(url)
  );

  ipcMain.handle('auth-get-accounts', () => getPlatformAccounts());
  ipcMain.handle('auth-oauth-configured', (_e, platform: AuthPlatform) =>
    isOAuthConfigured(platform)
  );
  ipcMain.handle('auth-connect', async (_e, platform: AuthPlatform) => {
    try {
      return await connectPlatform(platform);
    } catch (err) {
      return {
        platform,
        connected: false,
        error: err instanceof Error ? err.message : 'Erro ao conectar',
      };
    }
  });
  ipcMain.handle('auth-disconnect', async (_e, platform: AuthPlatform) => {
    await disconnectPlatform(platform);
  });
  ipcMain.handle('auth-refresh-key', async (_e, platform: AuthPlatform) => {
    try {
      return await refreshPlatformStreamKey(platform);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Erro ao atualizar stream key');
    }
  });
  ipcMain.handle(
    'auth-save-manual-key',
    (_e, platform: AuthPlatform, streamKey: string) => {
      saveManualStreamKey(platform, streamKey);
    }
  );

  registerExtendedIpcHandlers(broadcastToAllRenderers);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  installCrashHandlers();
  logInfo('Velora iniciando', { packaged: app.isPackaged, version: app.getVersion() });

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'mediaKeySystem');
  });

  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    if (request.hostname === '127.0.0.1' || request.hostname === 'localhost') {
      callback(0);
      return;
    }
    callback(-3);
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'self' http://127.0.0.1:* http://192.168.*:* ws://127.0.0.1:*; img-src 'self' data: http://192.168.*:* http://127.0.0.1:*;",
        ],
      },
    });
  });

  setupIpc();

  setChatListeners({
    onMessages: (msgs) => {
      chatMessagesCache = msgs;
      broadcastToAllRenderers('chat-update', msgs);
      handleMobileChatMessages(msgs);
    },
    onStatus: (status) => {
      broadcastToAllRenderers('chat-status', status);
      handleMobileChatStatus(status);
    },
    onPerformance: (stats) => {
      broadcastToAllRenderers('live-performance', stats);
      handleMobileChatPerformance(stats);
    },
  });

  setChatFilters(loadChatFilters({ blockedWords: [], followersOnly: false }));
  createMainWindow();

  if (process.argv.includes('--smoke-test') || process.env.VELORA_SMOKE === '1') {
    mainWindow?.once('ready-to-show', () => {
      logInfo('Smoke test OK — encerrando');
      setTimeout(() => app.quit(), 1200);
    });
    return;
  }

  // Serviços em background — não bloqueiam a janela
  setImmediate(() => {
    startMobileChatServer();
    startAlertsServer();
  });
  setTimeout(() => {
    initAutoUpdater().catch(() => undefined);
    startOAuthRefreshTimer();
  }, 15_000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let isQuitting = false;

app.on('before-quit', (e) => {
  if (isQuitting) return;
  const status = getStreamStatus();
  if (status.running) {
    e.preventDefault();
    isQuitting = true;
    const forceQuitTimer = setTimeout(() => {
      logWarn('before-quit timeout (8s) — encerrando LIVE à força');
      stopMobileChatServer();
      app.exit(0);
    }, 8_000);
    void stopStream()
      .then(() => {
        setLiveSessionActive(false);
        return disconnectChat();
      })
      .then(() => {
        clearTimeout(forceQuitTimer);
        stopMobileChatServer();
        app.quit();
      })
      .catch((err) => {
        logError('Erro ao encerrar LIVE no quit', { error: String(err) });
        clearTimeout(forceQuitTimer);
        stopMobileChatServer();
        app.exit(1);
      });
    return;
  }
  stopMobileChatServer();
});
