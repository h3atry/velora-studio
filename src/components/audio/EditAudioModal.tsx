import { ToggleSwitch, VolumeSlider } from '@/components/audio/AudioMixerParts';
import { useAudioStore } from '@/stores/audioStore';
import type { MonitoringMode } from '@/types/audio';
import { HelpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EditAudioModal() {
  const editingId = useAudioStore((s) => s.editingAudioId);
  const audio = useAudioStore((s) => s.desktopAudio.find((a) => a.id === editingId));
  const updateDesktop = useAudioStore((s) => s.updateDesktop);
  const removeDesktopAudio = useAudioStore((s) => s.removeDesktopAudio);
  const setEditingAudioId = useAudioStore((s) => s.setEditingAudioId);

  const [draft, setDraft] = useState(audio);

  useEffect(() => {
    if (audio) setDraft({ ...audio });
  }, [editingId, audio]);

  if (!editingId || !audio || !draft?.desktopSettings) return null;

  const settings = draft.desktopSettings;

  const save = () => {
    updateDesktop(editingId, draft);
    setEditingAudioId(null);
  };

  const remove = () => {
    removeDesktopAudio(editingId);
    setEditingAudioId(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-pl-border bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-pl-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Editar áudio</h2>
          <button
            type="button"
            onClick={() => setEditingAudioId(null)}
            className="text-pl-muted hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] text-pl-muted">Nome do alto-falante</span>
            <input
              className="input-field"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] text-pl-muted">
              Origem do áudio
              <HelpCircle size={10} className="opacity-60" />
            </span>
            <select
              className="input-field"
              value={settings.deviceId}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  desktopSettings: { ...settings, deviceId: e.target.value },
                })
              }
            >
              <option value="default">Dispositivo padrão (Voicemeeter Input)</option>
            </select>
          </label>

          <VolumeSlider
            value={draft.volume}
            onChange={(v) => setDraft({ ...draft, volume: v })}
          />

          <ToggleField
            label="Converter para mono"
            checked={settings.mono}
            onChange={(v) =>
              setDraft({ ...draft, desktopSettings: { ...settings, mono: v } })
            }
          />

          <ToggleField
            label="Compensação do áudio"
            checked={settings.audioCompensation}
            onChange={(v) =>
              setDraft({ ...draft, desktopSettings: { ...settings, audioCompensation: v } })
            }
          />

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] text-pl-muted">
              Monitoramento de áudio
              <HelpCircle size={10} className="opacity-60" />
            </span>
            <select
              className="input-field"
              value={settings.monitoring}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  desktopSettings: {
                    ...settings,
                    monitoring: e.target.value as MonitoringMode,
                  },
                })
              }
            >
              <option value="off">Tela desativada</option>
              <option value="monitor">Monitorar</option>
            </select>
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t border-pl-border px-4 py-3">
          <button
            type="button"
            onClick={remove}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
          >
            Excluir áudio
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg btn-brand px-6 py-2 text-sm"
          >
            Salvar
          </button>
        </footer>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1 text-xs text-white">
        {label}
        <HelpCircle size={10} className="text-pl-muted" />
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}
