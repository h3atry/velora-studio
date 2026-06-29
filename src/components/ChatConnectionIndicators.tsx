import { PlatformIcon } from '@/components/PlatformIcon';
import { useAppStore } from '@/stores/appStore';
import type { PlatformConnectionState } from '@/types';

const statusColors: Record<PlatformConnectionState, string> = {
  disconnected: 'bg-zinc-600',
  connecting: 'bg-yellow-500 animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-red-500',
};

const statusLabels: Record<PlatformConnectionState, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Erro',
};

export function ChatConnectionIndicators() {
  const chatStatus = useAppStore((s) => s.chatStatus);
  const isLive = useAppStore((s) => s.isLive);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-2">
      <Indicator
        platform="tiktok"
        state={chatStatus.tiktok}
        error={chatStatus.tiktokError}
      />
      <Indicator
        platform="twitch"
        state={chatStatus.twitch}
        error={chatStatus.twitchError}
      />
    </div>
  );
}

function Indicator({
  platform,
  state,
  error,
}: {
  platform: 'tiktok' | 'twitch';
  state: PlatformConnectionState;
  error?: string;
}) {
  const name = platform === 'tiktok' ? 'TikTok' : 'Twitch';
  const title = error
    ? `${name} — erro: ${error}`
    : `${name}: ${statusLabels[state]}`;

  return (
    <div
      className="group relative flex items-center gap-1"
      title={title}
      aria-label={title}
    >
      <PlatformIcon platform={platform} size={10} />
      <span className={`h-1.5 w-1.5 rounded-full ${statusColors[state]}`} />
      {error && state === 'error' && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-48 -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-[9px] text-red-300 shadow-lg group-hover:block">
          {error}
        </span>
      )}
    </div>
  );
}
