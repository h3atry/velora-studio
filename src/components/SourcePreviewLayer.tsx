import { Bell, MessageSquare, Target, Timer, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { SceneSource } from '@/stores/sceneStore';

function toFileUrl(filePath: string): string {
  if (filePath.startsWith('file:')) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  return `file:///${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
}

async function pickImageFile(): Promise<string | null> {
  const api = window.electronAPI;
  if (!api?.dialogOpenImage) return null;
  return api.dialogOpenImage();
}

function ImageSourceLayer({
  source,
  onPath,
}: {
  source: SceneSource;
  onPath: (id: string, path: string) => void;
}) {
  const path = source.imagePath;

  if (!path) {
    return (
      <button
        type="button"
        onClick={() => {
          void pickImageFile().then((p) => {
            if (p) onPath(source.id, p);
          });
        }}
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-[10px] text-white backdrop-blur-sm"
      >
        Escolher imagem…
      </button>
    );
  }

  return (
    <img
      src={toFileUrl(path)}
      alt={source.name}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
    />
  );
}

function GoalWidget() {
  const info = useAppStore((s) => s.liveInfo.tiktok);
  const progress =
    info.followerGoal > 0
      ? Math.min(100, Math.round((info.followerCurrent / info.followerGoal) * 100))
      : 0;

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-black/70 p-2 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1 text-[10px] text-white">
        <Target size={10} className="text-pl-accent" />
        Meta de seguidores
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pl-primary to-pl-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-pl-muted">
        {progress}% ({info.followerCurrent}/{info.followerGoal})
      </p>
    </div>
  );
}

function ChatBoxOverlay() {
  const messages = useAppStore((s) => s.messages);
  const recent = messages.slice(-4);

  return (
    <div className="absolute left-2 right-2 top-2 z-20 max-h-[40%] overflow-hidden rounded-lg bg-black/60 p-2 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium text-pl-accent">
        <MessageSquare size={9} />
        Chat
      </div>
      <ul className="space-y-0.5">
        {recent.length === 0 ? (
          <li className="text-[9px] text-pl-muted">Sem mensagens</li>
        ) : (
          recent.map((m) => (
            <li key={m.id} className="truncate text-[9px] text-white">
              <span className="font-medium text-pl-accent">{m.displayName}:</span> {m.message}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function TextSourceLayer({
  source,
  onText,
}: {
  source: SceneSource;
  onText: (id: string, text: string) => void;
}) {
  const text = source.textContent ?? '';

  return (
    <div className="absolute inset-x-4 top-1/3 z-10 flex justify-center">
      <div
        className="max-w-[90%] rounded-lg bg-black/50 px-4 py-2 backdrop-blur-sm"
        onDoubleClick={() => {
          const next = window.prompt('Texto da origem', text);
          if (next !== null) onText(source.id, next);
        }}
      >
        <div className="mb-1 flex items-center gap-1 text-[9px] text-pl-accent">
          <Type size={9} />
          {source.name}
        </div>
        <p className="whitespace-pre-wrap text-center text-sm font-semibold text-white">
          {text || 'Duplo clique para editar texto…'}
        </p>
      </div>
    </div>
  );
}

function AlertWidget() {
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.onAlertReceived) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = window.electronAPI.onAlertReceived((a) => {
      const item = a as { title?: string; message?: string };
      setAlert({
        title: String(item.title ?? 'Alerta'),
        message: String(item.message ?? ''),
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setAlert(null), 12_000);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!alert) return null;

  return (
    <div className="absolute bottom-16 left-1/2 z-20 max-w-xs -translate-x-1/2 rounded-xl border border-pl-primary/60 bg-black/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-pl-accent">
        <Bell size={12} />
        {alert.title}
      </div>
      {alert.message && (
        <p className="mt-1 text-[11px] text-pl-muted">{alert.message}</p>
      )}
    </div>
  );
}

function CountdownWidget({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
      <div className="flex flex-col items-center gap-1 rounded-xl bg-black/70 px-6 py-4 backdrop-blur-sm">
        <Timer size={16} className="text-pl-accent" />
        <span className="font-mono text-3xl font-bold text-white">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

export function SourcePreviewLayer() {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const updateSourceConfig = useSceneStore((s) => s.updateSourceConfig);

  const scene = scenes.find((s) => s.id === activeSceneId);
  const enabled = scene?.sources.filter((s) => s.enabled) ?? [];

  const hasGoal = enabled.some((s) => s.typeId === 'goal');
  const hasChatBox = enabled.some((s) => s.typeId === 'chat-box');
  const hasAlert = enabled.some((s) => s.typeId === 'alert');
  const imageSources = enabled.filter((s) => s.typeId === 'image');
  const textSources = enabled.filter((s) => s.typeId === 'text');
  const countdown = enabled.find((s) => s.typeId === 'countdown');

  return (
    <>
      {imageSources.map((src) => (
        <ImageSourceLayer
          key={src.id}
          source={src}
          onPath={(id, path) => updateSourceConfig(id, { imagePath: path })}
        />
      ))}
      {textSources.map((src) => (
        <TextSourceLayer
          key={src.id}
          source={src}
          onText={(id, text) => updateSourceConfig(id, { textContent: text })}
        />
      ))}
      {hasChatBox && <ChatBoxOverlay />}
      {hasGoal && <GoalWidget />}
      {hasAlert && <AlertWidget />}
      {countdown && (
        <CountdownWidget seconds={countdown.countdownSeconds ?? 300} />
      )}
    </>
  );
}
