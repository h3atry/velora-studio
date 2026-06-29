import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/** Credenciais OAuth do app Velora (como OBS embute as deles). Usuário final não mexe em .env. */
interface BakedOAuthFile {
  twitch?: { clientId: string; clientSecret: string };
  tiktok?: { clientKey: string; clientSecret: string };
}

let bakedCache: BakedOAuthFile | null | undefined;

function loadBakedFile(): BakedOAuthFile {
  if (bakedCache !== undefined) return bakedCache ?? {};

  const candidates = [
    path.join(process.resourcesPath, 'oauth-credentials.json'),
    path.join(app.getAppPath(), 'oauth-credentials.json'),
    path.join(process.cwd(), 'oauth-credentials.json'),
    path.join(path.dirname(process.execPath), 'oauth-credentials.json'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        bakedCache = JSON.parse(fs.readFileSync(file, 'utf-8')) as BakedOAuthFile;
        return bakedCache;
      }
    } catch {
      /* próximo candidato */
    }
  }

  bakedCache = {};
  return {};
}

export function getTwitchOAuthCredentials(): { clientId: string; clientSecret: string } | null {
  const baked = loadBakedFile();
  const clientId = baked.twitch?.clientId?.trim() || process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret =
    baked.twitch?.clientSecret?.trim() || process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getTikTokOAuthCredentials(): { clientKey: string; clientSecret: string } | null {
  const baked = loadBakedFile();
  const clientKey = baked.tiktok?.clientKey?.trim() || process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret =
    baked.tiktok?.clientSecret?.trim() || process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) return null;
  return { clientKey, clientSecret };
}

export function isTwitchOAuthAvailable(): boolean {
  return getTwitchOAuthCredentials() !== null;
}

export function isTikTokOAuthAvailable(): boolean {
  return getTikTokOAuthCredentials() !== null;
}
