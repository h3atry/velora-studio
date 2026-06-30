import { ipcMain } from 'electron';
import {
  testStream,
  getPlatformPresets,
  isFfmpegAvailable,
  stopStream,
} from '../streamService';
import {
  setChatFilters,
  getChatFilters,
  sendChatMessage,
} from '../chatService';
import { getSystemStats } from '../services/systemStats';
import {
  loadAppState,
  saveAppState,
  loadScenes,
  saveScenes,
  loadChatFilters,
  saveChatFilters,
  loadSettings,
  saveSettings,
  exportUserConfig,
  importUserConfig,
} from '../services/persistStore';
import { exportChatLog } from '../services/chatExport';
import {
  fetchTwitchViewerCount,
  searchTwitchCategories,
  updateTwitchStreamInfo,
} from '../services/twitchHelix';
import { startAlertsServer, onAlert, getAlertsPort } from '../services/alertsServer';
import { getRelayStatus, startRelayServer } from '../services/relayServer';
import { getLogFilePath } from '../crashLogger';
import { syncOAuthToStreamSettings, isOAuthConfigured } from '../auth/platformAuthService';
import { app, shell, dialog } from 'electron';
import path from 'path';
import { disconnectChat, setLiveSessionActive } from '../chatService';
import { redactObject } from '../utils/logRedact';
import { validateChatSend } from './validatePayload';
import { exportUserDataZip, wipeUserData } from '../services/gdpr';

type BroadcastFn = (channel: string, payload: unknown) => void;

export function registerExtendedIpcHandlers(broadcast: BroadcastFn) {
  ipcMain.handle('system-stats', () => getSystemStats());
  ipcMain.handle('ffmpeg-available', () => isFfmpegAvailable());
  ipcMain.handle('stream-presets', () => getPlatformPresets());
  ipcMain.handle('stream-test', (_e, config) => testStream(config));

  ipcMain.handle('persist-load-app', () =>
    loadAppState({
      liveInfo: null,
      moderators: [],
      onboardingDone: false,
    })
  );
  ipcMain.handle('persist-save-app', (_e, data) => saveAppState(data));
  ipcMain.handle('persist-load-scenes', () =>
    loadScenes({ scenes: [{ id: 'default', name: 'Cena principal', sources: [] }], activeId: 'default' })
  );
  ipcMain.handle('persist-save-scenes', (_e, data) => saveScenes(data));
  ipcMain.handle('persist-load-settings', () =>
    loadSettings({
      previewOffDuringLive: false,
      chatSound: false,
      theme: 'dark',
      locale: 'pt-BR',
    })
  );
  ipcMain.handle('persist-save-settings', (_e, data) => saveSettings(data));

  ipcMain.handle('dialog-open-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog-open-video', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Vídeo', extensions: ['mp4', 'mov', 'webm', 'mkv'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('capture-list-sources', async () => {
    const { listCaptureSources } = await import('../services/captureSources');
    return listCaptureSources();
  });

  ipcMain.handle('chat-filters-get', () => {
    const stored = loadChatFilters({ blockedWords: [], followersOnly: false });
    setChatFilters(stored);
    return getChatFilters();
  });
  ipcMain.handle('chat-filters-set', (_e, filters) => {
    saveChatFilters(filters);
    setChatFilters(filters);
  });
  ipcMain.handle('chat-export', (_e, format: 'json' | 'txt') => {
    const file = exportChatLog(format);
    void shell.showItemInFolder(file);
    return file;
  });
  ipcMain.handle('chat-send', (_e, platform: 'twitch' | 'tiktok', message: string) => {
    const validated = validateChatSend(platform, message);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    return sendChatMessage(validated.value.platform, validated.value.message);
  });

  ipcMain.handle('twitch-viewers', (_e, channel: string) => fetchTwitchViewerCount(channel));
  ipcMain.handle('twitch-search-categories', (_e, q: string) => searchTwitchCategories(q));
  ipcMain.handle('twitch-update-info', (_e, title: string, gameId: string) =>
    updateTwitchStreamInfo(title, gameId)
  );

  ipcMain.handle('auth-sync-stream-settings', () =>
    syncOAuthToStreamSettings({ respectManualKeys: true })
  );

  ipcMain.handle('persist-export-config', () => {
    const file = exportUserConfig();
    void shell.showItemInFolder(file);
    return { ok: true, path: file };
  });

  ipcMain.handle('persist-import-config', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importar configuração Velora',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return { ok: false };
    importUserConfig(filePaths[0]);
    return { ok: true, path: filePaths[0] };
  });

  ipcMain.handle('diagnostics', () =>
    redactObject({
      version: app.getVersion(),
      packaged: app.isPackaged,
      userData: app.getPath('userData'),
      logFile: getLogFilePath(),
      ffmpeg: isFfmpegAvailable(),
      alertsPort: getAlertsPort(),
      relay: getRelayStatus(),
      oauthConfigured: {
        twitch: isOAuthConfigured('twitch'),
        tiktok: isOAuthConfigured('tiktok'),
      },
    })
  );

  ipcMain.handle('open-logs-folder', () => {
    void shell.openPath(path.dirname(getLogFilePath()));
  });

  ipcMain.handle('alerts-start', () => {
    startAlertsServer();
    return getAlertsPort();
  });

  ipcMain.handle('relay-status', () => getRelayStatus());
  ipcMain.handle('relay-start', () => startRelayServer());

  onAlert((alert) => broadcast('alert-received', alert));

  ipcMain.handle('graceful-shutdown-live', async () => {
    setLiveSessionActive(false);
    await stopStream();
    await disconnectChat();
  });

  ipcMain.handle('gdpr-export', async () => {
    const result = await exportUserDataZip();
    if (result.ok) {
      void shell.showItemInFolder(result.path);
    }
    return result;
  });

  ipcMain.handle('gdpr-delete', () => wipeUserData());
}
