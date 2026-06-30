import { useEffect, useState } from 'react';
import {
  CATEGORY_LABELS,
  SOURCE_CATALOG,
  type SourceCatalogItem,
  type SourceTypeId,
  isSourceImplemented,
  sourceNeedsConfigureStep,
} from '@/data/sourceCatalog';
import { ConfigureSourceForm } from '@/components/sources/ConfigureSourceForm';
import { useSceneStore } from '@/stores/sceneStore';
import { Plus, X } from 'lucide-react';

export function AddSourceModal() {
  const show = useSceneStore((s) => s.showAddSourceModal);
  const close = useSceneStore((s) => s.closeAddSourceModal);
  const addSource = useSceneStore((s) => s.addSourceToActiveScene);

  const [selectedId, setSelectedId] = useState<SourceTypeId>('camera');
  const [step, setStep] = useState<'pick' | 'configure'>('pick');

  useEffect(() => {
    if (show) {
      setSelectedId('camera');
      setStep('pick');
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'configure') setStep('pick');
        else close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, close, step]);

  if (!show) return null;

  const selected = SOURCE_CATALOG.find((s) => s.id === selectedId) ?? SOURCE_CATALOG[0];
  const general = SOURCE_CATALOG.filter((s) => s.category === 'general');
  const widgets = SOURCE_CATALOG.filter((s) => s.category === 'widget');
  const canAdd = isSourceImplemented(selectedId);

  if (step === 'configure') {
    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-6"
        onClick={close}
        role="presentation"
      >
        <ConfigureSourceForm
          typeId={selectedId}
          title={selected.label}
          onClose={close}
          onBack={() => setStep('pick')}
          onConfirm={(config) => {
            addSource(selectedId, config);
            close();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-6"
      onClick={close}
      role="presentation"
    >
      <div
        className="flex h-[min(640px,90vh)] w-[min(920px,96vw)] overflow-hidden rounded-2xl border border-pl-border bg-[#14151c] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-source-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col border-r border-pl-border">
          <header className="flex items-center justify-between border-b border-pl-border px-5 py-4">
            <h2 id="add-source-title" className="text-base font-semibold text-pl-text">
              Adicionar origem
            </h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1.5 text-pl-muted transition-colors hover:bg-pl-hover hover:text-pl-text"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <SourceSection
              title={CATEGORY_LABELS.general}
              items={general}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <SourceSection
              title={CATEGORY_LABELS.widget}
              items={widgets}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="mt-6"
            />
          </div>
        </div>

        <div className="flex w-[340px] shrink-0 flex-col bg-[#11121a]">
          <SourcePreviewPanel item={selected} />
          <footer className="mt-auto border-t border-pl-border p-4">
            <button
              type="button"
              disabled={!canAdd}
              onClick={() => {
                if (sourceNeedsConfigureStep(selectedId)) {
                  setStep('configure');
                } else {
                  addSource(selectedId);
                  close();
                }
              }}
              className="w-full rounded-xl bg-gradient-to-r from-[#ff4668] to-[#ff6b8a] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canAdd ? 'Adicionar' : 'Em breve'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SourceSection({
  title,
  items,
  selectedId,
  onSelect,
  className = '',
}: {
  title: string;
  items: SourceCatalogItem[];
  selectedId: SourceTypeId;
  onSelect: (id: SourceTypeId) => void;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 text-sm font-medium text-pl-text">{title}</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === selectedId;
          const soon = !isSourceImplemented(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all ${
                active
                  ? 'border-white/90 bg-pl-hover text-pl-text ring-1 ring-white/20'
                  : 'border-pl-border/60 bg-[#1a1b24] text-pl-muted hover:border-pl-border hover:bg-pl-hover hover:text-pl-text'
              } ${soon ? 'opacity-70' : ''}`}
            >
              {soon && (
                <span className="absolute right-1 top-1 rounded bg-pl-border/80 px-1 text-[8px] text-pl-muted">
                  breve
                </span>
              )}
              <Icon size={22} className={active ? 'text-pl-text' : 'text-pl-muted'} strokeWidth={1.5} />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SourcePreviewPanel({ item }: { item: SourceCatalogItem }) {
  const Icon = item.icon;
  const soon = !isSourceImplemented(item.id);

  return (
    <div className="flex flex-1 flex-col p-5">
      <div className="mb-4 overflow-hidden rounded-xl border border-pl-border bg-[#0a0b10]">
        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#1e2030] to-[#12131a]">
          <div className="flex flex-col items-center gap-3 text-pl-muted">
            <div className="rounded-2xl bg-pl-surface/80 p-5">
              <Icon size={40} strokeWidth={1.25} className="text-pl-accent" />
            </div>
            <span className="text-[11px]">{item.previewHint}</span>
            {soon && <span className="text-[10px] text-pl-accent">Disponível em breve</span>}
          </div>
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-pl-text">{item.label}</h3>
      <p className="text-xs leading-relaxed text-pl-muted">{item.description}</p>
    </div>
  );
}

export function AddSourceButton() {
  const open = useSceneStore((s) => s.openAddSourceModal);

  return (
    <button
      type="button"
      onClick={open}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-pl-border bg-pl-bg/60 py-2.5 text-xs font-medium text-pl-muted transition-colors hover:border-pl-primary/40 hover:bg-pl-hover hover:text-pl-text"
    >
      <Plus size={14} />
      Adicionar origem
    </button>
  );
}
