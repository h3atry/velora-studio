import type { StreamConfig } from '../streamService';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const PLATFORMS = new Set(['tiktok', 'twitch', 'youtube']);
const INPUT_SOURCES = new Set(['camera', 'display', 'window', 'game']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && Number.isInteger(v);
}

export function validateStreamStart(payload: unknown): ValidationResult<StreamConfig> {
  if (!isRecord(payload)) {
    return { ok: false, error: 'Configuração de stream inválida' };
  }

  if (!isNonEmptyString(payload.cameraId)) {
    return { ok: false, error: 'cameraId é obrigatório' };
  }

  if (!isPositiveInt(payload.width) || !isPositiveInt(payload.height)) {
    return { ok: false, error: 'width e height devem ser inteiros positivos' };
  }

  if (!isPositiveInt(payload.fps)) {
    return { ok: false, error: 'fps deve ser um inteiro positivo' };
  }

  if (!isPositiveInt(payload.bitrateKbps)) {
    return { ok: false, error: 'bitrateKbps deve ser um inteiro positivo' };
  }

  if (!Array.isArray(payload.destinations) || payload.destinations.length === 0) {
    return { ok: false, error: 'Pelo menos um destino de stream é obrigatório' };
  }

  const destinations = [];
  for (const dest of payload.destinations) {
    if (!isRecord(dest)) {
      return { ok: false, error: 'Destino de stream inválido' };
    }
    if (!PLATFORMS.has(String(dest.platform))) {
      return { ok: false, error: `Plataforma inválida: ${String(dest.platform)}` };
    }
    if (typeof dest.enabled !== 'boolean') {
      return { ok: false, error: 'destinations[].enabled deve ser boolean' };
    }
    if (!isNonEmptyString(dest.rtmpUrl)) {
      return { ok: false, error: 'destinations[].rtmpUrl é obrigatório' };
    }
    if (!isNonEmptyString(dest.streamKey)) {
      return { ok: false, error: 'destinations[].streamKey é obrigatório' };
    }
    destinations.push({
      platform: dest.platform as 'tiktok' | 'twitch' | 'youtube',
      enabled: dest.enabled,
      rtmpUrl: dest.rtmpUrl.trim(),
      streamKey: dest.streamKey.trim(),
    });
  }

  if (payload.inputSource !== undefined && !INPUT_SOURCES.has(String(payload.inputSource))) {
    return { ok: false, error: `inputSource inválido: ${String(payload.inputSource)}` };
  }

  const config: StreamConfig = {
    cameraId: payload.cameraId.trim(),
    width: payload.width,
    height: payload.height,
    fps: payload.fps,
    bitrateKbps: payload.bitrateKbps,
    destinations,
  };

  if (typeof payload.audioId === 'string' && payload.audioId.trim()) {
    config.audioId = payload.audioId.trim();
  }
  if (payload.inputSource) {
    config.inputSource = payload.inputSource as StreamConfig['inputSource'];
  }
  if (typeof payload.captureTarget === 'string' && payload.captureTarget.trim()) {
    config.captureTarget = payload.captureTarget.trim();
  }
  if (typeof payload.recordLocal === 'boolean') {
    config.recordLocal = payload.recordLocal;
  }
  if (typeof payload.desktopAudio === 'boolean') {
    config.desktopAudio = payload.desktopAudio;
  }
  if (typeof payload.audioBitrateKbps === 'number' && payload.audioBitrateKbps > 0) {
    config.audioBitrateKbps = payload.audioBitrateKbps;
  }
  if (typeof payload.reconnect === 'boolean') {
    config.reconnect = payload.reconnect;
  }

  return { ok: true, value: config };
}

export function validateChatSend(
  platform: unknown,
  message: unknown
): ValidationResult<{ platform: 'twitch' | 'tiktok'; message: string }> {
  if (platform !== 'twitch' && platform !== 'tiktok') {
    return { ok: false, error: 'Plataforma deve ser twitch ou tiktok' };
  }

  if (typeof message !== 'string') {
    return { ok: false, error: 'Mensagem deve ser texto' };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, error: 'Mensagem vazia' };
  }

  if (trimmed.length > 500) {
    return { ok: false, error: 'Mensagem muito longa (máx. 500 caracteres)' };
  }

  return { ok: true, value: { platform, message: trimmed } };
}
