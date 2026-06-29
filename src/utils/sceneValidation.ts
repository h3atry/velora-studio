import type { Scene, SceneSource } from '@/stores/sceneStore';
import type { SourceTypeId } from '@/data/sourceCatalog';

const VALID_TYPES = new Set<string>([
  'game-capture',
  'camera',
  'screen-capture',
  'phone-camera',
  'window-capture',
  'image',
  'text',
  'link',
  'video',
  'broadcast',
  'capture-card',
  'stream',
  'alert',
  'goal',
  'chat-box',
  'creator-rankings',
  'viewer-ranking',
  'countdown',
]);

export const SCENE_SCHEMA_VERSION = 1;

export function sanitizeSource(raw: unknown): SceneSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const typeId = o.typeId as SourceTypeId;
  if (!VALID_TYPES.has(typeId)) return null;
  const id = typeof o.id === 'string' ? o.id : `src-${Date.now()}`;
  const name = typeof o.name === 'string' ? o.name : 'Origem';
  const enabled = o.enabled !== false;
  const imagePath = typeof o.imagePath === 'string' ? o.imagePath : undefined;
  const textContent = typeof o.textContent === 'string' ? o.textContent : undefined;
  const countdownSeconds =
    typeof o.countdownSeconds === 'number' ? o.countdownSeconds : undefined;
  return { id, typeId, name, enabled, imagePath, textContent, countdownSeconds };
}

export function sanitizeScenesPayload(data: unknown): { scenes: Scene[]; activeId: string } | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.scenes) || o.scenes.length === 0) return null;

  const scenes: Scene[] = [];
  for (const raw of o.scenes) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    const id = typeof s.id === 'string' ? s.id : `scene-${scenes.length}`;
    const name = typeof s.name === 'string' ? s.name : 'Cena';
    const sources: SceneSource[] = [];
    const seenIds = new Set<string>();
    if (Array.isArray(s.sources)) {
      for (const src of s.sources) {
        const clean = sanitizeSource(src);
        if (clean && !seenIds.has(clean.id)) {
          seenIds.add(clean.id);
          sources.push(clean);
        }
      }
    }
    scenes.push({ id, name, sources });
  }

  if (!scenes.length) return null;
  const activeId =
    typeof o.activeId === 'string' && scenes.some((s) => s.id === o.activeId)
      ? o.activeId
      : scenes[0].id;

  return { scenes, activeId };
}
