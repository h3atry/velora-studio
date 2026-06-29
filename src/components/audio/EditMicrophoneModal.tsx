import { ToggleSwitch, VolumeSlider } from '@/components/audio/AudioMixerParts';
import { useAudioStore } from '@/stores/audioStore';
import type { AutoSetting, MonitoringMode, NoiseSuppression } from '@/types/audio';
import { HelpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EditMicrophoneModal() {
  const editingId = useAudioStore((s) => s.editingMicId);
  const mic = useAudioStore((s) => s.microphones.find((m) => m.id === editingId));
  const updateMic = useAudioStore((s) => s.updateMic);
  const setEditingMicId = useAudioStore((s) => s.setEditingMicId);

  const [draft, setDraft] = useState(mic);

  useEffect(() => {
    if (mic) setDraft({ ...mic });
  }, [editingId, mic]);

  if (!editingId || !mic || !draft?.micSettings) return null;

  const settings = draft.micSettings;

  const save = () => {
    updateMic(editingId, draft);
    setEditingMicId(null);
  };

  return (
    <ModalShell title="Editar microfone" onClose={() => setEditingMicId(null)}>
      <Field label="Nome do microfone">
        <input
          className="input-field"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>

      <Field label="Dispositivo de microfone">
        <select
          className="input-field"
          value={settings.deviceId}
          onChange={(e) =>
            setDraft({
              ...draft,
              micSettings: { ...settings, deviceId: e.target.value },
            })
          }
        >
          <option value="default">Dispositivo padrão (Voicemeeter Out B1)</option>
        </select>
      </Field>

      <VolumeSlider
        icon="mic"
        value={draft.volume}
        onChange={(v) => setDraft({ ...draft, volume: v })}
      />

      <Field label="Supressão de ruído" help>
        <select
          className="input-field"
          value={settings.noiseSuppression}
          onChange={(e) =>
            setDraft({
              ...draft,
              micSettings: {
                ...settings,
                noiseSuppression: e.target.value as NoiseSuppression,
              },
            })
          }
        >
          <option value="off">Desligado</option>
          <option value="low">Baixo</option>
          <option value="medium">Médio</option>
          <option value="high">Alto</option>
        </select>
      </Field>

      <ToggleRow
        label="Converter para mono"
        help
        checked={settings.mono}
        onChange={(v) =>
          setDraft({ ...draft, micSettings: { ...settings, mono: v } })
        }
      />

      <ToggleRow
        label="Compensação do áudio"
        help
        checked={settings.audioCompensation}
        onChange={(v) =>
          setDraft({ ...draft, micSettings: { ...settings, audioCompensation: v } })
        }
      />

      <Field label="Monitoramento de áudio" help>
        <select
          className="input-field"
          value={settings.monitoring}
          onChange={(e) =>
            setDraft({
              ...draft,
              micSettings: {
                ...settings,
                monitoring: e.target.value as MonitoringMode,
              },
            })
          }
        >
          <option value="off">Tela desativada</option>
          <option value="monitor">Monitorar</option>
        </select>
      </Field>

      <Field label="Cancelamento de eco" help>
        <select
          className="input-field"
          value={settings.echoCancellation}
          onChange={(e) =>
            setDraft({
              ...draft,
              micSettings: {
                ...settings,
                echoCancellation: e.target.value as AutoSetting,
              },
            })
          }
        >
          <option value="auto">Automático (padrão)</option>
          <option value="on">Ativado</option>
          <option value="off">Desativado</option>
        </select>
      </Field>

      <Field label="Processamento do sinal de áudio" help>
        <select
          className="input-field"
          value={settings.signalProcessing}
          onChange={(e) =>
            setDraft({
              ...draft,
              micSettings: {
                ...settings,
                signalProcessing: e.target.value as AutoSetting,
              },
            })
          }
        >
          <option value="auto">Automático (sugerido)</option>
          <option value="on">Ativado</option>
          <option value="off">Desativado</option>
        </select>
      </Field>

      <footer className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          className="rounded-lg btn-brand px-6 py-2 text-sm"
        >
          Salvar
        </button>
      </footer>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-pl-border bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-pl-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-pl-muted hover:text-white">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] text-pl-muted">
        {label}
        {help && <HelpCircle size={10} className="opacity-60" />}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1 text-xs text-white">
        {label}
        {help && <HelpCircle size={10} className="text-pl-muted" />}
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}
