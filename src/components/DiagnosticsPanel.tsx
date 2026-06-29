import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Copy, FolderOpen, X } from 'lucide-react';

interface DiagnosticsData {
  version: string;
  packaged: boolean;
  userData: string;
  logFile: string;
  ffmpeg: boolean;
  alertsPort: number;
  oauthConfigured?: { twitch: boolean; tiktok: boolean };
  relay?: { note: string };
}

export function DiagnosticsPanel() {
  const show = useAppStore((s) => s.showDiagnostics);
  const setShow = useAppStore((s) => s.setShowDiagnostics);
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState<boolean | null>(null);
  const [fullJson, setFullJson] = useState('');

  useEffect(() => {
    const api = window.electronAPI;
    if (!show || !api?.diagnostics) return;
    void (async () => {
      const d = (await api.diagnostics!()) as unknown as DiagnosticsData;
      setData(d);
      if (api.ffmpegAvailable) {
        setFfmpegOk(await api.ffmpegAvailable());
      }
      const oauth = {
        twitch: api.authOAuthConfigured ? await api.authOAuthConfigured('twitch') : false,
        tiktok: api.authOAuthConfigured ? await api.authOAuthConfigured('tiktok') : false,
      };
      setFullJson(
        JSON.stringify({ ...d, ffmpegRuntime: ffmpegOk, oauthConfigured: oauth }, null, 2)
      );
    })();
  }, [show, ffmpegOk]);

  if (!show) return null;

  const missingOAuth = data?.oauthConfigured && !data.oauthConfigured.twitch && !data.oauthConfigured.tiktok;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-pl-border pl-panel-solid p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-pl-text">Diagnóstico (Ctrl+Shift+D)</h2>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded p-1 text-pl-muted hover:text-pl-text"
          >
            <X size={16} />
          </button>
        </header>

        {missingOAuth && (
          <div className="mb-3 rounded-lg border border-pl-warning/40 bg-pl-warning/10 px-3 py-2 text-[11px] text-pl-warning">
            OAuth não configurado — copie `.env.example` para `.env` na pasta do Velora.
          </div>
        )}

        {data ? (
          <dl className="space-y-2 font-mono text-[11px]">
            <Row label="Versão" value={data.version} />
            <Row label="Empacotado" value={String(data.packaged)} />
            <Row label="FFmpeg" value={ffmpegOk === false ? 'AUSENTE' : data.ffmpeg ? 'OK' : '?'} />
            <Row label="userData" value={data.userData} />
            <Row label="Log" value={data.logFile} />
            <Row label="Alertas webhook" value={`127.0.0.1:${data.alertsPort}/webhook`} />
            {data.relay?.note && <Row label="Relay" value={data.relay.note} />}
          </dl>
        ) : (
          <p className="text-xs text-pl-muted">Carregando…</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {data?.logFile && (
            <>
              <button
                type="button"
                className="btn-brand-outline flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs"
                onClick={() => navigator.clipboard.writeText(data.logFile)}
              >
                <Copy size={12} />
                Copiar caminho do log
              </button>
              <button
                type="button"
                className="btn-brand-outline flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs"
                onClick={() => void window.electronAPI?.openLogsFolder?.()}
              >
                <FolderOpen size={12} />
                Abrir pasta de logs
              </button>
            </>
          )}
          <button
            type="button"
            className="btn-brand-outline flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs"
            onClick={() => navigator.clipboard.writeText(fullJson || '{}')}
          >
            <Copy size={12} />
            Copiar JSON debug completo
          </button>
        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-pl-dim">
          Atalhos: Ctrl+L LIVE · Ctrl+M mute mic · Ctrl+, transmissão · Esc cancela countdown
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-pl-border/50 py-1.5">
      <dt className="text-pl-muted">{label}</dt>
      <dd className="break-all text-pl-text">{value}</dd>
    </div>
  );
}
