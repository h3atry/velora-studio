import crypto from 'crypto';
import type { PlatformConnectionResult } from './types';
import { openOAuthUrl, waitForOAuthCallback } from './oauthServer';
import { getTikTokOAuthCredentials } from './oauthConfig';
import { setPlatformAuth } from './tokenStore';

const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER = 'https://open.tiktokapis.com/v2/user/info/';
const REDIRECT_URI = 'https://127.0.0.1:17564/callback/tiktok';
const SCOPES = ['user.info.basic'].join(',');

function getClientKey(): string {
  const creds = getTikTokOAuthCredentials();
  if (!creds) {
    throw new Error(
      'OAuth TikTok não configurado no app. Registre o Velora em developers.tiktok.com e inclua oauth-credentials.json no build.'
    );
  }
  return creds.clientKey;
}

function getClientSecret(): string {
  const creds = getTikTokOAuthCredentials();
  if (!creds) throw new Error('Credenciais TikTok ausentes');
  return creds.clientSecret;
}

async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_key: getClientKey(),
    client_secret: getClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(TIKTOK_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || json.error) {
    throw new Error(json.error_description ?? json.error ?? 'Erro token TikTok');
  }

  return json;
}

async function fetchUserInfo(accessToken: string) {
  const url = new URL(TIKTOK_USER);
  url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name,username');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = (await res.json()) as {
    data?: { user?: { username?: string; display_name?: string; open_id?: string } };
    error?: { message?: string };
  };

  if (json.error) throw new Error(json.error.message ?? 'Erro ao buscar perfil TikTok');

  const user = json.data?.user;
  if (!user?.username) throw new Error('Username TikTok não retornado pela API');

  return user;
}

export async function connectTikTok(): Promise<PlatformConnectionResult> {
  const state = crypto.randomBytes(16).toString('hex');
  const callbackPromise = waitForOAuthCallback(17564, '/callback/tiktok');

  const authUrl = new URL(TIKTOK_AUTH);
  authUrl.searchParams.set('client_key', getClientKey());
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);

  await openOAuthUrl(authUrl.toString(), 'Entrar — TikTok');

  const { code, state: returnedState } = await callbackPromise;
  if (returnedState !== state) throw new Error('State OAuth inválido');

  const tokenData = await exchangeCode(code);
  const user = await fetchUserInfo(tokenData.access_token!);

  setPlatformAuth(
    'tiktok',
    {
      accessToken: tokenData.access_token!,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in ?? 86400) * 1000,
    },
    {
      userId: user.open_id ?? user.username!,
      username: user.username!,
      displayName: user.display_name ?? user.username!,
    }
  );

  return {
    platform: 'tiktok',
    connected: true,
    profile: {
      platform: 'tiktok',
      userId: user.open_id ?? user.username!,
      username: user.username!,
      displayName: user.display_name ?? user.username!,
    },
    rtmpUrl: 'rtmp://push-rtmp-global.tiktoklive.com/live',
    needsManualStreamKey: true,
    message:
      'Conta conectada. A TikTok ainda não libera stream key via API pública — copie do TikTok LIVE Studio e cole abaixo, ou conecte quando a API Live estiver aprovada.',
  };
}
