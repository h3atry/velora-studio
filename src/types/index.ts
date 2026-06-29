export type Platform = 'tiktok' | 'twitch';

export type PreviewMode = 'portrait' | 'landscape' | 'dual';

export type ChatWindowMode = 'docked' | 'popout' | 'overlay';

export type ChatBadge = 'prime' | 'fan' | 'mod' | 'follower' | 'vip' | 'sub';

export interface ChatMessage {
  id: string;
  platform: Platform;
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
  badges: ChatBadge[];
  nameColor?: string;
}

export type PlatformConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatConnectionStatus {
  twitch: PlatformConnectionState;
  tiktok: PlatformConnectionState;
  twitchError?: string;
  tiktokError?: string;
}

export interface LivePerformanceStats {
  tiktokViewers: number;
  twitchViewers: number;
  tiktokLikes: number;
  tiktokDiamonds: number;
}

export interface VideoSettings {
  resolution: string;
  fps: number;
  videoBitrate: number;
  audioBitrate: number;
}

export interface LiveInfo {
  title: string;
  category: string;
  game: string;
  gameId: string;
  topic: string;
  hashtags: string;
  language: string;
  aboutMe: string;
  followerGoal: number;
  followerCurrent: number;
  videoSettings: VideoSettings;
}

export interface Moderator {
  id: string;
  displayName: string;
  handle: string;
}

export interface StreamStats {
  cpu: number;
  memory: number;
  uploadKbps: number;
  fps: number;
  droppedFrames: number;
  totalFrames: number;
  bitrateWarning?: string | null;
}

export interface StreamDestination {
  platform: Platform;
  enabled: boolean;
  rtmpUrl: string;
  streamKey: string;
}

export interface StreamSettings {
  cameraLabel: string;
  cameraDeviceId: string;
  audioLabel: string;
  bitrateKbps: number;
  fps: number;
  twitchChannel: string;
  tiktokUsername: string;
  recordLocal: boolean;
  desktopAudio: boolean;
  destinations: StreamDestination[];
}

export interface PlatformAccountStatus {
  platform: Platform;
  connected: boolean;
  username?: string;
  displayName?: string;
  hasStreamKey: boolean;
  rtmpUrl?: string;
  streamKeyPreview?: string;
  error?: string;
}

export interface PlatformConnectionResult {
  platform: Platform;
  connected: boolean;
  profile?: { platform: Platform; userId: string; username: string; displayName: string };
  rtmpUrl?: string;
  streamKey?: string;
  error?: string;
  needsManualStreamKey?: boolean;
  message?: string;
}

