import { Copy, RefreshCw, Smartphone, Wifi, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MobileChatInfo {
  running: boolean;
  port: number;
  ip: string;
  url: string;
  clientCount: number;
  token: string;
  bindError?: string | null;
}

export function MobileChatLinkPopover() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<MobileChatInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.electronAPI?.mobileChatGetInfo) return;
    const data = await window.electronAPI.mobileChatGetInfo();
    setInfo(data as MobileChatInfo);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !info?.url || !window.electronAPI?.mobileChatGetQrDataUrl) {
      setQrDataUrl(null);
      setQrError(false);
      return;
    }

    let cancelled = false;
    setQrDataUrl(null);
    setQrError(false);

    void window.electronAPI
      .mobileChatGetQrDataUrl(info.url)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open, info?.url]);

  const handleRegenerateToken = async () => {
    if (!window.electronAPI?.mobileChatRegenerateToken) return;
    setRegenerating(true);
    try {
      const data = await window.electronAPI.mobileChatRegenerateToken();
      setInfo(data as MobileChatInfo);
      setQrDataUrl(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!info?.url) return;
    await navigator.clipboard.writeText(info.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modal =
    open &&
    createPortal(
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Fechar"
          className="absolute inset-0 bg-black/60"
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-chat-title"
          className="relative z-[251] w-full max-w-sm rounded-xl border border-pl-border bg-pl-elevated p-4 shadow-2xl"
        >
          <header className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wifi size={16} className="shrink-0 text-pl-accent" />
              <div>
                <h3 id="mobile-chat-title" className="text-sm font-semibold text-pl-text">
                  Chat no celular
                </h3>
                <p className="text-[10px] text-pl-muted">Mesma Wi‑Fi · Safari no iPhone</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-pl-text"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </header>

          <p className="mb-3 text-[11px] leading-relaxed text-pl-muted">
            Escaneie o QR ou copie o link. Mensagens chegam em tempo real, direto do encoder de
            chat.
          </p>

          {info?.running && info.url ? (
            <>
              <div className="mb-3 flex justify-center rounded-lg border border-pl-border bg-white p-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code para chat mobile" width={200} height={200} />
                ) : qrError ? (
                  <p className="flex h-[200px] w-[200px] items-center justify-center text-center text-[11px] text-pl-danger">
                    Falha ao gerar QR
                  </p>
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center text-[11px] text-pl-muted">
                    Gerando QR…
                  </div>
                )}
              </div>

              <div className="rounded-md border border-pl-border bg-pl-bg px-2.5 py-2">
                <p className="break-all font-mono text-[11px] text-pl-accent">{info.url}</p>
                <p className="mt-1 text-[10px] text-pl-dim">Porta {info.port}</p>
                {info.clientCount > 0 && (
                  <p className="mt-1 text-[10px] text-pl-success">
                    {info.clientCount} dispositivo{info.clientCount > 1 ? 's' : ''} conectado
                    {info.clientCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="btn-brand mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs"
              >
                <Copy size={12} />
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>

              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-pl-border py-2 text-xs text-pl-muted hover:bg-pl-hover hover:text-pl-text disabled:opacity-50"
              >
                <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                {regenerating ? 'Gerando novo token…' : 'Novo token de acesso'}
              </button>

              <p className="mt-3 text-[10px] leading-relaxed text-pl-dim">
                Se não abrir no iPhone, permita o Velora no Firewall do Windows (rede privada).
              </p>
            </>
          ) : (
            <p className="text-xs text-pl-danger">
              {info?.bindError ??
                'Servidor LAN indisponível — verifique Firewall do Windows (rede privada).'}
            </p>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        title="Chat no celular (rede local)"
        onClick={() => setOpen(true)}
        className={`rounded p-1 transition-colors ${
          open
            ? 'bg-pl-primary/20 text-pl-accent'
            : 'text-pl-muted hover:bg-pl-hover hover:text-pl-text'
        }`}
      >
        <Smartphone size={14} />
      </button>
      {modal}
    </>
  );
}
