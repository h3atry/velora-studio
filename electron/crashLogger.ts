import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { redactObject } from './utils/logRedact';

let logDir = '';
let logFile = '';

function ensureLogPath() {
  if (logFile) return;
  try {
    logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    logFile = path.join(logDir, 'velora.log');
  } catch {
    logDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    logFile = path.join(logDir, 'velora.log');
  }
}

const MAX_LOG_BYTES = 5 * 1024 * 1024;

function rotateIfNeeded() {
  try {
    const stat = fs.statSync(logFile);
    if (stat.size < MAX_LOG_BYTES) return;
    const rotated = path.join(logDir, `velora-${Date.now()}.log`);
    fs.renameSync(logFile, rotated);
    const files = fs
      .readdirSync(logDir)
      .filter((f) => f.startsWith('velora') && f.endsWith('.log'))
      .map((f) => ({ f, m: fs.statSync(path.join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    for (const old of files.slice(5)) {
      fs.unlinkSync(path.join(logDir, old.f));
    }
  } catch {
    /* ignore */
  }
}

function write(level: string, message: string, detail?: unknown) {
  ensureLogPath();
  rotateIfNeeded();
  const line = `[${new Date().toISOString()}] [${level}] ${message}${
    detail !== undefined ? ` ${safeJson(detail)}` : ''
  }\n`;
  try {
    fs.appendFileSync(logFile, line, 'utf8');
  } catch {
    /* ignore */
  }
  if (level === 'ERROR' || level === 'CRASH') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(redactObject(value));
  } catch {
    return String(value);
  }
}

function isDebug(): boolean {
  return process.env.VELORA_LOG === 'debug';
}

export function logDebug(message: string, detail?: unknown) {
  if (isDebug()) write('DEBUG', message, detail);
}

export function logInfo(message: string, detail?: unknown) {
  write('INFO', message, detail);
}

export function logWarn(message: string, detail?: unknown) {
  write('WARN', message, detail);
}

export function logError(message: string, detail?: unknown) {
  write('ERROR', message, detail);
}

export function logCrash(message: string, detail?: unknown) {
  write('CRASH', message, detail);
}

export function getLogFilePath(): string {
  ensureLogPath();
  return logFile;
}

export function installCrashHandlers(): void {
  process.on('uncaughtException', (err) => {
    logCrash('uncaughtException', { message: err.message, stack: err.stack });
  });

  process.on('unhandledRejection', (reason) => {
    logCrash('unhandledRejection', reason);
  });
}

export function attachWindowCrashHandlers(
  win: Electron.BrowserWindow,
  label: string,
  onRecover?: () => void
): void {
  win.webContents.on('render-process-gone', (_event, details) => {
    logCrash(`render-process-gone:${label}`, details);
    if (details.reason !== 'clean-exit' && onRecover) {
      onRecover();
    }
  });

  win.webContents.on('unresponsive', () => {
    logWarn(`window-unresponsive:${label}`);
  });

  win.webContents.on('responsive', () => {
    logInfo(`window-responsive:${label}`);
  });

  win.webContents.on('did-fail-load', (_event, code, desc, url) => {
    logError(`did-fail-load:${label}`, { code, desc, url });
  });
}
