export type AuthPlatform = 'twitch' | 'tiktok';

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export interface PlatformProfile {
  platform: AuthPlatform;
  userId: string;
  username: string;
  displayName: string;
}

export interface PlatformConnectionResult {
  platform: AuthPlatform;
  connected: boolean;
  profile?: PlatformProfile;
  rtmpUrl?: string;
  streamKey?: string;
  error?: string;
  needsManualStreamKey?: boolean;
  message?: string;
}

export interface PlatformAccountStatus {
  platform: AuthPlatform;
  connected: boolean;
  username?: string;
  displayName?: string;
  hasStreamKey: boolean;
  rtmpUrl?: string;
  streamKeyPreview?: string;
  error?: string;
}
