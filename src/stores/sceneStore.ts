import { create } from 'zustand';
import type { SourceTypeId } from '@/data/sourceCatalog';
import { defaultSourceName, isSourceImplemented } from '@/data/sourceCatalog';
import { sanitizeScenesPayload } from '@/utils/sceneValidation';
import { useAppStore } from '@/stores/appStore';

export interface SceneSource {
  id: string;
  typeId: SourceTypeId;
  name: string;
  enabled: boolean;
  imagePath?: string;
  textContent?: string;
  countdownSeconds?: number;
  videoPath?: string;
  linkUrl?: string;
  captureTarget?: string;
  captureSourceId?: string;
  captureMode?: 'any-fullscreen' | 'specific';
  captureCursor?: boolean;
  compatibleMode?: boolean;
  screenIndex?: number;
  deviceId?: string;
  deviceLabel?: string;
}

export interface Scene {
  id: string;
  name: string;
  sources: SceneSource[];
}

interface RemovedSourceSnapshot {
  source: SceneSource;
  sceneId: string;
  expiresAt: number;
}

interface SceneState {
  scenes: Scene[];
  activeSceneId: string;
  showAddSourceModal: boolean;
  undoRemove: RemovedSourceSnapshot | null;

  setScenes: (scenes: Scene[], activeId: string) => void;
  setActiveScene: (id: string) => void;
  addScene: (copySources?: boolean) => void;
  openAddSourceModal: () => void;
  closeAddSourceModal: () => void;
  addSourceToActiveScene: (
    typeId: SourceTypeId,
    config?: Partial<Omit<SceneSource, 'id' | 'typeId' | 'enabled'>>
  ) => void;
  removeSource: (sourceId: string) => void;
  undoRemoveSource: () => void;
  renameSource: (sourceId: string, name: string) => void;
  toggleSource: (sourceId: string) => void;
  moveScene: (sceneId: string, direction: 'up' | 'down') => void;
  removeScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  moveSource: (sourceId: string, direction: 'up' | 'down') => void;
  updateSourceConfig: (
    sourceId: string,
    patch: Partial<
      Pick<
        SceneSource,
        | 'imagePath'
        | 'textContent'
        | 'countdownSeconds'
        | 'videoPath'
        | 'linkUrl'
        | 'captureTarget'
        | 'captureSourceId'
        | 'captureMode'
        | 'captureCursor'
        | 'compatibleMode'
        | 'screenIndex'
        | 'deviceId'
        | 'deviceLabel'
        | 'name'
      >
    >
  ) => void;
  hydrateFromPersist: () => Promise<void>;
}

const DEFAULT_SCENES: Scene[] = [
  { id: 'default', name: 'Cena principal', sources: [] },
];

