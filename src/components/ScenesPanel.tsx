import { ChevronDown, ChevronUp, Layers, Plus, Undo2 } from 'lucide-react';
import { useSceneStore } from '@/stores/sceneStore';
import { getSourceById } from '@/data/sourceCatalog';
import { AddSourceButton } from '@/components/sources/AddSourceModal';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

export function ScenesPanel() {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const setActiveScene = useSceneStore((s) => s.setActiveScene);
  const addScene = useSceneStore((s) => s.addScene);
  const moveScene = useSceneStore((s) => s.moveScene);
  const undoRemove = useSceneStore((s) => s.undoRemove);
  const undoRemoveSource = useSceneStore((s) => s.undoRemoveSource);
  const activeScene = scenes.find((s) => s.id === activeSceneId);

  const showUndo = undoRemove && Date.now() < undoRemove.expiresAt;

  return (
    <section className="flex min-h-0 flex-1 flex-col border-b border-pl-border">
      <div className="p-3 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="pl-section-label flex items-center gap-1">
            <Layers size={12} /> Cenas
          </p>
          <button
            type="button"
            title="Nova cena"
            onClick={() => {
              const copy = window.confirm(
                'Copiar origens da cena atual para a nova cena?\n\nOK = copiar · Cancelar = cena vazia'
              );
              addScene(copy);
            }}
            className="rounded p-1 text-pl-muted hover:bg-pl-hover hover:text-pl-text"
          >
            <Plus size={14} />
          </button>
        </div>
        <ul className="mb-3 space-y-0.5">
          {scenes.map((s, index) => (
            <li key={s.id} className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setActiveScene(s.id)}
                className={`pl-sidebar-item min-w-0 flex-1 ${
                  activeSceneId === s.id ? 'bg-pl-primary/15 text-pl-accent' : ''
                }`}
              >
                {s.name}
              </button>
              <button
                type="button"
                title="Mover cena para cima"
                disabled={index === 0}
                onClick={() => moveScene(s.id, 'up')}
                className="rounded p-0.5 text-pl-dim hover:text-pl-text disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                title="Mover cena para baixo"
                disabled={index === scenes.length - 1}
                onClick={() => moveScene(s.id, 'down')}
                className="rounded p-0.5 text-pl-dim hover:text-pl-text disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </li>
          ))}
        </ul>

        <p className="pl-section-label mb-2">Origens</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        {showUndo && (
          <button
            type="button"
            onClick={undoRemoveSource}
            className="mb-2 flex items-center justify-center gap-1 rounded-lg border border-pl-border bg-pl-hover py-1.5 text-[10px] text-pl-accent"
          >
            <Undo2 size={12} />
            Desfazer remoção
          </button>
        )}
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {activeScene?.sources.length === 0 && (
            <li className="px-1 py-6 text-center text-[11px] text-pl-dim">
              Nenhuma origem na cena.
              <br />
              Clique em Adicionar origem abaixo.
            </li>
          )}
          {activeScene?.sources.map((src) => (
            <SceneSourceRow key={src.id} sourceId={src.id} />
          ))}
        </ul>
        <AddSourceButton />
      </div>
    </section>
  );
}

function SceneSourceRow({ sourceId }: { sourceId: string }) {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const toggleSource = useSceneStore((s) => s.toggleSource);
  const removeSource = useSceneStore((s) => s.removeSource);
  const renameSource = useSceneStore((s) => s.renameSource);
  const moveSource = useSceneStore((s) => s.moveSource);

  const scene = scenes.find((s) => s.id === activeSceneId);
  const src = scene?.sources.find((s) => s.id === sourceId);
  if (!src || !scene) return null;

  const srcIndex = scene.sources.findIndex((s) => s.id === sourceId);

  const catalog = getSourceById(src.typeId);
  const Icon = catalog?.icon;

  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
          src.enabled ? '' : 'opacity-50'
        }`}
      >
        {Icon && <Icon size={13} className="shrink-0 text-pl-accent" />}
        <span
          className="min-w-0 flex-1 truncate text-xs text-pl-text"
          title="Duplo clique para renomear"
          onDoubleClick={() => {
            const name = window.prompt('Renomear origem', src.name);
            if (name) renameSource(src.id, name);
          }}
        >
          {src.name}
        </span>
        <button
          type="button"
          title="Mover origem para cima"
          disabled={srcIndex === 0}
          onClick={() => moveSource(src.id, 'up')}
          className="rounded p-0.5 text-pl-dim opacity-0 transition-opacity hover:text-pl-text group-hover:opacity-100 disabled:opacity-20"
        >
          <ChevronUp size={11} />
        </button>
        <button
          type="button"
          title="Mover origem para baixo"
          disabled={srcIndex === scene.sources.length - 1}
          onClick={() => moveSource(src.id, 'down')}
          className="rounded p-0.5 text-pl-dim opacity-0 transition-opacity hover:text-pl-text group-hover:opacity-100 disabled:opacity-20"
        >
          <ChevronDown size={11} />
        </button>
        <button
          type="button"
          title={src.enabled ? 'Ocultar' : 'Mostrar'}
          onClick={() => toggleSource(src.id)}
          className="rounded p-0.5 text-pl-dim opacity-0 transition-opacity hover:text-pl-text group-hover:opacity-100"
        >
          {src.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          type="button"
          title="Remover"
          onClick={() => removeSource(src.id)}
          className="rounded p-0.5 text-pl-dim opacity-0 transition-opacity hover:text-pl-danger group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </li>
  );
}
