import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { app } from 'electron';
import { logError, logInfo } from './crashLogger';

const require = createRequire(import.meta.url);
import { translateFfmpegExitCode, translateFfmpegMessage } from './utils/ffmpegErrors';
import { redactSecrets } from './utils/logRedact';

export type InputSource = 'camera' | 'display' | 'window' | 'game';

export interface StreamDestination {
  platform: 'tiktok' | 'twitch' | 'youtube';
  enabled: boolean;
  rtmpUrl: string;
  streamKey: string;
}

export interface StreamConfig {
  cameraId: string;
  audioId?: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  destinations: StreamDestination[];
  inputSource?: InputSource;
  captureTarget?: string;
  recordLocal?: boolean;
  desktopAudio?: boolean;
  audioBitrateKbps?: number;
  reconnect?: boolean;
}

export interface MediaDevice {
  id: string;
  label: string;
  kind: 'video' | 'audio';
}

export interface StreamStatus {
  running: boolean;
  uploadKbps: number;
  fps: number;
  droppedFrames: number;
  totalFrames: number;
  error?: string;
  bitrateWarning?: string;
  recording?: boolean;
  recordingPath?: string;
}

export const PLATFORM_PRESETS = {
  tiktok: { width: 1080, height: 1920, fps: 30, bitrateKbps: 4000 },
  twitch: { width: 1920, height: 1080, fps: 60, bitrateKbps: 6000 },
  youtube: { width: 1920, height: 1080, fps: 60, bitrateKbps: 8000 },
} as const;

let ffmpegProcess: ChildProcessWithoutNullStreams | null = null;
let lastConfig: StreamConfig | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

let streamStatus: StreamStatus = {
  running: false,
  uploadKbps: 0,
  fps: 0,
  droppedFrames: 0,
  totalFrames: 0,
};

let deviceCache: MediaDevice[] | null = null;
let deviceCacheTime = 0;
let ffmpegAvailableCache: boolean | null = null;
let userStoppedStream = false;
let lastRecordingPath: string | undefined;
let uploadSamples: number[] = [];
let stableLiveTimer: ReturnType<typeof setTimeout> | null = null;
let activeDestinations: { platform: string; url: string }[] = [];
let lowBitrateSamples = 0;

export function isFfmpegAvailable(): boolean {
  if (ffmpegAvailableCache !== null) return ffmpegAvailableCache;
  try {
    ffmpegAvailableCache = Boolean(getFfmpegPath() && fs.existsSync(getFfmpegPath()));
  } catch {
    ffmpegAvailableCache = false;
  }
  return ffmpegAvailableCache;
}

function getFfmpegPath(): string {
  const candidates: string[] = [];

  if (process.env.FFMPEG_BIN) {
    candidates.push(process.env.FFMPEG_BIN);
  }

  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe'),
      path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'ffmpeg-static',
        'ffmpeg.exe'
      )
    );
  } else {
    candidates.push(
      path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      path.join(__dirname, '../node_modules/ffmpeg-static/ffmpeg.exe'),
      path.join(__dirname, '../../node_modules/ffmpeg-static/ffmpeg.exe')
    );
    try {
      const fromModule = require('ffmpeg-static') as string | null;
      if (fromModule) candidates.push(fromModule);
    } catch {
      /* dev fallback */
    }
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  throw new Error('FFmpeg não encontrado. Execute npm run build para embarcar o binário.');
}

function dshowInput(config: StreamConfig): string {
  const video = `video="${config.cameraId.replace(/"/g, '\\"')}"`;
  if (!config.audioId) return video;
  const audio = `audio="${config.audioId.replace(/"/g, '\\"')}"`;
  return `${video}:${audio}`;
}

function buildRtmpUrl(base: string, key: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedKey = key.replace(/^\/+/, '');
  if (trimmedBase.includes(trimmedKey) && trimmedKey.length > 8) return trimmedBase;
  return `${trimmedBase}/${trimmedKey}`;
}

