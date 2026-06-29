import { useSceneStore } from '@/stores/sceneStore';
import type { SourceTypeId } from '@/data/sourceCatalog';

export function useActiveScene() {
  return useSceneStore((s) => s.scenes.find((sc) => sc.id === s.activeSceneId));
}

export function useHasEnabledSource(typeId: SourceTypeId) {
  return useSceneStore((s) => {
    const scene = s.scenes.find((sc) => sc.id === s.activeSceneId);
    return scene?.sources.some((src) => src.typeId === typeId && src.enabled) ?? false;
  });
}

const VIDEO_SOURCE_TYPES: SourceTypeId[] = [
  'camera',
  'game-capture',
  'screen-capture',
  'window-capture',
  'phone-camera',
  'capture-card',
  'video',
  'broadcast',
  'stream',
];

export function useHasVideoSource() {
  return useSceneStore((s) => {
    const scene = s.scenes.find((sc) => sc.id === s.activeSceneId);
    return (
      scene?.sources.some(
        (src) => src.enabled && VIDEO_SOURCE_TYPES.includes(src.typeId)
      ) ?? false
    );
  });
}

export function useHasEnabledCamera() {
  return useHasEnabledSource('camera');
}
