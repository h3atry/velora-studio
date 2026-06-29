import type { AuthPlatform, PlatformAccountStatus, PlatformConnectionResult } from './types';
import { clearPlatform, getFullStore, getStreamKey, getTokens, setStreamKey } from './tokenStore';
import { connectTwitch, fetchTwitchStreamKey, getValidAccessToken } from './twitchAuth';
import { connectTikTok } from './tiktokAuth';
import { isTikTokOAuthAvailable, isTwitchOAuthAvailable } from './oauthConfig';
import { loadSettings, saveSettings } from '../services/persistStore';

const TWITCH_RTMP = 'rtmp://live.twitch.tv/app';
const TIKTOK_RTMP = 'rtmp://push-rtmp-global.tiktoklive.com/live';

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function getPlatformAccounts(): PlatformAccountStatus[] {
  const store = getFullStore();

  const platforms: AuthPlatform[] = ['tiktok', 'twitch'];
  return platforms.map((platform) => {
    const auth = platform === 'twitch' ? store.twitch : store.tiktok;
    const streamKey =
      platform === 'twitch' ? store.twitchStreamKey : store.tiktokStreamKey;

    if (!auth?.accessToken) {
      return { platform, connected: false, hasStreamKey: false };
    }

    return {
      platform,
      connected: true,
      username: auth.username,
      displayName: auth.displayName,
      hasStreamKey: Boolean(streamKey),
      rtmpUrl: platform === 'twitch' ? TWITCH_RTMP : TIKTOK_RTMP,
      streamKeyPreview: streamKey ? maskKey(streamKey) : undefined,
    };
  });
}

export async function connectPlatform(
  platform: AuthPlatform
): Promise<PlatformConnectionResult> {
  if (platform === 'twitch') return connectTwitch();
  return connectTikTok();
}

export async function disconnectPlatform(platform: AuthPlatform): Promise<void> {
  clearPlatform(platform);
  const settings = loadSettings({ manualStreamKeys: {} });
  const manualStreamKeys = { ...(settings.manualStreamKeys as Record<string, boolean> | undefined) };
  delete manualStreamKeys[platform];
  saveSettings({ ...settings, manualStreamKeys });
}

export async function refreshPlatformStreamKey(
  platform: AuthPlatform
): Promise<{ rtmpUrl: string; streamKey: string }> {
  if (platform === 'twitch') return fetchTwitchStreamKey();

  const stored = getTokens('tiktok');
  if (!stored) throw new Error('TikTok não conectado');

  const manual = getStreamKey('tiktok');
  if (manual) return { rtmpUrl: TIKTOK_RTMP, streamKey: manual };

  throw new Error(
    'TikTok não expõe stream key via API. Cole a key do LIVE Studio manualmente.'
  );
}

export function saveManualStreamKey(platform: AuthPlatform, streamKey: string): void {
  setStreamKey(platform, streamKey.trim());
  const settings = loadSettings({ manualStreamKeys: {} });
  const manualStreamKeys = {
    ...(settings.manualStreamKeys as Record<string, boolean> | undefined),
    [platform]: true,
  };
  saveSettings({ ...settings, manualStreamKeys });
}

export function getCredentialsForStream(): {
  twitch?: { rtmpUrl: string; streamKey: string; username: string };
  tiktok?: { rtmpUrl: string; streamKey: string; username: string };
} {
  const store = getFullStore();
  const result: ReturnType<typeof getCredentialsForStream> = {};

  if (store.twitch?.username && store.twitchStreamKey) {
    result.twitch = {
      rtmpUrl: TWITCH_RTMP,
      streamKey: store.twitchStreamKey,
      username: store.twitch.username,
    };
  }

  if (store.tiktok?.username && store.tiktokStreamKey) {
    result.tiktok = {
      rtmpUrl: TIKTOK_RTMP,
      streamKey: store.tiktokStreamKey,
      username: store.tiktok.username,
    };
  }

  return result;
}

export function isOAuthConfigured(platform: AuthPlatform): boolean {
  if (platform === 'twitch') return isTwitchOAuthAvailable();
  return isTikTokOAuthAvailable();
}

export function syncOAuthToStreamSettings(options?: { respectManualKeys?: boolean }): {
  twitchChannel?: string;
  tiktokUsername?: string;
  destinations?: { platform: AuthPlatform; streamKey: string; rtmpUrl: string }[];
} {
  const store = getFullStore();
  const settings = loadSettings({ manualStreamKeys: {} });
  const manualKeys = (settings.manualStreamKeys ?? {}) as Partial<Record<AuthPlatform, boolean>>;
  const result: ReturnType<typeof syncOAuthToStreamSettings> = {};

  if (store.twitch?.username) {
    result.twitchChannel = store.twitch.username;
  }
  if (store.tiktok?.username) {
    result.tiktokUsername = store.tiktok.username;
  }

  const destinations: NonNullable<typeof result.destinations> = [];
  if (
    store.twitchStreamKey &&
    !(options?.respectManualKeys && manualKeys.twitch)
  ) {
    destinations.push({
      platform: 'twitch',
      streamKey: store.twitchStreamKey,
      rtmpUrl: TWITCH_RTMP,
    });
  }
  if (
    store.tiktokStreamKey &&
    !(options?.respectManualKeys && manualKeys.tiktok)
  ) {
    destinations.push({
      platform: 'tiktok',
      streamKey: store.tiktokStreamKey,
      rtmpUrl: TIKTOK_RTMP,
    });
  }
  if (destinations.length) result.destinations = destinations;

  return result;
}

export function startOAuthRefreshTimer(): void {
  const tick = async () => {
    try {
      await getValidAccessToken();
    } catch {
      /* não conectado */
    }
  };
  void tick();
  setInterval(() => void tick(), 30 * 60 * 1000);
}
