import type { VideoSettings } from '@/types';

interface VideoSettingsSectionProps {
  settings: VideoSettings;
  editOpen: boolean;
  onEditOpen: (open: boolean) => void;
  onChange: (settings: VideoSettings) => void;
}

export function VideoSettingsSection({
  settings,
  editOpen,
  onEditOpen,
  onChange,
}: VideoSettingsSectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Configurações de vídeo</h3>
        <button
          type="button"
          onClick={() => onEditOpen(!editOpen)}
          className="text-xs text-pl-muted hover:text-white"
        >
          {editOpen ? 'Fechar' : 'Editar'}
        </button>
      </div>

      {editOpen ? (
        <div className="space-y-3 rounded-lg bg-zinc-800 p-3">
          <Field label="Resolução">
            <select
              className="input-field"
              value={settings.resolution}
              onChange={(e) => onChange({ ...settings, resolution: e.target.value })}
            >
              <option value="1920×1080">1920×1080</option>
              <option value="1280×720">1280×720</option>
              <option value="1080×1920">1080×1920 (retrato)</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="FPS">
              <input
                type="number"
                className="input-field"
                value={settings.fps}
                onChange={(e) => onChange({ ...settings, fps: Number(e.target.value) })}
              />
            </Field>
            <Field label="Vídeo (kbps)">
              <input
                type="number"
                className="input-field"
                value={settings.videoBitrate}
                onChange={(e) =>
                  onChange({ ...settings, videoBitrate: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Áudio (kbps)">
              <input
                type="number"
                className="input-field"
                value={settings.audioBitrate}
                onChange={(e) =>
                  onChange({ ...settings, audioBitrate: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </div>
      ) : (
        <dl className="space-y-2 rounded-lg bg-zinc-800 px-4 py-3 text-sm">
          <Row label="Resolução" value={settings.resolution} />
          <Row label="FPS" value={String(settings.fps)} />
          <Row label="Taxa de bits do vídeo" value={String(settings.videoBitrate)} />
          <Row label="Taxa de bits de áudio" value={String(settings.audioBitrate)} />
        </dl>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-pl-muted">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-pl-muted">{label}</span>
      {children}
    </label>
  );
}
