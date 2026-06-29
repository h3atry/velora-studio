import { app } from 'electron';
import fs from 'fs';
import https from 'https';
import path from 'path';
import selfsigned from 'selfsigned';
import type { IncomingMessage, ServerResponse } from 'http';
import { closeOAuthWindow } from './oauthWindow';

interface CertPair {
  key: string;
  cert: string;
}

function certDir(): string {
  return path.join(app.getPath('userData'), 'certs');
}

export function getOrCreateLoopbackCerts(): CertPair {
  const dir = certDir();
  const keyPath = path.join(dir, 'oauth-key.pem');
  const certPath = path.join(dir, 'oauth-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath, 'utf-8'),
      cert: fs.readFileSync(certPath, 'utf-8'),
    };
  }

  fs.mkdirSync(dir, { recursive: true });
  return { key: '', cert: '' };
}

async function ensureCerts(): Promise<CertPair> {
  const existing = getOrCreateLoopbackCerts();
  if (existing.key && existing.cert) return existing;

  const dir = certDir();
  const keyPath = path.join(dir, 'oauth-key.pem');
  const certPath = path.join(dir, 'oauth-cert.pem');

  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 2);

  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: '127.0.0.1' }],
    {
      keySize: 2048,
      algorithm: 'sha256',
      notAfterDate: notAfter,
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 7, ip: '127.0.0.1' },
            { type: 2, value: 'localhost' },
          ],
        },
      ],
    }
  );

  fs.writeFileSync(keyPath, pems.private, 'utf-8');
  fs.writeFileSync(certPath, pems.cert, 'utf-8');

  return { key: pems.private, cert: pems.cert };
}

export async function waitForOAuthCallback(
  port: number,
  pathname: string,
  timeoutMs = 120_000
): Promise<{ code: string; state?: string }> {
  const { key, cert } = await ensureCerts();

  return new Promise((resolve, reject) => {
    const handler = (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', `https://127.0.0.1:${port}`);
        if (url.pathname !== pathname) {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const state = url.searchParams.get('state') ?? undefined;
        const errorDesc = url.searchParams.get('error_description') ?? error;

        closeOAuthWindow();

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Velora</title></head>
<body style="font-family:system-ui,sans-serif;background:#0a0b12;color:#f1f3f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center;max-width:320px;padding:24px">
<h1 style="font-size:1.25rem">${error ? 'Não foi possível conectar' : 'Conta conectada!'}</h1>
<p style="color:#9ca3af;font-size:14px;margin-top:8px">${error ? errorDesc : 'Stream key e perfil foram salvos no Velora. Pode fechar esta janela.'}</p>
</div></body></html>`);

        server.close();

        if (error) reject(new Error(errorDesc ?? error));
        else if (code) resolve({ code, state });
        else reject(new Error('Código OAuth não recebido'));
      } catch (err) {
        closeOAuthWindow();
        server.close();
        reject(err);
      }
    };

    const server = https.createServer({ key, cert }, handler);

    server.listen(port, '127.0.0.1', () => {
      /* ready */
    });

    server.on('error', reject);

    setTimeout(() => {
      closeOAuthWindow();
      server.close();
      reject(new Error('Tempo esgotado — conexão cancelada'));
    }, timeoutMs);
  });
}