function teeEscape(target: string): string {
  return target.replace(/(['\\|\]])/g, '\\$1');
}

function buildInputArgs(config: StreamConfig): string[] {
  const source = config.inputSource ?? 'camera';

  if (source === 'display') {
    return ['-f', 'gdigrab', '-framerate', String(config.fps), '-i', 'desktop'];
  }

  if (source === 'window' || source === 'game') {
    const title = (config.captureTarget ?? 'Velora').replace(/"/g, '\\"');
    return ['-f', 'gdigrab', '-framerate', String(config.fps), '-i', `title=${title}`];
  }

  return [
    '-f',
    'dshow',
    '-rtbufsize',
    '512M',
    '-video_size',
    `${config.width}x${config.height}`,
    '-framerate',
    String(config.fps),
    '-i',
    dshowInput(config),
  ];
}

export function buildFfmpegArgs(config: StreamConfig): string[] {
  const enabledDestinations = config.destinations.filter(
    (d) => d.enabled && d.rtmpUrl.trim() && d.streamKey.trim()
  );

  if (enabledDestinations.length === 0) {
    throw new Error('Nenhum destino RTMP configurado');
  }

  const gop = config.fps * 2;
  const bitrate = `${config.bitrateKbps}k`;
  const args: string[] = [...buildInputArgs(config)];

  if (config.desktopAudio && config.inputSource === 'camera') {
    args.push('-f', 'dshow', '-i', 'audio=virtual-audio-capturer');
  }

  args.push('-map', '0:v');
  if (config.audioId || config.desktopAudio) {
    args.push('-map', '0:a?');
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-tune',
    'zerolatency',
    '-b:v',
    bitrate,
    '-maxrate',
    bitrate,
    '-bufsize',
    `${config.bitrateKbps * 2}k`,
    '-g',
    String(gop),
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    `${config.audioBitrateKbps ?? 128}k`,
    '-ar',
    '44100'
  );

  const outputs: string[] = [];

  if (config.recordLocal) {
    const recDir = path.join(app.getPath('videos'), 'Velora');
    fs.mkdirSync(recDir, { recursive: true });
    lastRecordingPath = path.join(recDir, `velora-${Date.now()}.mp4`);
    outputs.push(`[f=mp4:movflags=+faststart]${teeEscape(lastRecordingPath)}`);
    streamStatus.recording = true;
    streamStatus.recordingPath = lastRecordingPath;
  }

  for (const dest of enabledDestinations) {
    outputs.push(
      `[f=flv:onfail=ignore]${teeEscape(buildRtmpUrl(dest.rtmpUrl, dest.streamKey))}`
    );
  }

  if (outputs.length === 1) {
    const only = outputs[0]!;
    if (only.startsWith('[f=mp4')) {
      args.push('-f', 'mp4', lastRecordingPath!);
    } else {
      const url = only.replace(/^\[f=flv:onfail=ignore\]/, '').replace(/\\(.)/g, '$1');
      args.push('-f', 'flv', url);
    }
  } else if (outputs.length > 1) {
    args.push('-f', 'tee', outputs.join('|'));
  }

  return args;
}

function parseFfmpegStats(line: string) {
  const fpsMatch = line.match(/fps=\s*(\d+(?:\.\d+)?)/);
  const bitrateMatch = line.match(/bitrate=\s*(\d+(?:\.\d+)?)kbits\/s/);
  const dropMatch = line.match(/drop=\s*(\d+)/);
  const frameMatch = line.match(/frame=\s*(\d+)/);

  if (fpsMatch) streamStatus.fps = Math.round(Number(fpsMatch[1]));
  if (bitrateMatch) {
    const measured = Math.round(Number(bitrateMatch[1]));
    uploadSamples.push(measured);
    if (uploadSamples.length > 5) uploadSamples.shift();
    streamStatus.uploadKbps = Math.round(
      uploadSamples.reduce((a, b) => a + b, 0) / uploadSamples.length
    );

    const configured = lastConfig?.bitrateKbps ?? 0;
    if (configured > 0 && streamStatus.running) {
      const ratio = measured / configured;
      if (ratio < 0.5) {
        lowBitrateSamples++;
        if (lowBitrateSamples >= 3) {
          streamStatus.bitrateWarning = `Bitrate efetivo (${measured} kbps) muito abaixo do configurado (${configured} kbps)`;
        }
      } else {
        lowBitrateSamples = 0;
        if (streamStatus.bitrateWarning && ratio >= 0.7) {
          streamStatus.bitrateWarning = undefined;
        }
      }
    }
  }
  if (dropMatch) streamStatus.droppedFrames = Number(dropMatch[1]);
  if (frameMatch) streamStatus.totalFrames = Number(frameMatch[1]);
}

function scheduleStableReset() {
  if (stableLiveTimer) clearTimeout(stableLiveTimer);
  stableLiveTimer = setTimeout(() => {
    reconnectAttempts = 0;
    logInfo('LIVE estável 60s — contador de reconnect resetado');
  }, 60_000);
}

function scheduleReconnect() {
  if (userStoppedStream || !lastConfig?.reconnect || reconnectAttempts >= 5) return;
  reconnectAttempts++;
  const delay = Math.min(30000, 2000 * 2 ** reconnectAttempts);
  logInfo('Agendando reconnect FFmpeg', { attempt: reconnectAttempts, delay });
  reconnectTimer = setTimeout(() => {
    if (lastConfig && !userStoppedStream) startStream(lastConfig).catch(() => undefined);
  }, delay);
}

function spawnFfmpeg(config: StreamConfig) {
  const args = buildFfmpegArgs(config);
  const enabledDestinations = config.destinations.filter(
    (d) => d.enabled && d.rtmpUrl.trim() && d.streamKey.trim()
  );
  activeDestinations = enabledDestinations.map((d) => ({
    platform: d.platform,
    url: redactSecrets(buildRtmpUrl(d.rtmpUrl, d.streamKey)),
  }));
  logInfo('FFmpeg start', {
    args: redactSecrets(args.slice(0, 8).join(' ') + '...'),
    destinations: activeDestinations.map((d) => d.platform),
  });

  ffmpegProcess = spawn(getFfmpegPath(), args, { windowsHide: true });
  uploadSamples = [];
  lowBitrateSamples = 0;
  streamStatus.bitrateWarning = undefined;
  scheduleStableReset();

  ffmpegProcess.stderr.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      parseFfmpegStats(line);
      if (/error|failed|connection refused|i\/o error/i.test(line)) {
        streamStatus.error = translateFfmpegMessage(line.trim());
        for (const dest of activeDestinations) {
          const lineLower = line.toLowerCase();
          if (
            lineLower.includes(dest.platform) ||
            (activeDestinations.length > 1 && /rtmp|flv|output/i.test(line))
          ) {
            logError(`FFmpeg destino ${dest.platform} com erro`, {
              line: redactSecrets(line.trim()),
              url: dest.url,
            });
          }
        }
      }
    }
  });

  ffmpegProcess.on('close', (code) => {
    if (stableLiveTimer) {
      clearTimeout(stableLiveTimer);
      stableLiveTimer = null;
    }
    if (code !== 0 && code !== null && !userStoppedStream) {
      streamStatus.error = translateFfmpegExitCode(code);
      scheduleReconnect();
    }
    streamStatus.running = false;
    ffmpegProcess = null;
  });

  ffmpegProcess.on('error', (err) => {
    streamStatus.error = err.message;
    streamStatus.running = false;
    ffmpegProcess = null;
    logError('FFmpeg error', { message: err.message });
  });
}

export async function listMediaDevices(force = false): Promise<MediaDevice[]> {
  if (!force && deviceCache && Date.now() - deviceCacheTime < 30000) {
    return deviceCache;
  }

  return new Promise((resolve) => {
    const devices: MediaDevice[] = [];
    if (!isFfmpegAvailable()) {
      resolve(devices);
      return;
    }

    const proc = spawn(getFfmpegPath(), ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
      windowsHide: true,
    });

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', () => {
      let currentKind: 'video' | 'audio' | null = null;
      for (const line of stderr.split('\n')) {
        if (line.includes('DirectShow video devices')) currentKind = 'video';
        else if (line.includes('DirectShow audio devices')) currentKind = 'audio';
        else if (line.includes('Alternative name')) continue;
        else {
          const match = line.match(/"([^"]+)"/);
          if (match && currentKind) {
            devices.push({ id: match[1], label: match[1], kind: currentKind });
          }
        }
      }
      deviceCache = devices;
      deviceCacheTime = Date.now();
      resolve(devices);
    });

    proc.on('error', () => resolve(devices));
  });
}

