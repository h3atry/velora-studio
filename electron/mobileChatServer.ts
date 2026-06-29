import http from 'http';
import os from 'os';
import crypto from 'crypto';
import QRCode from 'qrcode';
import type { ServerResponse } from 'http';
import type {
  ChatConnectionStatus,
  LivePerformanceStats,
  UnifiedChatMessage,
} from './chatTypes';
import {
  getChatMessages,
  getChatStatus,
  getPerformanceStats,
} from './chatService';

const DEFAULT_PORT = Number(process.env.CHAT_LAN_PORT) || 17570;

let server: http.Server | null = null;
let port = DEFAULT_PORT;
let accessToken = '';
let sseClients = new Set<ServerResponse>();
let lastMessageCount = 0;
let bindError: string | null = null;
const rateLimit = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + 60_000 };
  }
  entry.count += 1;
  rateLimit.set(ip, entry);
  return entry.count <= 120;
}

function logWarnPort(p: number) {
  console.warn(`[mobile-chat] Porta ${p} em uso, tentando ${p + 1}`);
}

function rateLimitPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Velora — Muitas requisições</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      background: #08090d;
      color: #f1f3f9;
      padding: 24px;
      text-align: center;
    }
    @media (prefers-color-scheme: light) {
      body { background: #f4f6fb; color: #1a1d26; }
      p { color: #5c6378; }
    }
    h1 { font-size: 18px; margin-bottom: 8px; }
    p { font-size: 14px; line-height: 1.5; color: #8b93a8; }
  </style>
</head>
<body>
  <div>
    <h1>Muitas requisições</h1>
    <p>Aguarde um minuto e recarregue a página.</p>
  </div>
</body>
</html>`;
}

function mobileManifest(baseUrl: string, token: string): string {
  const startUrl = token ? `/?t=${encodeURIComponent(token)}` : '/';
  return JSON.stringify({
    name: 'Velora Chat',
    short_name: 'Velora',
    description: 'Chat da LIVE no celular',
    start_url: startUrl,
    display: 'standalone',
    background_color: '#08090d',
    theme_color: '#08090d',
    icons: [{ src: `${baseUrl}/icon-192.png`, sizes: '192x192', type: 'image/png' }],
  });
}

function getLanIp(): string {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (net.address.startsWith('169.254.')) continue;
      candidates.push(net.address);
    }
  }

  return candidates[0] ?? '127.0.0.1';
}

function sendSse(res: ServerResponse, event: string, data: unknown) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcastSse(event: string, data: unknown) {
  for (const client of sseClients) {
    sendSse(client, event, data);
  }
}

function isAuthorized(url: URL): boolean {
  const token = url.searchParams.get('t');
  return !accessToken || token === accessToken;
}

function mobilePageHtml(baseUrl: string, token: string): string {
  const qs = token ? `?t=${encodeURIComponent(token)}` : '';
  const streamUrl = `${baseUrl}/stream${qs}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#08090d" />
  <link rel="manifest" href="${baseUrl}/manifest.webmanifest${qs}" />
  <title>Velora — Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #08090d;
      color: #f1f3f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }
    @media (prefers-color-scheme: light) {
      html, body { background: #f4f6fb; color: #1a1d26; }
      header { background: #fff; border-bottom-color: #e2e6ef; }
      .stats { color: #5c6378; border-bottom-color: #e2e6ef; }
      .stats b { color: #1a1d26; }
      .empty { color: #8b93a8; }
      .msg { border-left-color: #d8dce8; }
      .msg.tiktok { background: rgba(255,70,104,.08); }
      .msg.twitch { background: rgba(155,114,242,.08); }
      .text { color: #2a2f3d; }
      .conn-bar { background: #eef1f7; color: #5c6378; }
    }
    .app {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid #262a38;
      background: #11131a;
    }
    header h1 {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    header h1 span { color: #22d3ee; }
    .status {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #5c6378;
    }
    .dot.on { background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,.5); }
    .dot.err { background: #f87171; }
    .stats {
      flex-shrink: 0;
      display: flex;
      gap: 12px;
      padding: 8px 14px;
      font-size: 11px;
      color: #8b93a8;
      border-bottom: 1px solid #1c1f2a;
      overflow-x: auto;
      white-space: nowrap;
    }
    .stats b { color: #f1f3f9; font-weight: 500; }
    #messages {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 8px 10px 16px;
    }
    .empty {
      text-align: center;
      color: #5c6378;
      font-size: 13px;
      padding: 48px 24px;
      line-height: 1.5;
    }
    .msg {
      display: flex;
      gap: 8px;
      padding: 8px 10px;
      margin-bottom: 4px;
      border-radius: 8px;
      border-left: 3px solid #262a38;
      animation: fadeIn .15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .msg.tiktok { border-left-color: #ff4668; background: rgba(255,70,104,.06); }
    .msg.twitch { border-left-color: #9b72f2; background: rgba(155,114,242,.06); }
    .platform {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 2px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .platform.tiktok { background: #ff4668; }
    .platform.twitch { background: #9b72f2; }
    .body { min-width: 0; flex: 1; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }
    .name {
      font-size: 13px;
      font-weight: 600;
    }
    .name.tiktok { color: #ff4668; }
    .name.twitch { color: #9b72f2; }
    .badge {
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: .02em;
    }
    .badge.mod { background: rgba(52,211,153,.2); color: #6ee7b7; }
    .badge.fan { background: rgba(255,70,104,.2); color: #ff4668; }
    .badge.prime { background: rgba(59,130,246,.25); color: #93c5fd; }
    .badge.follower { background: rgba(113,113,122,.25); color: #d4d4d8; }
    .badge.vip { background: rgba(168,85,247,.25); color: #d8b4fe; }
    .badge.sub { background: rgba(99,102,241,.25); color: #a5b4fc; }
    .text {
      font-size: 14px;
      line-height: 1.35;
      color: #e4e7ef;
      word-break: break-word;
    }
    .conn-bar {
      flex-shrink: 0;
      padding: 6px 14px;
      font-size: 11px;
      text-align: center;
      background: #181b25;
      color: #8b93a8;
    }
    .conn-bar.live { color: #34d399; }
    .conn-bar.off { color: #f87171; }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1>Vel<span style="color:#00e5cc">ora</span> Chat</h1>
      <div class="status">
        <span id="connLabel" style="font-size:11px;color:#8b93a8">Conectando…</span>
        <span id="connDot" class="dot"></span>
      </div>
    </header>
    <div class="stats" id="stats"></div>
    <div id="messages"><p class="empty">Aguardando mensagens da LIVE…</p></div>
    <div id="connBar" class="conn-bar">Sincronizando em tempo real</div>
  </div>
  <script>
    const BADGE_LABELS = { prime:'Prime', fan:'Fã', mod:'Mod', follower:'Seguidor', vip:'VIP', sub:'Sub' };
    const messagesEl = document.getElementById('messages');
    const statsEl = document.getElementById('stats');
    const connDot = document.getElementById('connDot');
    const connLabel = document.getElementById('connLabel');
    const connBar = document.getElementById('connBar');
    const rendered = new Map();
    let es = null;
    let reconnectDelay = 1000;
    let reconnectTimer = null;
    let statsDebounce = null;
    let lastStatsHtml = '';

    function scrollBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderStats(p) {
      if (!p) return;
      clearTimeout(statsDebounce);
      statsDebounce = setTimeout(function() {
        const parts = [];
        if (p.tiktokViewers) parts.push('TT <b>' + p.tiktokViewers.toLocaleString('pt-BR') + '</b>');
        if (p.twitchViewers) parts.push('TW <b>' + p.twitchViewers.toLocaleString('pt-BR') + '</b>');
        if (p.tiktokLikes) parts.push('♥ <b>' + p.tiktokLikes.toLocaleString('pt-BR') + '</b>');
        const html = parts.length ? parts.join(' · ') : '';
        if (html !== lastStatsHtml) {
          statsEl.innerHTML = html;
          lastStatsHtml = html;
        }
      }, 400);
    }

    function renderStatus(s) {
      if (!s) return;
      const tt = s.tiktok === 'connected';
      const tw = s.twitch === 'connected';
      const any = tt || tw;
      connDot.className = 'dot' + (any ? ' on' : (s.tiktok === 'error' || s.twitch === 'error' ? ' err' : ''));
      const labels = [];
      if (tt) labels.push('TikTok');
      if (tw) labels.push('Twitch');
      connLabel.textContent = labels.length ? labels.join(' + ') : 'Offline';
    }

    function renderMessage(msg) {
      if (rendered.has(msg.id)) return;
      rendered.set(msg.id, true);
      if (messagesEl.querySelector('.empty')) messagesEl.innerHTML = '';

      const el = document.createElement('div');
      el.className = 'msg ' + msg.platform;
      el.dataset.id = msg.id;

      const plat = document.createElement('div');
      plat.className = 'platform ' + msg.platform;
      plat.textContent = msg.platform === 'tiktok' ? 'T' : 'W';

      const body = document.createElement('div');
      body.className = 'body';

      const meta = document.createElement('div');
      meta.className = 'meta';

      const name = document.createElement('span');
      name.className = 'name ' + msg.platform;
      if (msg.nameColor) name.style.color = msg.nameColor;
      name.textContent = msg.displayName;
      meta.appendChild(name);

      (msg.badges || []).forEach(function(b) {
        const badge = document.createElement('span');
        badge.className = 'badge ' + b;
        badge.textContent = BADGE_LABELS[b] || b;
        meta.appendChild(badge);
      });

      const text = document.createElement('p');
      text.className = 'text';
      text.textContent = msg.message;

      body.appendChild(meta);
      body.appendChild(text);
      el.appendChild(plat);
      el.appendChild(body);
      messagesEl.appendChild(el);
    }

    function scheduleReconnect() {
      if (reconnectTimer) return;
      connBar.textContent = 'Reconectando em ' + Math.round(reconnectDelay / 1000) + 's…';
      connBar.className = 'conn-bar off';
      connDot.className = 'dot err';
      reconnectTimer = setTimeout(function() {
        reconnectTimer = null;
        connect();
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      }, reconnectDelay);
    }

    function connect() {
      if (es) { es.close(); es = null; }
      es = new EventSource('${streamUrl}');
      es.onopen = function() {
        reconnectDelay = 1000;
        connBar.textContent = 'Tempo real · latência mínima';
        connBar.className = 'conn-bar live';
      };
      es.onerror = function() {
        if (es) { es.close(); es = null; }
        scheduleReconnect();
      };
      es.addEventListener('snapshot', function(e) {
        var data = JSON.parse(e.data);
        rendered.clear();
        messagesEl.innerHTML = '';
        (data.messages || []).forEach(renderMessage);
        renderStatus(data.status);
        renderStats(data.performance);
        scrollBottom();
      });
      es.addEventListener('message', function(e) {
        renderMessage(JSON.parse(e.data));
        scrollBottom();
      });
      es.addEventListener('clear', function() {
        rendered.clear();
        messagesEl.innerHTML = '<p class="empty">Chat limpo — aguardando mensagens…</p>';
      });
      es.addEventListener('status', function(e) { renderStatus(JSON.parse(e.data)); });
      es.addEventListener('performance', function(e) { renderStats(JSON.parse(e.data)); });
    }

    connect();
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && (!es || es.readyState === EventSource.CLOSED)) {
        reconnectDelay = 1000;
        connect();
      }
    });
  </script>
</body>
</html>`;
}

function handleRequest(req: http.IncomingMessage, res: ServerResponse) {
  const ip = req.socket.remoteAddress ?? 'unknown';
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(rateLimitPageHtml());
    return;
  }

  const host = req.headers.host ?? `localhost:${port}`;
  const url = new URL(req.url ?? '/', `http://${host}`);

  if (!isAuthorized(url)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Token inválido');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/qr.png') {
    const data = url.searchParams.get('d') ?? '';
    if (!data) {
      res.writeHead(400);
      res.end('missing d');
      return;
    }
    void QRCode.toBuffer(data, { width: 280, margin: 1 }).then((buf) => {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(buf);
    }).catch(() => {
      res.writeHead(500);
      res.end('qr error');
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/manifest.webmanifest') {
    const ip = getLanIp();
    const token = url.searchParams.get('t') ?? accessToken;
    const baseUrl = `http://${ip}:${port}`;
    res.writeHead(200, {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(mobileManifest(baseUrl, token));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/chat')) {
    const ip = getLanIp();
    const token = url.searchParams.get('t') ?? accessToken;
    const baseUrl = `http://${ip}:${port}`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(mobilePageHtml(baseUrl, token));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');

    sseClients.add(res);

    sendSse(res, 'snapshot', {
      messages: getChatMessages(),
      status: getChatStatus(),
      performance: getPerformanceStats(),
    });

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: sseClients.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

export interface MobileChatInfo {
  running: boolean;
  port: number;
  ip: string;
  url: string;
  clientCount: number;
  token: string;
  bindError?: string | null;
}

export function startMobileChatServer(preferredPort = DEFAULT_PORT): MobileChatInfo {
  if (server) {
    return getMobileChatInfo();
  }

  accessToken = crypto.randomBytes(16).toString('hex');
  port = preferredPort;
  lastMessageCount = 0;
  bindError = null;

  server = http.createServer(handleRequest);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && port < DEFAULT_PORT + 10) {
      logWarnPort(port);
      try {
        server?.close();
      } catch {
        /* ignore */
      }
      server = null;
      startMobileChatServer(port + 1);
    } else {
      bindError = `Não foi possível abrir a porta ${port}: ${err.message}`;
      console.error('[mobile-chat]', bindError);
      server = null;
    }
  });

  server.listen(port, '0.0.0.0', () => {
    bindError = null;
    const ip = getLanIp();
    console.log(`[mobile-chat] http://${ip}:${port}/?t=${accessToken}`);
  });

  return getMobileChatInfo();
}

export function stopMobileChatServer(): void {
  for (const client of sseClients) {
    client.end();
  }
  sseClients.clear();
  sseClients = new Set();

  if (server) {
    server.close();
    server = null;
  }
  lastMessageCount = 0;
}

export function regenerateMobileChatToken(): string {
  accessToken = crypto.randomBytes(16).toString('hex');
  return accessToken;
}

export function getMobileChatInfo(): MobileChatInfo {
  const ip = getLanIp();
  const running = server !== null && server.listening;
  const token = accessToken;
  const url = running ? `http://${ip}:${port}/?t=${token}` : '';

  return {
    running,
    port,
    ip,
    url,
    clientCount: sseClients.size,
    token,
    bindError,
  };
}

/** Push incremental — chamado direto do main ao receber chat (0 delay vs React). */
export function handleMobileChatMessages(messages: UnifiedChatMessage[]): void {
  if (!server?.listening) return;

  if (messages.length === 0 && lastMessageCount > 0) {
    lastMessageCount = 0;
    broadcastSse('clear', {});
    return;
  }

  if (messages.length > lastMessageCount) {
    for (let i = lastMessageCount; i < messages.length; i++) {
      broadcastSse('message', messages[i]);
    }
  }

  lastMessageCount = messages.length;
}

export function handleMobileChatStatus(status: ChatConnectionStatus): void {
  if (!server?.listening) return;
  broadcastSse('status', status);
}

export function handleMobileChatPerformance(stats: LivePerformanceStats): void {
  if (!server?.listening) return;
  broadcastSse('performance', stats);
}

export function resetMobileChatTracking(): void {
  lastMessageCount = 0;
}

/** QR como data URL — evita CSP bloquear img de IP LAN no renderer. */
export async function generateMobileChatQrDataUrl(text: string): Promise<string> {
  if (!text.trim()) throw new Error('URL vazia');
  return QRCode.toDataURL(text, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
}
