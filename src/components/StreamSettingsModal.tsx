import { PlatformConnectSection } from '@/components/PlatformConnectSection';
import { useStreamControl } from '@/hooks/useStream';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useCameraDevices } from '@/hooks/useCamera';
import { useHasEnabledCamera } from '@/hooks/useSceneSources';
import { useAppStore } from '@/stores/appStore';
import type { Platform } from '@/types';
import { X } from 'lucide-react';

export function StreamSettingsModal() {
  const show = useAppStore((s) => s.showStreamSettings);
  const setShow = useAppStore((s) => s.setShowStreamSettings);
  const streamSettings = useAppStore((s) => s.streamSettings);
  const updateStreamSettings = useAppStore((s) => s.updateStreamSettings);
  const updateDestination = useAppStore((s) => s.updateDestination);
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);
  const previewOffDuringLive = useAppStore((s) => s.previewOffDuringLive);
  const setPreviewOffDuringLive = useAppStore((s) => s.setPreviewOffDuringLive);
  const { devices, needsPermission, requestPermission } = useCameraDevices(show);
  const hasCameraSource = useHasEnabledCamera();
  const { testStream } = useStreamControl();
  const streamTestPending = useAppStore((s) => s.streamTestPending);

  const applyPreset = async (platform: 'tiktok' | 'twitch') => {
    const presets = (await window.electronAPI?.streamPresets?.()) as
      | Record<string, { fps: number; bitrateKbps: number }>
      | undefined;
    const preset = presets?.[platform];
    if (!preset) return;
    updateStreamSettings({ fps: preset.fps, bitrateKbps: preset.bitrateKbps });
    setPreviewMode(platform === 'tiktok' ? 'portrait' : 'landscape');
  };

  if (!show) return null;

  const cameras = devices.filter((d) => d.kind === 'video');
  const audios = devices.filter((d) => d.kind === 'audio');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-pl-border pl-panel-solid shadow-2xl">
        <header className="flex items-center justify-between border-b border-pl-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Configurações de transmissão</h2>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {!hasCameraSource ? (
            <p className="rounded-lg border border-pl-border bg-pl-bg p-3 text-[11px] text-pl-muted">
              Adicione a origem <strong className="text-pl-text">Câmera</strong> na cena para configurar
              dispositivos de vídeo. Sem câmera no layout, o app não solicita acesso ao hardware.
            </p>
          ) : (
            <>
              <Field label="Câmera">
                {needsPermission ? (
                  <button
                    type="button"
                    onClick={() => void requestPermission()}
                    className="btn-brand-outline w-full rounded-lg py-2 text-xs"
                  >
                    Permitir acesso à câmera
                  </button>
                ) : (
                  <select
                    className="input-field"
                    value={streamSettings.cameraDeviceId}
                    onChange={(e) => {
                      const device = cameras.find((c) => c.deviceId === e.target.value);
                      updateStreamSettings({
                        cameraDeviceId: e.target.value,
                        cameraLabel: device?.ffmpegName ?? '',
                      });
                    }}
                  >
                    {cameras.length === 0 && (
                      <option value="">Nenhuma câmera detectada</option>
                    )}
                    {cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Microfone">
                <select
                  className="input-field"
                  value={streamSettings.audioLabel}
                  onChange={(e) => updateStreamSettings({ audioLabel: e.target.value })}
                >
                  <option value="">Padrão do sistema</option>
                  {audios.map((mic) => (
                    <option key={mic.deviceId} value={mic.ffmpegName}>
                      {mic.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="FPS">
              <select
                className="input-field"
                value={streamSettings.fps}
                onChange={(e) => updateStreamSettings({ fps: Number(e.target.value) })}
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </Field>
            <Field label="Bitrate (kbps)">
              <input
                type="number"
                className="input-field"
                value={streamSettings.bitrateKbps}
                onChange={(e) =>
                  updateStreamSettings({ bitrateKbps: Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void applyPreset('tiktok')}
              className="btn-brand-outline flex-1 rounded-lg py-2 text-[10px]"
            >
              Preset TikTok
            </button>
            <button
              type="button"
              onClick={() => void applyPreset('twitch')}
              className="btn-brand-outline flex-1 rounded-lg py-2 text-[10px]"
            >
              Preset Twitch
            </button>
          </div>

          <PlatformConnectSection />

          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-[11px] text-amber-200">
            <strong>TikTok:</strong> após OAuth, cole a stream key manualmente do{' '}
            <a
              href="https://www.tiktok.com/studio/download"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              TikTok LIVE Studio
            </a>
            . A API não expõe a key automaticamente.
          </div>

          <label className="flex items-center gap-2 text-xs text-pl-text">
            <input
              type="checkbox"
              checked={previewOffDuringLive}
              onChange={(e) => setPreviewOffDuringLive(e.target.checked)}
            />
            Preview OFF durante LIVE (libera câmera para FFmpeg)
          </label>

          <label className="flex items-center gap-2 text-xs text-pl-text">
            <input
              type="checkbox"
              checked={streamSettings.recordLocal}
              onChange={(e) => updateStreamSettings({ recordLocal: e.target.checked })}
            />
            Gravar local (.mp4 em Vídeos/Velora)
          </label>

          <label className="flex items-center gap-2 text-xs text-pl-text">
            <input
              type="checkbox"
              checked={streamSettings.desktopAudio}
              onChange={(e) => updateStreamSettings({ desktopAudio: e.target.checked })}
            />
            Capturar áudio desktop (experimental)
          </label>

          <div className="space-y-3">
            <p className="text-xs font-medium text-white">Destinos RTMP (manual)</p>
            {streamSettings.destinations.map((dest) => (
              <DestinationFields
                key={dest.platform}
                platform={dest.platform}
                enabled={dest.enabled}
                rtmpUrl={dest.rtmpUrl}
                streamKey={dest.streamKey}
                onChange={(patch) => updateDestination(dest.platform, patch)}
              />
            ))}
          </div>

          <p className="text-[10px] text-pl-muted">
            Conecte as contas acima para preencher stream keys automaticamente (Twitch) ou
            username + key manual (TikTok). Chat usa os mesmos usernames ao iniciar a LIVE.
          </p>

          <button
            type="button"
            onClick={() => void testStream()}
            disabled={streamTestPending}
            className="btn-brand-outline w-full rounded-lg py-2 text-xs disabled:opacity-50"
          >
            {streamTestPending ? 'Testando RTMP…' : 'Testar stream (validar keys)'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DestinationFields({
  platform,
  enabled,
  rtmpUrl,
  streamKey,
  onChange,
}: {
  platform: Platform;
  enabled: boolean;
  rtmpUrl: string;
  streamKey: string;
  onChange: (patch: {
    enabled?: boolean;
    rtmpUrl?: string;
    streamKey?: string;
  }) => void;
}) {
  const name = platform === 'tiktok' ? 'TikTok' : 'Twitch';
  const [showKey, setShowKey] = useState(false);

  const trimKey = (value: string) => value.trim().replace(/\s+/g, '');

  return (
    <div className="rounded-lg border border-pl-border bg-pl-bg p-3">
      <label className="mb-2 flex items-center gap-2 text-xs font-medium text-white">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="accent-pl-primary"
        />
        <PlatformIcon platform={platform} size={14} />
        {name}
      </label>
      <div className="space-y-2">
        <input
          type="text"
          className="input-field"
          placeholder="URL RTMP"
          value={rtmpUrl}
          onChange={(e) => onChange({ rtmpUrl: e.target.value.trim() })}
        />
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            className="input-field pr-16"
            placeholder="Stream key"
            value={streamKey}
            onChange={(e) => onChange({ streamKey: trimKey(e.target.value) })}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text');
              onChange({ streamKey: trimKey(text) });
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-pl-muted hover:text-pl-text"
          >
            {showKey ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-pl-muted">{label}</span>
      {children}
    </label>
  );
}
