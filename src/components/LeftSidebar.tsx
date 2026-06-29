import {
  Columns2,
  Gamepad2,
  LayoutGrid,
  Monitor,
  Smartphone,
  Target,
  Users,
} from 'lucide-react';
import { ScenesPanel } from '@/components/ScenesPanel';
import { AddSourceModal } from '@/components/sources/AddSourceModal';
import { useAppStore } from '@/stores/appStore';
import type { PreviewMode } from '@/types';

const previewModes: { id: PreviewMode; icon: typeof Smartphone; label: string }[] = [
  { id: 'portrait', icon: Smartphone, label: 'Retrato' },
  { id: 'landscape', icon: Monitor, label: 'Paisagem' },
  { id: 'dual', icon: Columns2, label: 'Layout duplo' },
];

const tools = [
  { icon: Users, label: 'Co-host', hint: 'Convide co-hosts para a LIVE (em breve)' },
  { icon: Target, label: 'Meta de LIVE', hint: 'Widget de meta na transmissão (em breve)' },
  { icon: Gamepad2, label: 'Jogos interativos', hint: 'Jogos e minigames na LIVE (em breve)' },
  { icon: LayoutGrid, label: 'Enquete', hint: 'Enquetes para espectadores (em breve)' },
];

export function LeftSidebar() {
  const previewMode = useAppStore((s) => s.previewMode);
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);

  return (
    <>
      <aside className="flex w-56 shrink-0 flex-col border-r border-pl-border pl-panel-solid">
        <section className="shrink-0 border-b border-pl-border p-3">
          <p className="pl-section-label mb-2">Visualização</p>
          <div className="flex gap-1 rounded-lg bg-pl-bg p-1">
            {previewModes.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setPreviewMode(id)}
                className={`flex flex-1 items-center justify-center rounded-md p-2 transition-all ${
                  previewMode === id
                    ? 'bg-gradient-to-br from-pl-primary to-pl-primary-dim text-white shadow-pl-glow'
                    : 'text-pl-muted hover:bg-pl-hover hover:text-pl-text'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </section>

        <ScenesPanel />

        <section className="shrink-0 border-t border-pl-border p-3">
          <p className="pl-section-label mb-2">Ferramentas</p>
          <div className="grid grid-cols-2 gap-2">
            {tools.map(({ icon: Icon, label, hint }) => (
              <button
                key={label}
                type="button"
                disabled
                title={hint}
                className="flex cursor-not-allowed flex-col items-center gap-1 rounded-lg border border-pl-border-subtle bg-pl-bg/50 p-2 text-[10px] text-pl-dim opacity-60"
              >
                <Icon size={18} className="text-pl-primary-bright/50" />
                <span className="text-center leading-tight">{label}</span>
                <span className="text-[8px] text-pl-dim">em breve</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <AddSourceModal />
    </>
  );
}
