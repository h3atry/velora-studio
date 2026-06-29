import { LiveSettingsModal } from '@/components/LiveSettingsModal';
import { PlatformIcon } from '@/components/PlatformIcon';
import { useAppStore } from '@/stores/appStore';
import { ChevronRight, Pencil } from 'lucide-react';

export function LiveInfoPanel() {
  const activeInfoPlatform = useAppStore((s) => s.activeInfoPlatform);
  const liveInfo = useAppStore((s) => s.liveInfo);
  const setShowLiveSettings = useAppStore((s) => s.setShowLiveSettings);

  const info = liveInfo[activeInfoPlatform];
  const categoryLabel =
    activeInfoPlatform === 'tiktok'
      ? info.game
        ? `${info.topic} | ${info.game}`
        : info.topic
      : info.category;

  return (
    <>
      <LiveSettingsModal />
      <button
        type="button"
        onClick={() => setShowLiveSettings(true)}
        className="flex w-full items-center gap-3 border-b border-pl-border pl-panel-solid px-4 py-2.5 text-left transition-colors hover:bg-pl-hover"
      >
        <PlatformIcon platform={activeInfoPlatform} size={18} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {info.title || 'Configurar informações da LIVE'}
          </p>
          <p className="truncate text-[11px] text-pl-muted">
            {categoryLabel || 'Toque para editar título, categoria e mais'}
          </p>
        </div>
        <Pencil size={14} className="shrink-0 text-pl-muted" />
        <ChevronRight size={14} className="shrink-0 text-pl-muted" />
      </button>
    </>
  );
}
