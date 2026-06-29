export type ChatBadge = 'prime' | 'fan' | 'mod' | 'follower' | 'vip' | 'sub';

export interface UnifiedChatMessage {
  id: string;
  platform: 'tiktok' | 'twitch';
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
  badges: ChatBadge[];
  nameColor?: string;
}

export interface ChatConnectConfig {
  twitchChannel?: string;
  tiktokUsername?: string;
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
