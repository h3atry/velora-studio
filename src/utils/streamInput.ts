import type { SceneSource } from '@/stores/sceneStore';
import type { SourceTypeId } from '@/data/sourceCatalog';

export type StreamInputKind = 'camera' | 'display' | 'window' | 'game';

const VIDEO_MAP: Partial<Record<SourceTypeId, StreamInputKind>> = {
  camera: 'camera',
  'screen-capture': 'display',
  'window-capture': 'window',
  'game-capture': 'game',
  'capture-card': 'camera',
};

export function resolveStreamInput(sources: SceneSource[]): {
  inputSource: StreamInputKind;
  captureTarget?: string;
  hasCamera: boolean;
  hasVideo: boolean;
} {
  const active = sources.filter((s) => s.enabled);
  const hasCamera = active.some((s) => s.typeId === 'camera');
  const videoSource = active.find((s) => VIDEO_MAP[s.typeId]);

  if (videoSource) {
    const inputSource = VIDEO_MAP[videoSource.typeId] ?? 'camera';
    const isAnyGame =
      videoSource.typeId === 'game-capture' && videoSource.captureMode === 'any-fullscreen';
    return {
      inputSource: isAnyGame ? 'display' : inputSource,
      captureTarget: isAnyGame
        ? 'desktop'
        : videoSource.captureTarget ?? videoSource.name,
      hasCamera,
      hasVideo: true,
    };
  }

  return { inputSource: 'camera', hasCamera, hasVideo: hasCamera };
}
