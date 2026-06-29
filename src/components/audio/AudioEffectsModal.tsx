import { useAudioStore } from '@/stores/audioStore';
import { AUDIO_EFFECT_PRESETS, type AudioEffectsTab } from '@/types/audio';
import { Ban, X } from 'lucide-react';
import { useState } from 'react';

export function AudioEffectsModal() {
  const channelId = useAudioStore((s) => s.effectsChannelId);
  const mic = useAudioStore((s) => s.microphones.find((m) => m.id === channelId));
  const desktop = useAudioStore((s) => s.desktopAudio.find((a) => a.id === channelId));
  const updateMic = useAudioStore((s) => s.updateMic);
  const updateDesktop = useAudioStore((s) => s.updateDesktop);
  const setEffectsChannelId = useAudioStore((s) => s.setEffectsChannelId);
  const testing = useAudioStore((s) => s.testingAudio);
  const setTestingAudio = useAudioStore((s) => s.setTestingAudio);

  const channel = mic ?? desktop;
  const [tab, setTab] = useState<AudioEffectsTab>('models');

  if (!channelId || !channel) return null;

  const preset =
    channel.micSettings?.effectPreset ?? channel.desktopSettings?.effectPreset ?? 'none';

  const setPreset = (id: string) => {
    if (mic?.micSettings) {
      updateMic(channelId, {
        micSettings: { ...mic.micSettings, effectPreset: id },
      });
    } else if (desktop?.desktopSettings) {
      updateDesktop(channelId, {
        desktopSettings: { ...desktop.desktopSettings, effectPreset: id },
      });
    }
  };

  const displayName = channel.name.length > 28 ? `${channel.name.slice(0, 28)}…` : channel.name;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-pl-border bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-pl-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Efeitos de áudio</h2>
          <button
            type="button"
            onClick={() => setEffectsChannelId(null)}
            className="text-pl-muted hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex items-center justify-between gap-3 border-b border-pl-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-white" title={channel.name}>
            {displayName}
          </p>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTestingAudio(!testing)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                testing
                  ? 'bg-pl-primary text-white'
                  : 'bg-zinc-700 text-pl-muted'
              }`}
            >
              Testar áudio
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {(['models', 'equalizer', 'reverb'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              {t === 'models' ? 'Modelos' : t === 'equalizer' ? 'Equalizador' : 'Reverb'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'models' && (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPreset('none')}
                className={`flex h-14 items-center justify-center rounded-lg border bg-zinc-800 transition-colors hover:bg-zinc-700 ${
                  preset === 'none' ? 'border-white' : 'border-transparent'
                }`}
              >
                <Ban size={20} className="text-pl-muted" />
              </button>
              {AUDIO_EFFECT_PRESETS.filter((p) => p.id !== 'none').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`flex h-14 items-center justify-center rounded-lg border bg-zinc-800 px-1 text-center text-[10px] leading-tight text-white transition-colors hover:bg-zinc-700 ${
                    preset === p.id ? 'border-white' : 'border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {tab === 'equalizer' && (
            <p className="py-8 text-center text-xs text-pl-muted">
              Equalizador — em breve (requer processamento de áudio nativo)
            </p>
          )}

          {tab === 'reverb' && (
            <p className="py-8 text-center text-xs text-pl-muted">
              Reverb — em breve (requer processamento de áudio nativo)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
