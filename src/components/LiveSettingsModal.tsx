import { CategoryPicker } from '@/components/live-settings/CategoryPicker';
import { ModeratorsTab } from '@/components/live-settings/ModeratorsTab';
import { VideoSettingsSection } from '@/components/live-settings/VideoSettingsSection';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useAppStore } from '@/stores/appStore';
import type { LiveInfo, Platform } from '@/types';
import { Crop, HelpCircle, Image, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type SettingsTab = 'info' | 'moderators';

export function LiveSettingsModal() {
  const open = useAppStore((s) => s.showLiveSettings);
  const setOpen = useAppStore((s) => s.setShowLiveSettings);
  const connectedPlatforms = useAppStore((s) => s.connectedPlatforms);
  const activeInfoPlatform = useAppStore((s) => s.activeInfoPlatform);
  const setActiveInfoPlatform = useAppStore((s) => s.setActiveInfoPlatform);
  const liveInfo = useAppStore((s) => s.liveInfo);
  const setLiveInfoAll = useAppStore((s) => s.setLiveInfoAll);

  const [tab, setTab] = useState<SettingsTab>('info');
  const [draft, setDraft] = useState(liveInfo);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [videoEditOpen, setVideoEditOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(liveInfo)) as typeof liveInfo);
      setTab('info');
    }
  }, [open, liveInfo]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setLiveInfoAll(draft), 800);
    return () => clearTimeout(timer);
  }, [draft, open, setLiveInfoAll]);

  if (!open) return null;

  const info = draft[activeInfoPlatform];

  const updateDraft = (platform: Platform, patch: Partial<LiveInfo>) => {
    setDraft((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...patch },
    }));
  };

  const save = () => {
    setLiveInfoAll(draft);
    setOpen(false);
  };

  const cancel = () => setOpen(false);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-pl-border bg-zinc-900 shadow-2xl">
        {/* Barra lateral — alternar plataforma */}
        <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-pl-border bg-zinc-950 py-4">
          {connectedPlatforms.map((platform) => (
            <button
              key={platform}
              type="button"
              title={platform === 'tiktok' ? 'TikTok' : 'Twitch'}
              onClick={() => setActiveInfoPlatform(platform)}
              className={`rounded-xl p-2.5 transition-all ${
                activeInfoPlatform === platform
                  ? platform === 'tiktok'
                    ? 'bg-tiktok/25 ring-2 ring-tiktok'
                    : 'bg-twitch/25 ring-2 ring-twitch'
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              <PlatformIcon platform={platform} size={26} />
            </button>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-pl-border px-5 py-4">
            <h2 className="text-base font-semibold text-white">Configurações de LIVE</h2>
            <button
              type="button"
              onClick={cancel}
              className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-white"
            >
              <X size={20} />
            </button>
          </header>

          <nav className="flex gap-6 border-b border-pl-border px-5">
            <TabButton active={tab === 'info'} onClick={() => setTab('info')}>
              Informação da LIVE
            </TabButton>
            <TabButton active={tab === 'moderators'} onClick={() => setTab('moderators')}>
              Moderadores
            </TabButton>
          </nav>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {tab === 'info' ? (
              <InfoTab
                platform={activeInfoPlatform}
                info={info}
                onChange={(patch) => updateDraft(activeInfoPlatform, patch)}
                pickerOpen={pickerOpen}
                setPickerOpen={setPickerOpen}
                videoEditOpen={videoEditOpen}
                setVideoEditOpen={setVideoEditOpen}
              />
            ) : (
              <ModeratorsTab />
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-pl-border px-5 py-4">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg bg-zinc-700 px-5 py-2 text-sm text-white hover:bg-zinc-600"
            >
              Cancelar
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
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-3 pt-1 text-sm transition-colors ${
        active
          ? 'border-white font-medium text-white'
          : 'border-transparent text-pl-muted hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function InfoTab({
  platform,
  info,
  onChange,
  pickerOpen,
  setPickerOpen,
  videoEditOpen,
  setVideoEditOpen,
}: {
  platform: Platform;
  info: LiveInfo;
  onChange: (patch: Partial<LiveInfo>) => void;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  videoEditOpen: boolean;
  setVideoEditOpen: (v: boolean) => void;
}) {
  const categoryLabel =
    platform === 'tiktok'
      ? info.game
        ? `${info.topic} | ${info.game}`
        : info.topic || 'Selecionar tópico'
      : info.category || 'Selecionar categoria';

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <textarea
            value={info.title}
            onChange={(e) => onChange({ title: e.target.value })}
            rows={2}
            className="input-field resize-none text-sm"
            placeholder="Título da LIVE"
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-left text-sm text-white hover:bg-zinc-700"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-500/20 text-orange-400">
              +
            </span>
            {categoryLabel}
          </button>
        </div>

        <div className="shrink-0">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
            <div className="text-center">
              <Image size={20} className="mx-auto text-pl-muted" />
              <span className="text-[10px] text-pl-muted">Auto</span>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              title="Recortar"
              className="rounded bg-zinc-800 p-1.5 text-pl-muted hover:text-white"
            >
              <Crop size={14} />
            </button>
            <button
              type="button"
              title="Alterar capa"
              className="rounded bg-zinc-800 p-1.5 text-pl-muted hover:text-white"
            >
              <Image size={14} />
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <CategoryPicker
          platform={platform}
          topic={info.topic}
          game={info.game}
          category={info.category}
          onSelect={(topic, game, category, gameId) => {
            onChange({ topic, game, category, gameId: gameId ?? '' });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-1 text-sm font-medium text-white">
          Sobre mim
          <HelpCircle size={12} className="text-pl-muted" />
        </h3>
        <div className="rounded-lg bg-zinc-800 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-600 text-xs">
              <UserPlus size={14} />
            </div>
            <span className="text-sm text-white">
              {platform === 'tiktok' ? 'h3atry' : 'seu_canal'}
            </span>
          </div>
          <textarea
            value={info.aboutMe}
            onChange={(e) => onChange({ aboutMe: e.target.value.slice(0, 240) })}
            rows={3}
            maxLength={240}
            className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            placeholder="Conte sobre você…"
          />
          <p className="mt-1 text-right text-[10px] text-pl-muted">
            {info.aboutMe.length}/240
          </p>
        </div>
      </section>

      {platform === 'twitch' && (
        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-pl-muted">Hashtags / tags</span>
            <input
              className="input-field"
              value={info.hashtags}
              onChange={(e) => onChange({ hashtags: e.target.value.slice(0, 100) })}
              placeholder="português, fps, valorant"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-pl-muted">Idioma</span>
            <select
              className="input-field"
              value={info.language}
              onChange={(e) => onChange({ language: e.target.value })}
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
        </section>
      )}

      {platform === 'tiktok' && (
        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-pl-muted">Meta de seguidores</span>
            <input
              type="number"
              className="input-field"
              value={info.followerGoal}
              onChange={(e) => onChange({ followerGoal: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-pl-muted">Hashtags</span>
            <input
              className="input-field"
              value={info.hashtags}
              onChange={(e) => onChange({ hashtags: e.target.value.slice(0, 80) })}
              placeholder="#live"
            />
          </label>
        </section>
      )}

      <VideoSettingsSection
        settings={info.videoSettings}
        editOpen={videoEditOpen}
        onEditOpen={setVideoEditOpen}
        onChange={(videoSettings) => onChange({ videoSettings })}
      />
    </div>
  );
}
