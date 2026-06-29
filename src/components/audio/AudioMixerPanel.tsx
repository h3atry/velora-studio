import { GearMenu, ToggleSwitch, VolumeSlider } from '@/components/audio/AudioMixerParts';
import { useAudioStore } from '@/stores/audioStore';
import { ChevronDown, ChevronRight, Lock, LockOpen, Plus } from 'lucide-react';
import type { AudioChannel } from '@/types/audio';

interface AudioMixerPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function AudioMixerPanel({ anchorRef }: AudioMixerPanelProps) {
  const open = useAudioStore((s) => s.mixerOpen);
  const locked = useAudioStore((s) => s.mixerLocked);
  const testing = useAudioStore((s) => s.testingAudio);
  const microphones = useAudioStore((s) => s.microphones);
  const desktopAudio = useAudioStore((s) => s.desktopAudio);
  const mediaChannels = useAudioStore((s) => s.mediaChannels);
  const alertChannels = useAudioStore((s) => s.alertChannels);
  const advanced = useAudioStore((s) => s.advanced);

  const setMixerOpen = useAudioStore((s) => s.setMixerOpen);
  const setMixerLocked = useAudioStore((s) => s.setMixerLocked);
  const setTestingAudio = useAudioStore((s) => s.setTestingAudio);
  const updateMicVolume = useAudioStore((s) => s.updateMicVolume);
  const updateDesktopVolume = useAudioStore((s) => s.updateDesktopVolume);
  const updateMediaVolume = useAudioStore((s) => s.updateMediaVolume);
  const updateAlertVolume = useAudioStore((s) => s.updateAlertVolume);
  const addDesktopAudio = useAudioStore((s) => s.addDesktopAudio);
  const setEditingMicId = useAudioStore((s) => s.setEditingMicId);
  const setEditingAudioId = useAudioStore((s) => s.setEditingAudioId);
  const setEffectsChannelId = useAudioStore((s) => s.setEffectsChannelId);
  const updateAdvanced = useAudioStore((s) => s.updateAdvanced);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setMixerOpen(false)} />
      <div
        className="fixed z-50 w-80 rounded-xl border border-pl-border bg-zinc-900 shadow-2xl"
        style={{
          bottom: anchorRef.current
            ? window.innerHeight - anchorRef.current.getBoundingClientRect().top + 8
            : 80,
          left: anchorRef.current?.getBoundingClientRect().left ?? 16,
        }}
      >
        <header className="border-b border-pl-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Mixer de áudio</h2>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          <Section title="Microfones" onAdd={undefined}>
            {microphones.map((mic) => (
              <ChannelRow
                key={mic.id}
                channel={mic}
                locked={locked}
                onVolumeChange={(v) => updateMicVolume(mic.id, v)}
                onGeneralSettings={() => setEditingMicId(mic.id)}
                onAudioEffects={() => setEffectsChannelId(mic.id)}
                icon="mic"
              />
            ))}
          </Section>

          <Section title="Áudio" onAdd={locked ? undefined : addDesktopAudio} className="mt-4">
            {desktopAudio.map((audio) => (
              <ChannelRow
                key={audio.id}
                channel={audio}
                locked={locked}
                onVolumeChange={(v) => updateDesktopVolume(audio.id, v)}
                onGeneralSettings={() => setEditingAudioId(audio.id)}
                onAudioEffects={() => setEffectsChannelId(audio.id)}
                icon="speaker"
              />
            ))}
          </Section>

          <Section title="Mídia" className="mt-4">
            {mediaChannels.map((ch) => (
              <div key={ch.id} className="mb-3">
                <p className="mb-1.5 truncate text-xs text-white">{ch.name}</p>
                <VolumeSlider
                  value={ch.volume}
                  onChange={(v) => updateMediaVolume(ch.id, v)}
                  disabled={locked}
                />
              </div>
            ))}
          </Section>

          <Section title="Origens" className="mt-4">
            {alertChannels.map((ch) => (
              <div key={ch.id} className="mb-3">
                <p className="mb-1.5 truncate text-xs text-white">{ch.name}</p>
                <VolumeSlider
                  value={ch.volume}
                  onChange={(v) => updateAlertVolume(ch.id, v)}
                  disabled={locked}
                />
              </div>
            ))}
          </Section>

          <button
            type="button"
            onClick={() => updateAdvanced({ expanded: !advanced.expanded })}
            className="mt-2 flex w-full items-center gap-1 text-xs text-pl-muted hover:text-white"
          >
            {advanced.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Configurações avançadas
          </button>

          {advanced.expanded && (
            <div className="mt-3 space-y-3 border-t border-pl-border pt-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-pl-muted">
                  Alto-falante para criadores co-hosts
                </span>
                <select
                  className="input-field text-[11px]"
                  value={advanced.coHostSpeaker}
                  disabled={locked}
                  onChange={(e) => updateAdvanced({ coHostSpeaker: e.target.value })}
                >
                  <option value="Dispositivo padrão (Voicemeeter Input)">
                    Dispositivo padrão (Voicemeeter Input)
                  </option>
                  <option value="Dispositivo padrão (Alto-falantes)">
                    Dispositivo padrão (Alto-falantes)
                  </option>
                </select>
              </label>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white">Música de fundo</span>
                <ToggleSwitch
                  checked={advanced.backgroundMusicEnabled}
                  disabled={locked}
                  onChange={(v) => updateAdvanced({ backgroundMusicEnabled: v })}
                />
              </div>

              {advanced.backgroundMusicEnabled && (
                <>
                  <p className="text-[10px] leading-relaxed text-pl-muted">
                    Durante a LIVE com co-hosts ou convidados, permita que outros criadores ou
                    convidados ouçam a música de fundo reproduzida em seu computador.
                  </p>
                  <VolumeSlider
                    value={advanced.backgroundMusicVolume}
                    onChange={(v) => updateAdvanced({ backgroundMusicVolume: v })}
                    disabled={locked}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-pl-border px-4 py-3">
          <button
            type="button"
            title={locked ? 'Desbloquear mixer' : 'Bloquear mixer'}
            onClick={() => setMixerLocked(!locked)}
            className="rounded p-1.5 text-pl-muted hover:bg-pl-hover hover:text-white"
          >
            {locked ? <Lock size={16} /> : <LockOpen size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setTestingAudio(!testing)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              testing
                ? 'bg-pl-primary text-white'
                : 'bg-zinc-700 text-white hover:bg-zinc-600'
            }`}
          >
            {testing ? 'Parar teste' : 'Testar áudio'}
          </button>
        </footer>
      </div>
    </>
  );
}

function Section({
  title,
  onAdd,
  className = '',
  children,
}: {
  title: string;
  onAdd?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-pl-muted">{title}</h3>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-0.5 text-[11px] text-pl-muted hover:text-white"
          >
            <Plus size={12} />
            Adicionar
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function ChannelRow({
  channel,
  locked,
  onVolumeChange,
  onGeneralSettings,
  onAudioEffects,
  icon,
}: {
  channel: AudioChannel;
  locked: boolean;
  onVolumeChange: (v: number) => void;
  onGeneralSettings: () => void;
  onAudioEffects: () => void;
  icon: 'mic' | 'speaker';
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-xs text-white" title={channel.name}>
          {channel.name}
        </p>
        {!locked && (
          <GearMenu onGeneralSettings={onGeneralSettings} onAudioEffects={onAudioEffects} />
        )}
      </div>
      <VolumeSlider
        icon={icon}
        value={channel.muted ? 0 : channel.volume}
        level={channel.muted ? 0 : channel.level}
        onChange={onVolumeChange}
        disabled={locked}
      />
    </div>
  );
}
