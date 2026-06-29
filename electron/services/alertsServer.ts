import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

const PORT = Number(process.env.ALERTS_PORT) || 17571;
const MAX_BODY = 64 * 1024;
const WEBHOOK_TOKEN = process.env.ALERTS_WEBHOOK_TOKEN ?? '';

export interface AlertEvent {
  id: string;
  type: 'follow' | 'sub' | 'donation' | 'raid' | 'custom';
  title: string;
  message: string;
  amount?: string;
  timestamp: number;
}

let server: http.Server | null = null;
let listeners: ((alert: AlertEvent) => void)[] = [];

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Payload muito grande (máx 64KB)'));
        req.destroy();
        return;
      }
      body += c;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

export function onAlert(cb: (alert: AlertEvent) => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function emit(alert: AlertEvent) {
  for (const l of listeners) l(alert);
}

function authorized(req: IncomingMessage): boolean {
  if (!WEBHOOK_TOKEN) return true;
  const header = req.headers['x-velora-token'] ?? req.headers.authorization;
  if (typeof header === 'string' && header.replace(/^Bearer\s+/i, '') === WEBHOOK_TOKEN) {
    return true;
  }
  return false;
}

export function startAlertsServer(): void {
  if (server) return;

  server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Velora-Token, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/webhook') {
      if (!authorized(req)) {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      try {
        const body = (await parseBody(req)) as Record<string, unknown>;
        const alert: AlertEvent = {
          id: `alert-${Date.now()}`,
          type: (body.type as AlertEvent['type']) ?? 'custom',
          title: String(body.title ?? body.event ?? 'Alerta'),
          message: String(body.message ?? body.text ?? ''),
          amount: body.amount ? String(body.amount) : undefined,
          timestamp: Date.now(),
        };
        emit(alert);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(String(e));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      json(res, { ok: true, port: PORT });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[alerts] webhook http://127.0.0.1:${PORT}/webhook`);
  });
}

function json(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function stopAlertsServer(): void {
  server?.close();
  server = null;
}

export function getAlertsPort(): number {
  return PORT;
}
