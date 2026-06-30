import { contextBridge, ipcRenderer } from 'electron';

export type ChatWindowMode = 'docked' | 'popout' | 'overlay';

const electronAPI = {
  platform: process.platform,
  isElectron: true,

  chatOpenPopout: () => ipcRenderer.invoke('chat-open-popout'),
  chatOpenOverlay: () => ipcRenderer.invoke('chat-open-overlay'),
  chatCloseExternal: (mode: 'popout' | 'overlay') =>
    ipcRenderer.invoke('chat-close-external', mode),
  chatReturnToDocked: () => ipcRenderer.invoke('chat-return-to-docked'),
  chatPopoutTogglePin: () =>
    ipcRenderer.invoke('chat-popout-toggle-pin') as Promise<{ pinned: boolean }>,
  chatPopoutIsPinned: () =>
    ipcRenderer.invoke('chat-popout-is-pinned') as Promise<{ pinned: boolean }>,

  onChatModeChanged: (callback: (mode: ChatWindowMode) => void) => {
    const handler = (_: Electron.IpcRendererEvent, mode: ChatWindowMode) => callback(mode);
    ipcRenderer.on('chat-mode-changed', handler);
    return () => ipcRenderer.removeListener('chat-mode-changed', handler);
  },

  onChatWindowClosed: (callback: (mode: ChatWindowMode) => void) => {
    const handler = (_: Electron.IpcRendererEvent, mode: ChatWindowMode) => callback(mode);
    ipcRenderer.on('chat-window-closed', handler);
    return () => ipcRenderer.removeListener('chat-window-closed', handler);
  },

  broadcastChat: (payload: unknown) => ipcRenderer.send('chat-broadcast', payload),
  getChatMessages: () => ipcRenderer.invoke('chat-get-messages') as Promise<unknown[]>,

  listMediaDevices: () => ipcRenderer.invoke('media-list-devices'),
  streamStart: (config: unknown) => ipcRenderer.invoke('stream-start', config),
  streamStop: () => ipcRenderer.invoke('stream-stop'),
  streamStatus: () => ipcRenderer.invoke('stream-status'),
  streamTest: (config: unknown) => ipcRenderer.invoke('stream-test', config),
  streamPresets: () => ipcRenderer.invoke('stream-presets'),

  chatConnect: (config: unknown) => ipcRenderer.invoke('chat-connect', config),
  chatDisconnect: () => ipcRenderer.invoke('chat-disconnect'),
  chatGetStatus: () => ipcRenderer.invoke('chat-get-status'),
  chatGetPerformance: () => ipcRenderer.invoke('chat-get-performance'),
  chatClear: () => ipcRenderer.invoke('chat-clear'),
  chatFiltersGet: () => ipcRenderer.invoke('chat-filters-get'),
  chatFiltersSet: (filters: unknown) => ipcRenderer.invoke('chat-filters-set', filters),
  chatExport: (format: 'json' | 'txt') => ipcRenderer.invoke('chat-export', format),
  chatSend: (platform: 'twitch' | 'tiktok', message: string) =>
    ipcRenderer.invoke('chat-send', platform, message),

  authGetAccounts: () => ipcRenderer.invoke('auth-get-accounts'),
  authOAuthConfigured: (platform: 'twitch' | 'tiktok') =>
    ipcRenderer.invoke('auth-oauth-configured', platform),
  authConnect: (platform: 'twitch' | 'tiktok') =>
    ipcRenderer.invoke('auth-connect', platform),
  authDisconnect: (platform: 'twitch' | 'tiktok') =>
    ipcRenderer.invoke('auth-disconnect', platform),
  authRefreshKey: (platform: 'twitch' | 'tiktok') =>
    ipcRenderer.invoke('auth-refresh-key', platform),
  authSaveManualKey: (platform: 'twitch' | 'tiktok', streamKey: string) =>
    ipcRenderer.invoke('auth-save-manual-key', platform, streamKey),
  authSyncStreamSettings: () => ipcRenderer.invoke('auth-sync-stream-settings'),

  onChatStatus: (callback: (status: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('chat-status', handler);
    return () => ipcRenderer.removeListener('chat-status', handler);
  },

  onLivePerformance: (callback: (stats: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, stats: unknown) => callback(stats);
    ipcRenderer.on('live-performance', handler);
    return () => ipcRenderer.removeListener('live-performance', handler);
  },

  onChatUpdate: (callback: (payload: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('chat-update', handler);
    return () => ipcRenderer.removeListener('chat-update', handler);
  },

  onAlertReceived: (callback: (alert: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, alert: unknown) => callback(alert);
    ipcRenderer.on('alert-received', handler);
    return () => ipcRenderer.removeListener('alert-received', handler);
  },

  mobileChatGetInfo: () => ipcRenderer.invoke('mobile-chat-get-info'),
  mobileChatGetQrDataUrl: (url: string) =>
    ipcRenderer.invoke('mobile-chat-get-qr-dataurl', url) as Promise<string>,
  mobileChatRestart: () => ipcRenderer.invoke('mobile-chat-restart'),
  mobileChatRegenerateToken: () =>
    ipcRenderer.invoke('mobile-chat-regenerate-token') as Promise<{
      running: boolean;
      port: number;
      ip: string;
      url: string;
      clientCount: number;
      token: string;
      bindError?: string | null;
    }>,

  dialogOpenImage: () => ipcRenderer.invoke('dialog-open-image') as Promise<string | null>,
  dialogOpenVideo: () => ipcRenderer.invoke('dialog-open-video') as Promise<string | null>,
  captureListSources: () =>
    ipcRenderer.invoke('capture-list-sources') as Promise<
      { id: string; name: string; type: 'screen' | 'window'; thumbnailDataUrl: string }[]
    >,

  gdprExport: () => ipcRenderer.invoke('gdpr-export'),
  gdprDelete: () => ipcRenderer.invoke('gdpr-delete'),

  systemStats: () => ipcRenderer.invoke('system-stats'),
  ffmpegAvailable: () => ipcRenderer.invoke('ffmpeg-available'),
  diagnostics: () => ipcRenderer.invoke('diagnostics'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),

  persistLoadApp: () => ipcRenderer.invoke('persist-load-app'),
  persistSaveApp: (data: unknown) => ipcRenderer.invoke('persist-save-app', data),
  persistLoadScenes: () => ipcRenderer.invoke('persist-load-scenes'),
  persistSaveScenes: (data: unknown) => ipcRenderer.invoke('persist-save-scenes', data),
  persistLoadSettings: () => ipcRenderer.invoke('persist-load-settings'),
  persistSaveSettings: (data: unknown) => ipcRenderer.invoke('persist-save-settings', data),
  persistExportConfig: () => ipcRenderer.invoke('persist-export-config'),
  persistImportConfig: () => ipcRenderer.invoke('persist-import-config'),

  twitchViewers: (channel: string) => ipcRenderer.invoke('twitch-viewers', channel),
  twitchSearchCategories: (q: string) => ipcRenderer.invoke('twitch-search-categories', q),
  twitchUpdateInfo: (title: string, gameId: string) =>
    ipcRenderer.invoke('twitch-update-info', title, gameId),

  alertsStart: () => ipcRenderer.invoke('alerts-start'),
  relayStatus: () => ipcRenderer.invoke('relay-status'),
  gracefulShutdownLive: () => ipcRenderer.invoke('graceful-shutdown-live'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
