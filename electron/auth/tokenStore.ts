import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import type { AuthPlatform, StoredTokens } from '../auth/types';
import { logWarn } from '../crashLogger';

const FILE = 'platform-auth.json';

interface AuthFile {
  twitch?: StoredTokens & { userId?: string; username?: string; displayName?: string };
  tiktok?: StoredTokens & { userId?: string; username?: string; displayName?: string };
  twitchStreamKey?: string;
  tiktokStreamKey?: string;
  encrypted?: boolean;
}

let cache: AuthFile = {};

function filePath(): string {
  return path.join(app.getPath('userData'), FILE);
}

function encrypt(text: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(text).toString('base64');
  }
  return Buffer.from(text).toString('base64');
}

function decrypt(text: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(text, 'base64'));
  }
  return Buffer.from(text, 'base64').toString('utf-8');
}

export function loadAuthStore(): AuthFile {
  try {
    const raw = fs.readFileSync(filePath(), 'utf-8');
    const parsed = JSON.parse(raw) as AuthFile;
    if (parsed.encrypted && parsed.twitchStreamKey) {
      parsed.twitchStreamKey = decrypt(parsed.twitchStreamKey);
    }
    if (parsed.encrypted && parsed.tiktokStreamKey) {
      parsed.tiktokStreamKey = decrypt(parsed.tiktokStreamKey);
    }
    cache = parsed;
  } catch (err) {
    logWarn('platform-auth.json corrupto ou ausente — reset', {
      message: err instanceof Error ? err.message : String(err),
    });
    cache = {};
  }
  return cache;
}

export function isSafeStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function saveAuthStore(data: AuthFile): void {
  cache = { ...data };
  const toSave: AuthFile = { ...data, encrypted: safeStorage.isEncryptionAvailable() };
  if (toSave.twitchStreamKey) {
    toSave.twitchStreamKey = encrypt(toSave.twitchStreamKey);
  }
  if (toSave.tiktokStreamKey) {
    toSave.tiktokStreamKey = encrypt(toSave.tiktokStreamKey);
  }
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(toSave, null, 2), 'utf-8');
}

export function getTokens(platform: AuthPlatform): AuthFile[typeof platform] | undefined {
  if (!cache.twitch && !cache.tiktok) loadAuthStore();
  return platform === 'twitch' ? cache.twitch : cache.tiktok;
}

export function setPlatformAuth(
  platform: AuthPlatform,
  tokens: StoredTokens,
  profile: { userId: string; username: string; displayName: string }
): void {
  loadAuthStore();
  const entry = { ...tokens, ...profile };
  if (platform === 'twitch') cache.twitch = entry;
  else cache.tiktok = entry;
  saveAuthStore(cache);
}

export function setStreamKey(platform: AuthPlatform, streamKey: string): void {
  loadAuthStore();
  if (platform === 'twitch') cache.twitchStreamKey = streamKey;
  else cache.tiktokStreamKey = streamKey;
  saveAuthStore(cache);
}

export function getStreamKey(platform: AuthPlatform): string | undefined {
  loadAuthStore();
  return platform === 'twitch' ? cache.twitchStreamKey : cache.tiktokStreamKey;
}

export function clearPlatform(platform: AuthPlatform): void {
  loadAuthStore();
  if (platform === 'twitch') {
    delete cache.twitch;
    delete cache.twitchStreamKey;
  } else {
    delete cache.tiktok;
    delete cache.tiktokStreamKey;
  }
  saveAuthStore(cache);
}

export function getFullStore(): AuthFile {
  loadAuthStore();
  return { ...cache };
}
