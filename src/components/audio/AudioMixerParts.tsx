import { Mic, Settings, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VolumeSliderProps {
  value: number;
  level?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  icon?: 'mic' | 'speaker';
}

export function VolumeSlider({
  value,
  level = 0,
  onChange,
  disabled,
  icon = 'speaker',
}: VolumeSliderProps) {
  const Icon = icon === 'mic' ? Mic : Volume2;
  const pct = Math.min(200, Math.max(0, value));
  const levelPct = Math.min(100, Math.max(0, level));

  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="shrink-0 text-pl-muted" />
      <div className="relative h-1.5 flex-1 rounded-full bg-zinc-700">
        {levelPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-green-500/80 transition-all duration-75"
            style={{ width: `${(levelPct / 200) * pct}%` }}
          />
        )}
        <input
          type="range"
          min={0}
          max={200}
          value={pct}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
      <span className="w-10 shrink-0 text-right text-[11px] text-pl-muted">{pct}%</span>
    </div>
  );
}

interface GearMenuProps {
  onGeneralSettings: () => void;
  onAudioEffects: () => void;
}

export function GearMenu({ onGeneralSettings, onAudioEffects }: GearMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Configurações"
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-white"
      >
        <Settings size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-pl-border bg-zinc-800 py-1 shadow-xl">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-pl-hover"
            onClick={() => {
              setOpen(false);
              onGeneralSettings();
            }}
          >
            Configurações gerais
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-pl-hover"
            onClick={() => {
              setOpen(false);
              onAudioEffects();
            }}
          >
            Efeitos de áudio
          </button>
        </div>
      )}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-green-600' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'left-4' : 'left-0.5'
        }`}
      />
    </button>
  );
}
