import crypto from 'crypto';
import type { PlatformConnectionResult } from './types';
import { openOAuthUrl, waitForOAuthCallback } from './oauthServer';
import { getTwitchOAuthCredentials } from './oauthConfig';
import { getTokens, setPlatformAuth, setStreamKey } from './tokenStore';

const TWITCH_AUTH = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API = 'https://api.twitch.tv/helix';
const REDIRECT_URI = 'https://127.0.0.1:17563/callback/twitch';
const SCOPES = ['channel:read:stream_key', 'user:read:email'].join(' ');

function getClientId(): string {
  const creds = getTwitchOAuthCredentials();
  if (!creds) {
    throw new Error(
      'OAuth Twitch não configurado no app. O mantenedor deve registrar o Velora em dev.twitch.tv e incluir oauth-credentials.json no build.'
    );
  }
  return creds.clientId;
}

function getClientSecret(): string {
  const creds = getTwitchOAuthCredentials();
  if (!creds) throw new Error('Credenciais Twitch ausentes');
  return creds.clientSecret;
}

async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(TWITCH_TOKEN, { method: 'POST', body });
  if (!res.ok) throw new Error(`Twitch token: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string[];
  }>;
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(TWITCH_TOKEN, { method: 'POST', body });
  if (!res.ok) throw new Error('Falha ao renovar token Twitch');
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function getValidAccessToken(): Promise<string> {
  const stored = getTokens('twitch');
  if (!stored?.accessToken) throw new Error('Twitch não conectado');

  if (stored.expiresAt > Date.now() + 60_000) return stored.accessToken;

  if (!stored.refreshToken) throw new Error('Token Twitch expirado — reconecte a conta');

  const data = await refreshAccessToken(stored.refreshToken);
  setPlatformAuth(
    'twitch',
    {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? stored.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    },
    {
      userId: stored.userId ?? '',
      username: stored.username ?? '',
      displayName: stored.displayName ?? '',
    }
  );
  return data.access_token;
}

async function twitchApi(path: string, accessToken: string) {
  const res = await fetch(`${TWITCH_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': getClientId(),
    },
  });
  if (!res.ok) throw new Error(`Twitch API: ${await res.text()}`);
  return res.json();
}

export async function connectTwitch(): Promise<PlatformConnectionResult> {
  const state = crypto.randomBytes(16).toString('hex');
  const callbackPromise = waitForOAuthCallback(17563, '/callback/twitch');

  const authUrl = new URL(TWITCH_AUTH);
  authUrl.searchParams.set('client_id', getClientId());
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);

  await openOAuthUrl(authUrl.toString(), 'Entrar — Twitch');

  const { code, state: returnedState } = await callbackPromise;
  if (returnedState !== state) throw new Error('State OAuth inválido');

  const tokenData = await exchangeCode(code);

  const users = (await twitchApi('/users', tokenData.access_token)) as {
    data: { id: string; login: string; display_name: string }[];
  };
  const user = users.data[0];
  if (!user) throw new Error('Usuário Twitch não encontrado');

  setPlatformAuth(
    'twitch',
    {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      scope: tokenData.scope.join(' '),
    },
    { userId: user.id, username: user.login, displayName: user.display_name }
  );

  const keyData = (await twitchApi(
    `/streams/key?broadcaster_id=${user.id}`,
    tokenData.access_token
  )) as { data: { stream_key: string }[] };

  const streamKey = keyData.data[0]?.stream_key;
  if (!streamKey) throw new Error('Não foi possível obter a stream key da Twitch');

  setStreamKey('twitch', streamKey);

  return {
    platform: 'twitch',
    connected: true,
    profile: {
      platform: 'twitch',
      userId: user.id,
      username: user.login,
      displayName: user.display_name,
    },
    rtmpUrl: 'rtmp://live.twitch.tv/app',
    streamKey,
  };
}

export async function fetchTwitchStreamKey(): Promise<{ rtmpUrl: string; streamKey: string }> {
  const token = await getValidAccessToken();
  const stored = getTokens('twitch');
  if (!stored?.userId) throw new Error('Perfil Twitch ausente');

  const keyData = (await twitchApi(
    `/streams/key?broadcaster_id=${stored.userId}`,
    token
  )) as { data: { stream_key: string }[] };

  const streamKey = keyData.data[0]?.stream_key;
  if (!streamKey) throw new Error('Stream key não disponível');

  setStreamKey('twitch', streamKey);
  return { rtmpUrl: 'rtmp://live.twitch.tv/app', streamKey };
}
