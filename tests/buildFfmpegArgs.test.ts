import { describe, expect, it } from 'vitest';
import { buildFfmpegArgs, PLATFORM_PRESETS } from '../electron/streamService';
import { filterMessages } from '../electron/services/chatExport';
import type { UnifiedChatMessage } from '../electron/chatTypes';

describe('buildFfmpegArgs', () => {
  const baseConfig = {
    cameraId: 'OBS Virtual Camera',
    audioId: 'Microphone',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrateKbps: 6000,
    destinations: [
      {
        platform: 'twitch' as const,
        enabled: true,
        rtmpUrl: 'rtmp://live.twitch.tv/app',
        streamKey: 'live_abc123',
      },
    ],
  };

  it('includes GOP = fps * 2', () => {
    const args = buildFfmpegArgs(baseConfig);
    const gopIndex = args.indexOf('-g');
    expect(gopIndex).toBeGreaterThan(-1);
    expect(args[gopIndex + 1]).toBe('120');
  });

  it('throws when no destinations', () => {
    expect(() =>
      buildFfmpegArgs({ ...baseConfig, destinations: [] })
    ).toThrow();
  });

  it('platform presets exist', () => {
    expect(PLATFORM_PRESETS.tiktok.height).toBe(1920);
    expect(PLATFORM_PRESETS.twitch.bitrateKbps).toBe(6000);
  });
});

describe('filterMessages', () => {
  const msgs: UnifiedChatMessage[] = [
    {
      id: '1',
      platform: 'twitch',
      userId: 'u1',
      displayName: 'User',
      message: 'hello spam',
      timestamp: 1,
      badges: [],
    },
    {
      id: '2',
      platform: 'tiktok',
      userId: 'u2',
      displayName: 'Fan',
      message: 'oi',
      timestamp: 2,
      badges: ['follower'],
    },
  ];

  it('blocks words', () => {
    const out = filterMessages(msgs, { blockedWords: ['spam'], followersOnly: false });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('2');
  });

  it('followers only', () => {
    const out = filterMessages(msgs, { blockedWords: [], followersOnly: true });
    expect(out).toHaveLength(1);
  });
});
