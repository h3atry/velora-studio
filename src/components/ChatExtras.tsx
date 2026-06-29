import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

export function ChatFiltersModal() {
  const [open, setOpen] = useState(false);
  const [blockedWords, setBlockedWords] = useState('');
  const [followersOnly, setFollowersOnly] = useState(false);

  useEffect(() => {
    if (!open || !window.electronAPI?.chatFiltersGet) return;
    void window.electronAPI.chatFiltersGet().then((f: { blockedWords: string[]; followersOnly: boolean }) => {
      setBlockedWords(f.blockedWords.join(', '));
      setFollowersOnly(f.followersOnly);
    });
  }, [open]);

  const save = async () => {
    const api = window.electronAPI;
    if (!api?.chatFiltersSet) return;
    const words = blockedWords
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    await api.chatFiltersSet({ blockedWords: words, followersOnly });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        title="Filtros de chat"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-pl-text"
      >
        <Filter size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-pl-border pl-panel-solid p-4">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-pl-text">Filtros de chat</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-pl-muted">
                <X size={16} />
              </button>
            </header>
            <label className="mb-3 block text-xs text-pl-muted">
              Palavras bloqueadas (vírgula)
              <input
                className="input-field mt-1"
                value={blockedWords}
                onChange={(e) => setBlockedWords(e.target.value)}
                placeholder="spam, link, ..."
              />
            </label>
            <label className="mb-4 flex items-center gap-2 text-xs text-pl-text">
              <input
                type="checkbox"
                checked={followersOnly}
                onChange={(e) => setFollowersOnly(e.target.checked)}
              />
              Apenas seguidores / fans (Twitch: follower badge · TikTok: fan)
            </label>
            <button type="button" onClick={save} className="btn-brand w-full rounded-lg py-2 text-xs">
              Salvar filtros
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function AlertToast() {
  const [queue, setQueue] = useState<{ title: string; message: string }[]>([]);
  const alert = queue[0] ?? null;

  useEffect(() => {
    if (!window.electronAPI?.onAlertReceived) return;
    return window.electronAPI.onAlertReceived((a) => {
      const item = a as { title?: string; message?: string };
      setQueue((q) => [
        ...q,
        { title: String(item.title ?? 'Alerta'), message: String(item.message ?? '') },
      ]);
    });
  }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 8000);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;

  return (
    <div className="fixed bottom-16 right-4 z-[80] max-w-xs rounded-lg border border-pl-primary/50 bg-pl-elevated p-3 shadow-pl-glow">
      <p className="text-xs font-semibold text-pl-accent">{alert.title}</p>
      {alert.message && <p className="mt-1 text-[11px] text-pl-muted">{alert.message}</p>}
      {queue.length > 1 && (
        <p className="mt-1 text-[10px] text-pl-dim">+{queue.length - 1} na fila</p>
      )}
    </div>
  );
}

export function AppToast() {
  const toast = useAppStore((s) => s.toast);
  const setToast = useAppStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-[85] max-w-md -translate-x-1/2 rounded-lg border border-pl-border bg-pl-elevated px-4 py-2.5 text-center text-xs text-pl-text shadow-lg">
      {toast}
    </div>
  );
}

export function ChatSendBar() {
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<'twitch' | 'tiktok'>('twitch');
  const chatSound = useAppStore((s) => s.chatSound);

  const send = async () => {
    if (!text.trim() || !window.electronAPI?.chatSend) return;
    if (platform === 'tiktok') return;
    const res = (await window.electronAPI.chatSend(platform, text.trim())) as {
      ok: boolean;
      error?: string;
    };
    if (res.ok) setText('');
    else if (res.error) alert(res.error);
  };

  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-pl-border p-2">
      <div className="flex gap-2">
        <select
          className="input-field w-24 py-1"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as 'twitch' | 'tiktok')}
        >
          <option value="twitch">Twitch</option>
          <option value="tiktok" disabled>
            TikTok (não suportado)
          </option>
        </select>
        <input
          className="input-field flex-1 py-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={platform === 'tiktok' ? 'Envio TikTok indisponível' : 'Enviar no Twitch…'}
          disabled={platform === 'tiktok'}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={platform === 'tiktok'}
          className="btn-brand rounded-lg px-3 text-xs disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
      {chatSound && (
        <p className="text-[9px] text-pl-dim">Som de chat ativo nas configurações</p>
      )}
    </div>
  );
}
