import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CloudUpload, X } from 'lucide-react';
import { type SourceTypeId } from '@/data/sourceCatalog';
import type { SceneSource } from '@/stores/sceneStore';

type CaptureItem = {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnailDataUrl: string;
};

const FALLBACK_SCREEN: CaptureItem = {
  id: 'screen:0',
  name: 'Tela 1',
  type: 'screen',
  thumbnailDataUrl: '',
};

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return `file:///${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
}

export function ConfigureSourceForm({
  typeId,
  title,
  onClose,
  onBack,
  onConfirm,
}: {
  typeId: SourceTypeId;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  onConfirm: (config: Partial<Omit<SceneSource, 'id' | 'typeId' | 'enabled'>>) => void;
}) {
  const [captureItems, setCaptureItems] = useState<CaptureItem[]>([]);
  const [captureError, setCaptureError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [gameMode, setGameMode] = useState<'any-fullscreen' | 'specific'>('any-fullscreen');
  const [selectedWindowId, setSelectedWindowId] = useState('');
  const [manualWindowTitle, setManualWindowTitle] = useState('');
  const [selectedScreenId, setSelectedScreenId] = useState(FALLBACK_SCREEN.id);
  const [captureCursor, setCaptureCursor] = useState(false);
  const [compatibleMode, setCompatibleMode] = useState(false);

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(300);
  const [cameraDevices, setCameraDevices] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');

  const needsCaptureList = ['game-capture', 'screen-capture', 'window-capture'].includes(typeId);

  useEffect(() => {
    if (!needsCaptureList) return;
    setLoading(true);
    setCaptureError(false);
    void window.electronAPI?.captureListSources?.()
      .then((items) => {
        const list = items ?? [];
        setCaptureItems(list);
        setCaptureError(list.length === 0);
        const screens = list.filter((i) => i.type === 'screen');
        const wins = list.filter((i) => i.type === 'window' && i.name.trim());
        setSelectedScreenId(screens[0]?.id ?? FALLBACK_SCREEN.id);
        if (wins[0]) setSelectedWindowId(wins[0].id);
      })
      .catch(() => {
        setCaptureItems([]);
        setCaptureError(true);
        setSelectedScreenId(FALLBACK_SCREEN.id);
      })
      .finally(() => setLoading(false));
  }, [needsCaptureList]);

  useEffect(() => {
    if (typeId !== 'camera') return;
    void window.electronAPI?.listMediaDevices?.().then((devices) => {
      const cams = (devices ?? [])
        .filter((d) => d.kind === 'video')
        .map((d) => ({ id: d.deviceId, label: d.label || d.deviceId }));
      setCameraDevices(cams);
      if (cams[0]) setSelectedCamera(cams[0].label);
    });
  }, [typeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const windows = useMemo(
    () => captureItems.filter((i) => i.type === 'window' && i.name.trim()),
    [captureItems]
  );

  const screens = useMemo(() => {
    const fromApi = captureItems.filter((i) => i.type === 'screen');
    return fromApi.length ? fromApi : [FALLBACK_SCREEN];
  }, [captureItems]);

  const selectedWindow = windows.find((w) => w.id === selectedWindowId);
  const selectedScreen = screens.find((s) => s.id === selectedScreenId) ?? FALLBACK_SCREEN;
  const windowTitle = selectedWindow?.name ?? manualWindowTitle.trim();

  const previewUrl =
    typeId === 'screen-capture'
      ? selectedScreen.thumbnailDataUrl
      : typeId === 'window-capture' || (typeId === 'game-capture' && gameMode === 'specific')
        ? selectedWindow?.thumbnailDataUrl
        : imagePath
          ? toFileUrl(imagePath)
          : '';

  const canConfirm = (() => {
    switch (typeId) {
      case 'game-capture':
        return gameMode === 'any-fullscreen' || Boolean(windowTitle);
      case 'screen-capture':
        return true;
      case 'window-capture':
        return Boolean(windowTitle);
      case 'image':
        return Boolean(imagePath);
      case 'video':
        return Boolean(videoPath);
      case 'text':
        return textContent.trim().length > 0;
      case 'link':
        return linkUrl.trim().length > 4;
      case 'camera':
        return cameraDevices.length === 0 || Boolean(selectedCamera);
      case 'countdown':
        return countdownSeconds > 0;
      default:
        return true;
    }
  })();

  const handleConfirm = () => {
    if (!canConfirm) return;

    const base: Partial<Omit<SceneSource, 'id' | 'typeId' | 'enabled'>> = {
      captureCursor,
      compatibleMode,
    };

    switch (typeId) {
      case 'game-capture':
        onConfirm({
          ...base,
          captureMode: gameMode,
          captureTarget: gameMode === 'specific' ? windowTitle : 'fullscreen',
          captureSourceId: gameMode === 'specific' ? selectedWindowId || undefined : undefined,
          name: gameMode === 'specific' ? windowTitle : 'Captura de jogo',
        });
        break;
      case 'screen-capture':
        onConfirm({
          ...base,
          captureTarget: selectedScreen.name || 'desktop',
          captureSourceId: selectedScreen.id,
          screenIndex: screens.findIndex((s) => s.id === selectedScreenId),
          name: selectedScreen.name || 'Captura de tela',
        });
        break;
      case 'window-capture':
        onConfirm({
          ...base,
          captureTarget: windowTitle,
          captureSourceId: selectedWindowId || undefined,
          name: windowTitle || 'Captura de janela',
        });
        break;
      case 'image':
        onConfirm({ imagePath: imagePath ?? undefined, name: imagePath?.split(/[/\\]/).pop() });
        break;
      case 'video':
        onConfirm({ videoPath: videoPath ?? undefined, name: videoPath?.split(/[/\\]/).pop() });
        break;
      case 'text':
        onConfirm({ textContent: textContent.trim(), name: textContent.trim().slice(0, 24) });
        break;
      case 'link':
        onConfirm({ linkUrl: linkUrl.trim(), name: 'Vincular' });
        break;
      case 'camera':
        onConfirm({
          deviceLabel: selectedCamera || 'Câmera',
          deviceId: cameraDevices.find((c) => c.label === selectedCamera)?.id,
          name: selectedCamera || 'Câmera',
        });
        break;
      case 'countdown':
        onConfirm({ countdownSeconds, name: `Contagem ${countdownSeconds}s` });
        break;
      default:
        onConfirm({});
    }
  };

  return (
    <div
      className="flex w-[min(560px,96vw)] flex-col overflow-hidden rounded-2xl border border-pl-border bg-[#14151c] shadow-2xl"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-center gap-2 border-b border-pl-border px-5 py-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-pl-muted hover:bg-pl-hover hover:text-pl-text"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="flex-1 text-base font-semibold text-pl-text">
          Adicionar {title.toLowerCase()}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-pl-muted hover:bg-pl-hover hover:text-pl-text"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {captureError && needsCaptureList && (
          <p className="mb-3 rounded-lg bg-amber-900/30 px-3 py-2 text-[11px] text-amber-200">
            Não foi possível listar janelas automaticamente. Digite o título da janela manualmente
            ou escolha captura de tela cheia.
          </p>
        )}

        {(typeId === 'game-capture' ||
          typeId === 'screen-capture' ||
          typeId === 'window-capture' ||
          typeId === 'image') && (
          <PreviewBox url={previewUrl} loading={loading} emptyLabel="Sem pré-visualização" />
        )}

        {typeId === 'game-capture' && (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg bg-[#1a1b24] p-1">
              <ModeTab
                active={gameMode === 'any-fullscreen'}
                onClick={() => setGameMode('any-fullscreen')}
                label="Qualquer jogo em tela cheia"
              />
              <ModeTab
                active={gameMode === 'specific'}
                onClick={() => setGameMode('specific')}
                label="Selecionar jogo"
              />
            </div>
            {gameMode === 'specific' &&
              (windows.length > 0 ? (
                <SelectField
                  label="Selecionar jogo"
                  value={selectedWindowId}
                  onChange={setSelectedWindowId}
                  options={windows.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder="Selecionar"
                />
              ) : (
                <TextField
                  label="Título da janela do jogo"
                  value={manualWindowTitle}
                  onChange={setManualWindowTitle}
                  placeholder="Ex.: VALORANT  , javaw.exe"
                />
              ))}
            <ToggleRow
              label="Modo compatível"
              hint="Melhor compatibilidade de jogo, mas pode afetar o desempenho"
              checked={compatibleMode}
              onChange={setCompatibleMode}
            />
          </div>
        )}

        {typeId === 'screen-capture' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-pl-text">Selecionar tela</p>
            {screens.map((s, i) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-pl-border bg-[#1a1b24] px-3 py-2"
              >
                <input
                  type="radio"
                  name="screen"
                  checked={selectedScreenId === s.id}
                  onChange={() => setSelectedScreenId(s.id)}
                  className="accent-[#ff4668]"
                />
                <span className="text-sm text-pl-text">
                  Tela {i + 1} {s.name.replace('Screen', '').trim() || '1920×1080'}
                </span>
              </label>
            ))}
          </div>
        )}

        {typeId === 'window-capture' &&
          (windows.length > 0 ? (
            <SelectField
              label="Selecionar janela"
              value={selectedWindowId}
              onChange={setSelectedWindowId}
              options={windows.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Selecionar"
            />
          ) : (
            <TextField
              label="Título da janela"
              value={manualWindowTitle}
              onChange={setManualWindowTitle}
              placeholder="Ex.: Google Chrome, Discord"
            />
          ))}

        {typeId === 'image' && <ImagePicker path={imagePath} onPick={setImagePath} />}

        {typeId === 'video' && (
          <FilePickRow
            label="Arquivo de vídeo"
            path={videoPath}
            onPick={async () => {
              const p = await window.electronAPI?.dialogOpenVideo?.();
              if (p) setVideoPath(p);
            }}
          />
        )}

        {typeId === 'text' && (
          <TextField
            label="Texto"
            value={textContent}
            onChange={setTextContent}
            placeholder="Digite o texto a exibir na LIVE"
            multiline
          />
        )}

        {typeId === 'link' && (
          <TextField
            label="URL"
            value={linkUrl}
            onChange={setLinkUrl}
            placeholder="https://"
          />
        )}

        {typeId === 'camera' &&
          (cameraDevices.length > 0 ? (
            <SelectField
              label="Câmera"
              value={selectedCamera}
              onChange={setSelectedCamera}
              options={cameraDevices.map((c) => ({ value: c.label, label: c.label }))}
              placeholder="Selecionar câmera"
            />
          ) : (
            <p className="text-xs text-pl-muted">
              Nenhuma câmera detectada ainda — será usada a câmera padrão do sistema.
            </p>
          ))}

        {typeId === 'countdown' && (
          <TextField
            label="Duração (segundos)"
            value={String(countdownSeconds)}
            onChange={(v) => setCountdownSeconds(Number(v) || 0)}
            placeholder="300"
          />
        )}

        {['game-capture', 'screen-capture', 'window-capture'].includes(typeId) && (
          <label className="mt-4 flex items-center gap-2 text-sm text-pl-muted">
            <input
              type="checkbox"
              checked={captureCursor}
              onChange={(e) => setCaptureCursor(e.target.checked)}
              className="rounded accent-[#ff4668]"
            />
            Capturar cursor
          </label>
        )}
      </div>

      <footer className="border-t border-pl-border p-4">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          className="w-full rounded-xl bg-gradient-to-r from-[#ff4668] to-[#ff6b8a] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Adicionar origem
        </button>
      </footer>
    </div>
  );
}

function PreviewBox({
  url,
  loading,
  emptyLabel,
}: {
  url?: string;
  loading?: boolean;
  emptyLabel: string;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-pl-border bg-black">
      <div className="flex aspect-video items-center justify-center">
        {loading ? (
          <span className="text-xs text-pl-muted">A carregar pré-visualização…</span>
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-pl-muted">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-2 text-[11px] font-medium transition-colors ${
        active ? 'bg-[#2a2b36] text-pl-text' : 'text-pl-muted hover:text-pl-text'
      }`}
    >
      {label}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-pl-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-pl-border bg-[#1a1b24] px-3 py-2.5 text-sm text-pl-text outline-none focus:border-pl-primary"
      >
        {!value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-pl-text">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full rounded-lg border border-pl-border bg-[#1a1b24] px-3 py-2 text-sm text-pl-text outline-none focus:border-pl-primary"
        />
      ) : (
        <input
          type={label.includes('segundos') ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-pl-border bg-[#1a1b24] px-3 py-2 text-sm text-pl-text outline-none focus:border-pl-primary"
        />
      )}
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-pl-border bg-[#1a1b24] px-3 py-3">
      <div>
        <p className="text-sm font-medium text-pl-text">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-pl-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#ff4668]' : 'bg-pl-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function ImagePicker({
  path,
  onPick,
}: {
  path: string | null;
  onPick: (p: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-pl-border bg-[#1a1b24] p-6 text-center">
      <CloudUpload size={32} className="mx-auto mb-3 text-pl-muted" />
      <p className="mb-1 text-xs text-pl-muted">
        Formatos: JPG, PNG, GIF, BMP, TIF. Máx. 10 MB.
      </p>
      <button
        type="button"
        onClick={() => {
          void window.electronAPI?.dialogOpenImage?.().then((p) => {
            if (p) onPick(p);
          });
        }}
        className="mt-3 rounded-lg bg-pl-border px-4 py-2 text-xs font-medium text-pl-text hover:bg-pl-hover"
      >
        {path ? 'Trocar arquivo' : 'Selecione um arquivo'}
      </button>
      {path && <p className="mt-2 truncate text-[10px] text-pl-accent">{path}</p>}
    </div>
  );
}

function FilePickRow({
  label,
  path,
  onPick,
}: {
  label: string;
  path: string | null;
  onPick: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-pl-border bg-[#1a1b24] p-6 text-center">
      <p className="mb-3 text-sm text-pl-text">{label}</p>
      <button
        type="button"
        onClick={onPick}
        className="rounded-lg bg-pl-border px-4 py-2 text-xs font-medium text-pl-text hover:bg-pl-hover"
      >
        {path ? 'Trocar arquivo' : 'Selecione um arquivo'}
      </button>
      {path && <p className="mt-2 truncate text-[10px] text-pl-accent">{path}</p>}
    </div>
  );
}
