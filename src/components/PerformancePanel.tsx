import { useAppStore } from '@/stores/appStore';
import { Diamond, Eye, Heart, UserPlus, Wallet } from 'lucide-react';

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function PerformancePanel() {
  const isLive = useAppStore((s) => s.isLive);
  const perf = useAppStore((s) => s.livePerformance);

  const totalViewers = perf.tiktokViewers + perf.twitchViewers;
  const estimatedUsd = perf.tiktokDiamonds * 0.005;

  const stats = [
    {
      icon: Diamond,
      label: 'Diamantes',
      value: isLive ? formatNumber(perf.tiktokDiamonds) : '—',
    },
    {
      icon: Wallet,
      label: 'Estimado USD',
      value: isLive ? `$${estimatedUsd.toFixed(2)}` : '—',
    },
    {
      icon: Eye,
      label: 'Espectadores',
      value: isLive ? formatNumber(totalViewers) : '—',
    },
    {
      icon: UserPlus,
      label: 'TikTok / Twitch',
      value: isLive ? `${perf.tiktokViewers} / ${perf.twitchViewers}` : '—',
    },
    {
      icon: Heart,
      label: 'Curtidas',
      value: isLive ? formatNumber(perf.tiktokLikes) : '—',
    },
  ];

  return (
    <section className="shrink-0 border-b border-pl-border p-3">
      <h3 className="pl-section-label mb-2">Desempenho da LIVE</h3>
      <div className="space-y-2">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-pl-muted">
              <Icon size={12} />
              {label}
            </span>
            <span className="font-medium text-pl-text">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
