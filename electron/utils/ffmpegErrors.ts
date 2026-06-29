const FFMPEG_MESSAGES: Record<number, string> = {
  1: 'Erro genérico do FFmpeg — verifique câmera e stream keys.',
  255: 'FFmpeg encerrado — dispositivo de captura pode estar em uso pelo preview.',
};

export function translateFfmpegExitCode(code: number): string {
  return FFMPEG_MESSAGES[code] ?? `FFmpeg encerrou com código ${code}`;
}

export function translateFfmpegMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('device already in use') || lower.includes('could not run graph')) {
    return 'Câmera em uso — ative "Preview OFF durante LIVE" ou feche outros apps.';
  }
  if (lower.includes('connection refused') || lower.includes('failed to resolve hostname')) {
    return 'Falha de rede RTMP — verifique internet e URL do servidor.';
  }
  if (lower.includes('invalid stream') || lower.includes('authentication failed')) {
    return 'Stream key inválida ou expirada — reconecte a conta ou cole uma key nova.';
  }
  if (lower.includes('no such file') || lower.includes('does not contain any stream')) {
    return 'Dispositivo de captura não encontrado — verifique câmera/microfone.';
  }
  return raw;
}
