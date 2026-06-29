import type {
  ChatBadge,
  ChatConnectConfig,
  ChatConnectionStatus,
  LivePerformanceStats,
  UnifiedChatMessage,
} from './chatTypes';
import { dedupeMessages, messageMatchesBlocked } from './chatFilterUtils';
import { getTokens } from './auth/tokenStore';
import { getValidAccessToken } from './auth/twitchAuth';

const MAX_MESSAGES = 500;

let messages: UnifiedChatMessage[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twitchClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tiktokConnection: any = null;

let connectionStatus: ChatConnectionStatus = {
  twitch: 'disconnected',
  tiktok: 'disconnected',
};

let performanceStats: LivePerformanceStats = {
  tiktokViewers: 0,
  twitchViewers: 0,
  tiktokLikes: 0,
  tiktokDiamonds: 0,
};

let chatFilters = { blockedWords: [] as string[], followersOnly: false };
let lastTiktokUsername = '';
let tiktokReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let tiktokReconnectAttempts = 0;
let liveSessionActive = false;

type MessagesListener = (messages: UnifiedChatMessage[]) => void;
type StatusListener = (status: ChatConnectionStatus) => void;
type PerformanceListener = (stats: LivePerformanceStats) => void;

let onMessages: MessagesListener = () => {};
let onStatus: StatusListener = () => {};
let onPerformance: PerformanceListener = () => {};

function emitMessages() {
  messages = dedupeMessages(messages);
  onMessages([...messages]);
}

function emitStatus() {
  onStatus({ ...connectionStatus });
}

function emitPerformance() {
  onPerformance({ ...performanceStats });
}

function passesFilters(msg: UnifiedChatMessage): boolean {
  if (chatFilters.followersOnly && !msg.badges.includes('follower') && !msg.badges.includes('fan')) {
    return false;
  }
  return !messageMatchesBlocked(msg.message, chatFilters.blockedWords);
}

function pushMessage(msg: UnifiedChatMessage) {
  if (!passesFilters(msg)) return;
  messages = [...messages, msg].slice(-MAX_MESSAGES);
  emitMessages();
}

export function setLiveSessionActive(active: boolean): void {
  liveSessionActive = active;
  if (!active) {
    if (tiktokReconnectTimer) {
      clearTimeout(tiktokReconnectTimer);
      tiktokReconnectTimer = null;
    }
    tiktokReconnectAttempts = 0;
    lastTiktokUsername = '';
  }
}

export function setLiveActive(active: boolean): void {
  setLiveSessionActive(active);
}

export function setChatFilters(filters: { blockedWords: string[]; followersOnly: boolean }) {
  chatFilters = { ...filters };
  messages = messages.filter(passesFilters);
  emitMessages();
}

export function getChatFilters() {
  return { ...chatFilters };
}

export async function sendChatMessage(
  platform: 'twitch' | 'tiktok',
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const message = text.trim();
  if (!message) return { ok: false, error: 'Mensagem vazia' };

  if (platform === 'twitch') {
    if (!twitchClient || connectionStatus.twitch !== 'connected') {
      return { ok: false, error: 'Twitch chat não conectado' };
    }
    try {
      const stored = getTokens('twitch');
      if (stored?.username) {
        const client = twitchClient as unknown as {
          getChannels: () => string[];
          say: (ch: string, msg: string) => Promise<void>;
          getOptions: () => { identity?: { username?: string } };
        };
        if (client.getOptions?.().identity?.username === 'justinfan') {
          return { ok: false, error: 'Reconecte o chat Twitch com OAuth para enviar mensagens' };
        }
        await getValidAccessToken();
      }
      const channels = (twitchClient as unknown as { getChannels: () => string[] }).getChannels();
      const channel = channels[0];
      if (channel) {
        await (twitchClient as unknown as { say: (ch: string, msg: string) => Promise<void> }).say(
          channel,
          message
        );
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Falha ao enviar' };
    }
  }

  return { ok: false, error: 'Envio TikTok não suportado via API' };
}

function scheduleTikTokReconnect(username: string) {
  if (!liveSessionActive || tiktokReconnectTimer || tiktokReconnectAttempts >= 8) return;
  tiktokReconnectAttempts++;
  const delay = Math.min(60000, 3000 * tiktokReconnectAttempts);
  tiktokReconnectTimer = setTimeout(async () => {
    tiktokReconnectTimer = null;
    if (tiktokConnection) return;
    connectionStatus = { ...connectionStatus, tiktok: 'connecting', tiktokError: undefined };
    emitStatus();
    await connectTikTok(username);
  }, delay);
}

function parseTwitchBadges(tags: Record<string, unknown>): ChatBadge[] {
  const badges: ChatBadge[] = [];
  const map = (tags.badges as Record<string, string>) ?? {};

  if (map.moderator) badges.push('mod');
  if (map.vip) badges.push('vip');
  if (map.subscriber || tags.subscriber) badges.push('sub');
  if (map.premium || map['prime']) badges.push('prime');
  if (map.founder) badges.push('follower');

  return badges;
}

function parseTikTokBadges(data: Record<string, unknown>): ChatBadge[] {
  const badges: ChatBadge[] = [];
  const user = data.user as Record<string, unknown> | undefined;
  const userAttr = user?.userAttr as Record<string, unknown> | undefined;

  if (userAttr?.isAdmin || data.isModerator) badges.push('mod');
  if (user?.isSubscriber || data.subscriber) badges.push('fan');
  if (data.followRole === 1 || data.followRole === 2) badges.push('follower');

  return badges;
}

function normalizeChannel(channel: string): string {
  return channel.replace(/^@/, '').trim().toLowerCase();
}

async function connectTwitch(channel: string): Promise<void> {
  const login = normalizeChannel(channel);
  if (!login) return;

  const { Client } = await import('tmi.js');

  connectionStatus = { ...connectionStatus, twitch: 'connecting', twitchError: undefined };
  emitStatus();

  const stored = getTokens('twitch');
  let identity: { username: string; password: string } = {
    username: 'justinfan',
    password: 'oauth:justinfan',
  };

  if (stored?.accessToken && stored.username) {
    try {
      const token = await getValidAccessToken();
      identity = {
        username: stored.username.toLowerCase(),
        password: `oauth:${token}`,
      };
    } catch {
      /* fallback read-only */
    }
  }

  twitchClient = new Client({
    channels: [login],
    connection: {
      secure: true,
      reconnect: true,
    },
    identity,
  });

  twitchClient.on('message', (_channel: unknown, tags: unknown, message: unknown, self: unknown) => {
    const t = tags as Record<string, unknown>;
    if (self || !String(message).trim()) return;

    pushMessage({
      id: `tw-${t.id ?? `${Date.now()}-${t['user-id']}`}`,
      platform: 'twitch',
      userId: String(t['user-id'] ?? t.username ?? 'unknown'),
      displayName: String(t['display-name'] ?? t.username ?? 'Anônimo'),
      message: String(message),
      timestamp: t['tmi-sent-ts'] ? Number(t['tmi-sent-ts']) : Date.now(),
      badges: parseTwitchBadges(t),
      nameColor: t.color && t.color !== '' ? String(t.color) : undefined,
    });
  });

  twitchClient.on('connected', () => {
    connectionStatus = { ...connectionStatus, twitch: 'connected', twitchError: undefined };
    emitStatus();
  });

  twitchClient.on('disconnected', (reason: string) => {
    connectionStatus = {
      ...connectionStatus,
      twitch: 'disconnected',
      twitchError: typeof reason === 'string' ? reason : undefined,
    };
    emitStatus();
  });

  try {
    await twitchClient.connect();
  } catch (err) {
    connectionStatus = {
      ...connectionStatus,
      twitch: 'error',
      twitchError: err instanceof Error ? err.message : 'Falha ao conectar Twitch',
    };
    emitStatus();
    twitchClient = null;
  }
}

async function connectTikTok(username: string): Promise<void> {
  const uniqueId = normalizeChannel(username);
  if (!uniqueId) return;

  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import(
    'tiktok-live-connector'
  );

  lastTiktokUsername = uniqueId;
  tiktokReconnectAttempts = 0;
  if (tiktokReconnectTimer) {
    clearTimeout(tiktokReconnectTimer);
    tiktokReconnectTimer = null;
  }

  connectionStatus = { ...connectionStatus, tiktok: 'connecting', tiktokError: undefined };
  emitStatus();

  tiktokConnection = new TikTokLiveConnection(uniqueId, {
    processInitialData: true,
    enableExtendedGiftInfo: false,
  });

  tiktokConnection.on(WebcastEvent.CHAT, (data: unknown) => {
    const payload = data as Record<string, unknown>;
    const user = payload.user as Record<string, unknown> | undefined;

    pushMessage({
      id: `tt-${payload.msgId ?? `${Date.now()}-${user?.uniqueId ?? 'anon'}`}`,
      platform: 'tiktok',
      userId: String(user?.uniqueId ?? user?.userId ?? 'unknown'),
      displayName: String(user?.nickname ?? user?.uniqueId ?? 'Anônimo'),
      message: String(payload.comment ?? ''),
      timestamp: Date.now(),
      badges: parseTikTokBadges(payload),
    });
  });

  tiktokConnection.on(WebcastEvent.SUPER_FAN, () => {
    /* badge aplicado nas mensagens seguintes via parseTikTokBadges */
  });

  tiktokConnection.on(WebcastEvent.MEMBER, (data: unknown) => {
    const payload = data as Record<string, unknown>;
    const user = payload.user as Record<string, unknown> | undefined;
    pushMessage({
      id: `tt-join-${Date.now()}-${user?.uniqueId ?? 'anon'}`,
      platform: 'tiktok',
      userId: String(user?.uniqueId ?? 'unknown'),
      displayName: String(user?.nickname ?? user?.uniqueId ?? 'Anônimo'),
      message: 'entrou na LIVE',
      timestamp: Date.now(),
      badges: ['follower'],
    });
  });

  tiktokConnection.on(WebcastEvent.ROOM_USER, (data: unknown) => {
    const payload = data as Record<string, unknown>;
    const viewers = Number(payload.viewerCount ?? payload.totalUser ?? 0);
    if (viewers > 0) {
      performanceStats = {
        ...performanceStats,
        tiktokViewers: Math.max(performanceStats.tiktokViewers, viewers),
      };
      emitPerformance();
    }
  });

  tiktokConnection.on(WebcastEvent.LIKE, (data: unknown) => {
    const payload = data as Record<string, unknown>;
    const likes = Number(payload.totalLikeCount ?? payload.likeCount ?? 0);
    if (likes > 0) {
      performanceStats = {
        ...performanceStats,
        tiktokLikes: Math.max(performanceStats.tiktokLikes, likes),
      };
      emitPerformance();
    }
  });

  tiktokConnection.on(WebcastEvent.GIFT, (data: unknown) => {
    const payload = data as Record<string, unknown>;
    const user = payload.user as Record<string, unknown> | undefined;
    const diamonds = Number(payload.diamondCount ?? payload.repeatCount ?? 0);
    const giftName = String(payload.giftName ?? payload.describe ?? 'Presente');
    if (diamonds > 0) {
      performanceStats = {
        ...performanceStats,
        tiktokDiamonds: performanceStats.tiktokDiamonds + diamonds,
      };
      emitPerformance();
    }
    pushMessage({
      id: `tt-gift-${Date.now()}-${user?.uniqueId ?? 'anon'}`,
      platform: 'tiktok',
      userId: String(user?.uniqueId ?? 'unknown'),
      displayName: String(user?.nickname ?? user?.uniqueId ?? 'Anônimo'),
      message: `🎁 ${giftName}${diamonds ? ` (${diamonds} 💎)` : ''}`,
      timestamp: Date.now(),
      badges: ['fan'],
    });
  });

  tiktokConnection.on(WebcastEvent.STREAM_END, () => {
    connectionStatus = {
      ...connectionStatus,
      tiktok: 'disconnected',
      tiktokError: 'Live TikTok encerrada — reconectando…',
    };
    emitStatus();
    if (tiktokConnection) {
      tiktokConnection.disconnect().catch(() => undefined);
      tiktokConnection = null;
    }
    scheduleTikTokReconnect(lastTiktokUsername);
  });

  tiktokConnection.on(ControlEvent.DISCONNECTED, () => {
    connectionStatus = { ...connectionStatus, tiktok: 'disconnected' };
    emitStatus();
    tiktokConnection = null;
    if (lastTiktokUsername) scheduleTikTokReconnect(lastTiktokUsername);
  });

  try {
    await tiktokConnection.connect();
    connectionStatus = { ...connectionStatus, tiktok: 'connected', tiktokError: undefined };
    emitStatus();
  } catch (err) {
    connectionStatus = {
      ...connectionStatus,
      tiktok: 'error',
      tiktokError: err instanceof Error ? err.message : 'Falha ao conectar TikTok (você está ao vivo?)',
    };
    emitStatus();
    tiktokConnection = null;
  }
}

export function setChatListeners(listeners: {
  onMessages?: MessagesListener;
  onStatus?: StatusListener;
  onPerformance?: PerformanceListener;
}) {
  if (listeners.onMessages) onMessages = listeners.onMessages;
  if (listeners.onStatus) onStatus = listeners.onStatus;
  if (listeners.onPerformance) onPerformance = listeners.onPerformance;
}

export async function connectChat(config: ChatConnectConfig): Promise<ChatConnectionStatus> {
  await disconnectChat();
  liveSessionActive = true;
  messages = [];
  emitMessages();

  performanceStats = {
    tiktokViewers: 0,
    twitchViewers: 0,
    tiktokLikes: 0,
    tiktokDiamonds: 0,
  };
  emitPerformance();

  const tasks: Promise<void>[] = [];

  if (config.twitchChannel?.trim()) {
    tasks.push(connectTwitch(config.twitchChannel));
  }

  if (config.tiktokUsername?.trim()) {
    tasks.push(connectTikTok(config.tiktokUsername));
  }

  await Promise.all(tasks);
  return { ...connectionStatus };
}

export async function disconnectChat(): Promise<void> {
  liveSessionActive = false;
  if (tiktokReconnectTimer) {
    clearTimeout(tiktokReconnectTimer);
    tiktokReconnectTimer = null;
  }
  lastTiktokUsername = '';
  tiktokReconnectAttempts = 0;

  if (twitchClient) {
    try {
      await twitchClient.disconnect();
    } catch {
      /* ignore */
    }
    twitchClient = null;
  }

  if (tiktokConnection) {
    try {
      await tiktokConnection.disconnect();
    } catch {
      /* ignore */
    }
    tiktokConnection = null;
  }

  connectionStatus = { twitch: 'disconnected', tiktok: 'disconnected' };
  emitStatus();
}

export function getChatMessages(): UnifiedChatMessage[] {
  return [...messages];
}

export function getChatStatus(): ChatConnectionStatus {
  return { ...connectionStatus };
}

export function getPerformanceStats(): LivePerformanceStats {
  return { ...performanceStats };
}

export function clearChatMessages(): void {
  messages = [];
  emitMessages();
}