function persistScenes(scenes: Scene[], activeSceneId: string) {
  const api = window.electronAPI;
  if (api?.persistSaveScenes) {
    void api.persistSaveScenes({ scenes, activeId: activeSceneId });
  }
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: DEFAULT_SCENES,
  activeSceneId: 'default',
  showAddSourceModal: false,
  undoRemove: null,

  setScenes: (scenes, activeId) => set({ scenes, activeSceneId: activeId }),

  setActiveScene: (id) => {
    set({ activeSceneId: id });
    persistScenes(get().scenes, id);
  },

  addScene: (copySources = false) => {
    const { scenes, activeSceneId } = get();
    const id = `scene-${Date.now()}`;
    const current = scenes.find((s) => s.id === activeSceneId);
    const sources = copySources && current
      ? current.sources.map((s) => ({ ...s, id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }))
      : [];
    const next = [...scenes, { id, name: `Cena ${scenes.length + 1}`, sources }];
    set({ scenes: next, activeSceneId: id });
    persistScenes(next, id);
  },

  openAddSourceModal: () => set({ showAddSourceModal: true }),
  closeAddSourceModal: () => set({ showAddSourceModal: false }),

  addSourceToActiveScene: (typeId, config) => {
    if (!isSourceImplemented(typeId)) return;
    const { scenes, activeSceneId } = get();
    const scene = scenes.find((s) => s.id === activeSceneId);
    if (!scene) return;

    const sameTypeCount = scene.sources.filter((s) => s.typeId === typeId).length;
    const displayName =
      config?.name?.trim() ||
      config?.captureTarget?.trim() ||
      defaultSourceName(typeId, sameTypeCount);

    const source: SceneSource = {
      id: `src-${Date.now()}`,
      typeId,
      name: displayName,
      enabled: true,
      ...config,
    };

    const next = scenes.map((s) =>
      s.id === activeSceneId ? { ...s, sources: [...s.sources, source] } : s
    );
    set({ scenes: next, showAddSourceModal: false });
    persistScenes(next, activeSceneId);

    if (typeId === 'camera' && config?.deviceLabel) {
      useAppStore.getState().updateStreamSettings({
        cameraDeviceId: config.deviceId ?? '',
        cameraLabel: config.deviceLabel,
      });
    }
  },

  removeSource: (sourceId) => {
    const { scenes, activeSceneId } = get();
    const scene = scenes.find((s) => s.id === activeSceneId);
    const removed = scene?.sources.find((s) => s.id === sourceId);
    const next = scenes.map((s) =>
      s.id === activeSceneId
        ? { ...s, sources: s.sources.filter((src) => src.id !== sourceId) }
        : s
    );
    set({
      scenes: next,
      undoRemove: removed
        ? { source: removed, sceneId: activeSceneId, expiresAt: Date.now() + 5000 }
        : null,
    });
    persistScenes(next, activeSceneId);
    if (removed?.typeId === 'camera') {
      const stillHasCamera = next
        .flatMap((s) => s.sources)
        .some((s) => s.typeId === 'camera');
      if (!stillHasCamera) {
        useAppStore.getState().updateStreamSettings({ cameraDeviceId: '', cameraLabel: '' });
      }
    }
  },

  undoRemoveSource: () => {
    const snap = get().undoRemove;
    if (!snap || Date.now() > snap.expiresAt) return;
    const { scenes } = get();
    const next = scenes.map((s) =>
      s.id === snap.sceneId ? { ...s, sources: [...s.sources, snap.source] } : s
    );
    set({ scenes: next, undoRemove: null });
    persistScenes(next, get().activeSceneId);
  },

  renameSource: (sourceId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { scenes, activeSceneId } = get();
    const next = scenes.map((s) =>
      s.id === activeSceneId
        ? {
            ...s,
            sources: s.sources.map((src) =>
              src.id === sourceId ? { ...src, name: trimmed } : src
            ),
          }
        : s
    );
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  toggleSource: (sourceId) => {
    const { scenes, activeSceneId } = get();
    const next = scenes.map((s) =>
      s.id === activeSceneId
        ? {
            ...s,
            sources: s.sources.map((src) =>
              src.id === sourceId ? { ...src, enabled: !src.enabled } : src
            ),
          }
        : s
    );
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  moveScene: (sceneId, direction) => {
    const { scenes, activeSceneId } = get();
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const next = [...scenes];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  removeScene: (sceneId) => {
    const { scenes, activeSceneId } = get();
    if (scenes.length <= 1) return;
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const next = scenes.filter((s) => s.id !== sceneId);
    let newActiveId = activeSceneId;
    if (activeSceneId === sceneId) {
      newActiveId = next[Math.min(idx, next.length - 1)]?.id ?? next[0].id;
    }
    set({ scenes: next, activeSceneId: newActiveId });
    persistScenes(next, newActiveId);
  },

  renameScene: (sceneId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { scenes, activeSceneId } = get();
    const next = scenes.map((s) => (s.id === sceneId ? { ...s, name: trimmed } : s));
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  moveSource: (sourceId, direction) => {
    const { scenes, activeSceneId } = get();
    const next = scenes.map((s) => {
      if (s.id !== activeSceneId) return s;
      const idx = s.sources.findIndex((src) => src.id === sourceId);
      if (idx < 0) return s;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= s.sources.length) return s;
      const sources = [...s.sources];
      [sources[idx], sources[newIdx]] = [sources[newIdx], sources[idx]];
      return { ...s, sources };
    });
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  updateSourceConfig: (sourceId, patch) => {
    const { scenes, activeSceneId } = get();
    const next = scenes.map((s) =>
      s.id === activeSceneId
        ? {
            ...s,
            sources: s.sources.map((src) =>
              src.id === sourceId ? { ...src, ...patch } : src
            ),
          }
        : s
    );
    set({ scenes: next });
    persistScenes(next, activeSceneId);
  },

  hydrateFromPersist: async () => {
    const api = window.electronAPI;
    if (!api?.persistLoadScenes) return;
    const data = await api.persistLoadScenes();
    const clean = sanitizeScenesPayload(data);
    if (clean) {
      set({ scenes: clean.scenes, activeSceneId: clean.activeId });
    }
  },
}));