export interface MediaDeviceInfo {
  label: string;
  deviceId: string;
  kind: 'video' | 'audio';
  ffmpegName: string;
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      chatOpenPopout: () => Promise<void>;
      chatOpenOverlay: () => Promise<void>;
      chatCloseExternal: (mode: 'popout' | 'overlay') => Promise<void>;
      chatReturnToDocked: () => Promise<void>;
      chatPopoutTogglePin?: () => Promise<{ pinned: boolean }>;
      chatPopoutIsPinned?: () => Promise<{ pinned: boolean }>;
      onChatModeChanged: (callback: (mode: ChatWindowMode) => void) => () => void;
      onChatWindowClosed: (callback: (mode: ChatWindowMode) => void) => () => void;
      broadcastChat: (payload: unknown) => void;
      getChatMessages: () => Promise<unknown[]>;
      listMediaDevices: () => Promise<MediaDeviceInfo[]>;
      streamStart: (config: unknown) => Promise<{
        running: boolean;
        error?: string;
        recordingPath?: string;
      }>;
      streamStop: () => Promise<void>;
      streamStatus: () => Promise<{
        running: boolean;
        uploadKbps: number;
        fps: number;
        droppedFrames: number;
        totalFrames?: number;
        error?: string;
        bitrateWarning?: string;
        recordingPath?: string;
      }>;
      chatConnect: (config: {
        twitchChannel?: string;
        tiktokUsername?: string;
      }) => Promise<ChatConnectionStatus>;
      chatDisconnect: () => Promise<void>;
      chatGetStatus: () => Promise<ChatConnectionStatus>;
      chatGetPerformance: () => Promise<LivePerformanceStats>;
      chatClear: () => Promise<void>;
      authGetAccounts: () => Promise<PlatformAccountStatus[]>;
      authOAuthConfigured: (platform: Platform) => Promise<boolean>;
      authConnect: (platform: Platform) => Promise<PlatformConnectionResult>;
      authDisconnect: (platform: Platform) => Promise<void>;
      authRefreshKey: (platform: Platform) => Promise<{ rtmpUrl: string; streamKey: string }>;
      authSaveManualKey: (platform: Platform, streamKey: string) => Promise<void>;
      onChatStatus: (callback: (status: ChatConnectionStatus) => void) => () => void;
      onLivePerformance: (callback: (stats: LivePerformanceStats) => void) => () => void;
      onChatUpdate: (callback: (payload: unknown) => void) => () => void;
      mobileChatGetInfo: () => Promise<{
        running: boolean;
        port: number;
        ip: string;
        url: string;
        clientCount: number;
        token: string;
        bindError?: string | null;
      }>;
      mobileChatGetQrDataUrl?: (url: string) => Promise<string>;
      mobileChatRestart: () => Promise<{
        running: boolean;
        port: number;
        ip: string;
        url: string;
        clientCount: number;
        token: string;
        bindError?: string | null;
      }>;
      mobileChatRegenerateToken?: () => Promise<{
        running: boolean;
        port: number;
        ip: string;
        url: string;
        clientCount: number;
        token: string;
        bindError?: string | null;
      }>;
      gdprExport?: () => Promise<{ ok: boolean; path?: string; error?: string }>;
      gdprDelete?: () => Promise<{ ok: boolean; error?: string }>;
      dialogOpenImage?: () => Promise<string | null>;
      streamTest?: (config: unknown) => Promise<{ ok: boolean; error?: string }>;
      streamPresets?: () => Promise<unknown>;
      ffmpegAvailable?: () => Promise<boolean>;
      systemStats?: () => Promise<{ cpu: number; memory: number }>;
      diagnostics?: () => Promise<Record<string, unknown>>;
      openLogsFolder?: () => Promise<void>;
      persistLoadApp?: () => Promise<unknown>;
      persistSaveApp?: (data: unknown) => Promise<void>;
      persistLoadScenes?: () => Promise<{ scenes: unknown[]; activeId: string }>;
      persistSaveScenes?: (data: unknown) => Promise<void>;
      persistLoadSettings?: () => Promise<Record<string, unknown>>;
      persistSaveSettings?: (data: unknown) => Promise<void>;
      persistExportConfig?: () => Promise<{ ok: boolean; path?: string }>;
      persistImportConfig?: () => Promise<{ ok: boolean; path?: string }>;
      authSyncStreamSettings?: () => Promise<{
        twitchChannel?: string;
        tiktokUsername?: string;
        destinations?: { platform: Platform; streamKey: string; rtmpUrl: string }[];
      }>;
      chatFiltersGet?: () => Promise<{ blockedWords: string[]; followersOnly: boolean }>;
      chatFiltersSet?: (filters: { blockedWords: string[]; followersOnly: boolean }) => Promise<void>;
      chatExport?: (format: 'json' | 'txt') => Promise<string>;
      chatSend?: (platform: Platform, message: string) => Promise<{ ok: boolean; error?: string }>;
      twitchViewers?: (channel: string) => Promise<number>;
      twitchSearchCategories?: (q: string) => Promise<{ id: string; name: string }[]>;
      twitchUpdateInfo?: (title: string, gameId: string) => Promise<boolean>;
      onAlertReceived?: (callback: (alert: unknown) => void) => () => void;
    };
  }
}
