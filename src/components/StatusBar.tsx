import { useAppStore } from '@/stores/appStore';

export function StatusBar() {
  const stats = useAppStore((s) => s.stats);
  const isLive = useAppStore((s) => s.isLive);

  return (
    <footer className="flex shrink-0 items-center gap-6 border-t border-pl-border bg-pl-surface px-4 py-1.5 font-mono text-[11px] text-pl-muted">
      <Stat label="CPU" value={`${stats.cpu.toFixed(2)}%`} />
      <Stat label="Memória" value={`${stats.memory.toFixed(2)}%`} />
      <Stat
        label="Upload"
        value={isLive ? `${stats.uploadKbps} kbps` : '0 kbps'}
        highlight={isLive}
        warn={Boolean(stats.bitrateWarning)}
      />
      {stats.bitrateWarning && (
        <span className="text-pl-warning" title={stats.bitrateWarning}>
          ⚠ bitrate
        </span>
      )}
      <Stat
        label="Frames perdidos"
        value={`${stats.droppedFrames}/${stats.totalFrames}`}
      />
      <Stat label="FPS" value={String(stats.fps)} />
    </footer>
  );
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <span>
      {label}:{' '}
      <span
        className={
          warn ? 'text-pl-warning' : highlight ? 'text-pl-success' : 'text-pl-text'
        }
      >
        {value}
      </span>
    </span>
  );
}