export async function testStream(config: StreamConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isFfmpegAvailable()) {
    return { ok: false, error: 'FFmpeg não disponível' };
  }
  const enabled = config.destinations.filter((d) => d.enabled);
  const missing = enabled.filter((d) => !d.streamKey.trim());
  if (missing.length) {
    return { ok: false, error: 'Stream keys ausentes' };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ ok: false, error: 'Timeout — servidor RTMP não respondeu em 10s' });
    }, 10_000);

    const first = enabled[0];
    if (!first) {
      clearTimeout(timeout);
      resolve({ ok: false, error: 'Nenhum destino habilitado' });
      return;
    }

    const url = buildRtmpUrl(first.rtmpUrl, first.streamKey);
    const probe = spawn(
      getFfmpegPath(),
      ['-f', 'lavfi', '-i', 'anullsrc', '-t', '1', '-f', 'flv', url],
      { windowsHide: true }
    );
    probe.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: 'Falha ao conectar RTMP — verifique keys e rede' });
    });
    probe.on('error', () => {
      clearTimeout(timeout);
      resolve({ ok: false, error: 'Erro ao executar FFmpeg' });
    });
  });
}

export async function startStream(config: StreamConfig): Promise<StreamStatus> {
  if (!isFfmpegAvailable()) {
    streamStatus.error = 'FFmpeg não encontrado. Reinstale o Velora.';
    return { ...streamStatus };
  }

  if (ffmpegProcess) await stopStream();

  userStoppedStream = false;
  lastConfig = { ...config, reconnect: config.reconnect ?? true };
  reconnectAttempts = 0;
  if (reconnectTimer) clearTimeout(reconnectTimer);

  streamStatus = {
    running: true,
    uploadKbps: 0,
    fps: config.fps,
    droppedFrames: 0,
    totalFrames: 0,
    bitrateWarning: undefined,
    recording: config.recordLocal,
    recordingPath: config.recordLocal ? lastRecordingPath : undefined,
  };

  spawnFfmpeg(config);
  return { ...streamStatus };
}

export async function stopStream(): Promise<void> {
  userStoppedStream = true;
  if (stableLiveTimer) {
    clearTimeout(stableLiveTimer);
    stableLiveTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  lastConfig = null;
  reconnectAttempts = 0;

  if (!ffmpegProcess) {
    streamStatus.running = false;
    streamStatus.recording = false;
    return;
  }

  const proc = ffmpegProcess;
  ffmpegProcess = null;
  proc.kill('SIGINT');

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve();
    }, 3000);
    proc.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  streamStatus.running = false;
  streamStatus.uploadKbps = 0;
  streamStatus.recording = false;
  if (lastRecordingPath) {
    streamStatus.recordingPath = lastRecordingPath;
  }
}

export function getStreamStatus(): StreamStatus {
  return { ...streamStatus };
}

export function getPlatformPresets() {
  return PLATFORM_PRESETS;
}
