import { desktopCapturer } from 'electron';

export interface CaptureSourceInfo {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnailDataUrl: string;
}

export async function listCaptureSources(): Promise<CaptureSourceInfo[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 480, height: 270 },
      fetchWindowIcons: true,
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.id.startsWith('screen:') ? 'screen' : 'window',
      thumbnailDataUrl: s.thumbnail.isEmpty() ? '' : s.thumbnail.toDataURL(),
    }));
  } catch {
    return [];
  }
}
