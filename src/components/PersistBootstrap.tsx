import { useEffect, useState, type ReactNode } from 'react';
import { useSceneStore } from '@/stores/sceneStore';

/** Hidrata cenas antes do primeiro paint para evitar flash de defaults. */
export function PersistBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void useSceneStore
      .getState()
      .hydrateFromPersist()
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-pl-bg-deep text-sm text-pl-muted">
        Carregando…
      </div>
    );
  }

  return <>{children}</>;
}
