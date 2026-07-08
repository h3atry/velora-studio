import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export const SCHEMA_VERSION = 1;

const FILES = {
  app: 'velora-app.json',
  scenes: 'velora-scenes.json',
  chatFilters: 'velora-chat-filters.json',
  settings: 'velora-settings.json',
} as const;

function dir(): string {
  const d = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function readJson<T>(name: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(path.join(dir(), name), 'utf-8');
    const parsed = JSON.parse(raw) as T & { schemaVersion?: number };
    if (parsed && typeof parsed === 'object' && 'schemaVersion' in parsed) {
      const { schemaVersion: _schemaVersion, ...rest } = parsed as Record<string, unknown>;
      void _schemaVersion;
      return rest as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson(name: string, data: unknown): void {
  const payload = { schemaVersion: SCHEMA_VERSION, ...(data as object) };
  fs.writeFileSync(path.join(dir(), name), JSON.stringify(payload, null, 2), 'utf-8');
}

export function loadAppState<T>(fallback: T): T {
  return readJson(FILES.app, fallback);
}

export function saveAppState<T>(data: T): void {
  writeJson(FILES.app, data);
}

export function loadScenes<T>(fallback: T): T {
  return readJson(FILES.scenes, fallback);
}

export function saveScenes<T>(data: T): void {
  writeJson(FILES.scenes, data);
}

export function loadChatFilters(fallback: { blockedWords: string[]; followersOnly: boolean }) {
  return readJson(FILES.chatFilters, fallback);
}

export function saveChatFilters(data: { blockedWords: string[]; followersOnly: boolean }): void {
  writeJson(FILES.chatFilters, data);
}

export function loadSettings(fallback: Record<string, unknown>) {
  return readJson(FILES.settings, fallback);
}

export function saveSettings(data: Record<string, unknown>): void {
  writeJson(FILES.settings, data);
}

export function exportUserConfig(): string {
  const exportDir = path.join(app.getPath('documents'), 'Velora', 'backups');
  fs.mkdirSync(exportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(exportDir, `velora-config-${stamp}.json`);

  const bundle = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: loadAppState({
      liveInfo: null,
      moderators: [],
      onboardingDone: false,
    }),
    scenes: loadScenes({
      scenes: [{ id: 'default', name: 'Cena principal', sources: [] }],
      activeId: 'default',
    }),
    settings: loadSettings({
      previewOffDuringLive: false,
      chatSound: false,
      theme: 'dark',
      locale: 'pt-BR',
    }),
    chatFilters: loadChatFilters({ blockedWords: [], followersOnly: false }),
  };

  fs.writeFileSync(outFile, JSON.stringify(bundle, null, 2), 'utf-8');
  return outFile;
}

export function importUserConfig(filePath: string): void {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
    app?: unknown;
    scenes?: unknown;
    settings?: Record<string, unknown>;
    chatFilters?: { blockedWords: string[]; followersOnly: boolean };
  };

  if (raw.app) saveAppState(raw.app);
  if (raw.scenes) saveScenes(raw.scenes);
  if (raw.settings) saveSettings(raw.settings);
  if (raw.chatFilters) saveChatFilters(raw.chatFilters);
}
