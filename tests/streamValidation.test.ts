import { describe, expect, it } from 'vitest';
import { validateChatSend, validateStreamStart } from '../electron/ipc/validatePayload';

const validStream = {
  cameraId: 'video=HD Webcam',
  width: 1920,
  height: 1080,
  fps: 30,
  bitrateKbps: 4500,
  destinations: [
    {
      platform: 'twitch',
      enabled: true,
      rtmpUrl: 'rtmp://live.twitch.tv/app',
      streamKey: 'live_abc',
    },
  ],
};

describe('validateStreamStart', () => {
  it('accepts valid config', () => {
    const result = validateStreamStart(validStream);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cameraId).toBe('video=HD Webcam');
      expect(result.value.destinations).toHaveLength(1);
    }
  });

  it('rejects missing cameraId', () => {
    const result = validateStreamStart({ ...validStream, cameraId: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid fps', () => {
    const result = validateStreamStart({ ...validStream, fps: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects empty destinations', () => {
    const result = validateStreamStart({ ...validStream, destinations: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown platform', () => {
    const result = validateStreamStart({
      ...validStream,
      destinations: [{ ...validStream.destinations[0], platform: 'facebook' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-object payload', () => {
    expect(validateStreamStart(null).ok).toBe(false);
    expect(validateStreamStart('bad').ok).toBe(false);
  });
});

describe('validateChatSend', () => {
  it('accepts valid twitch message', () => {
    const result = validateChatSend('twitch', '  Olá chat!  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.platform).toBe('twitch');
      expect(result.value.message).toBe('Olá chat!');
    }
  });

  it('rejects invalid platform', () => {
    expect(validateChatSend('youtube', 'hi').ok).toBe(false);
  });

  it('rejects empty message', () => {
    expect(validateChatSend('tiktok', '   ').ok).toBe(false);
  });

  it('rejects message over 500 chars', () => {
    expect(validateChatSend('twitch', 'x'.repeat(501)).ok).toBe(false);
  });
});
