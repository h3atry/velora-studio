import { create } from 'zustand';
import type {
  ChatConnectionStatus,
  ChatMessage,
  ChatWindowMode,
  LiveInfo,
  LivePerformanceStats,
  Moderator,
  Platform,
  PreviewMode,
  StreamSettings,
  StreamStats,
  VideoSettings,
} from '@/types';

const defaultVideoSettings: VideoSettings = {
  resolution: '1280×720',
  fps: 60,
  videoBitrate: 3800,
  audioBitrate: 128,
};

const defaultLiveInfo: LiveInfo = {
  title: '',
  category: '',
  game: '',
  gameId: '',
  topic: 'Jogos',
  hashtags: '',
  language: 'pt-BR',
  aboutMe: '',
  followerGoal: 400,
  followerCurrent: 363,
  videoSettings: { ...defaultVideoSettings },
};

interface AppState {
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;

  connectedPlatforms: Platform[];
  activeInfoPlatform: Platform;
  setActiveInfoPlatform: (platform: Platform) => void;

  liveInfo: Record<Platform, LiveInfo>;
  updateLiveInfo: (platform: Platform, patch: Partial<LiveInfo>) => void;
  setLiveInfoAll: (info: Record<Platform, LiveInfo>) => void;

  moderators: Moderator[];
  setModerators: (mods: Moderator[]) => void;
  addModerator: (mod: Moderator) => void;
  removeModerator: (id: string) => void;

  showLiveSettings: boolean;
  setShowLiveSettings: (show: boolean) => void;

  showDiagnostics: boolean;
  setShowDiagnostics: (show: boolean) => void;

  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => void;

  previewOffDuringLive: boolean;
  setPreviewOffDuringLive: (off: boolean) => void;

  chatSound: boolean;
  setChatSound: (on: boolean) => void;

  countdownActive: boolean;
  setCountdownActive: (active: boolean) => void;

  isLive: boolean;
  setIsLive: (live: boolean) => void;

  chatMode: ChatWindowMode;
  setChatMode: (mode: ChatWindowMode) => void;

  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;

  stats: StreamStats;
  setStats: (stats: Partial<StreamStats>) => void;

  streamSettings: StreamSettings;
  updateStreamSettings: (patch: Partial<StreamSettings>) => void;
  updateDestination: (platform: Platform, patch: Partial<StreamSettings['destinations'][0]>) => void;

  streamError: string | null;
  setStreamError: (error: string | null) => void;

  recordingPath: string | null;
  setRecordingPath: (path: string | null) => void;

  showStreamSettings: boolean;
  setShowStreamSettings: (show: boolean) => void;

  chatStatus: ChatConnectionStatus;
  setChatStatus: (status: ChatConnectionStatus) => void;

  livePerformance: LivePerformanceStats;
  setLivePerformance: (stats: Partial<LivePerformanceStats>) => void;

  toast: string | null;
  setToast: (message: string | null) => void;

  streamTestPending: boolean;
  setStreamTestPending: (pending: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  previewMode: 'dual',
  setPreviewMode: (mode) => set({ previewMode: mode }),

  connectedPlatforms: ['tiktok', 'twitch'],
  activeInfoPlatform: 'tiktok',
  setActiveInfoPlatform: (platform) => set({ activeInfoPlatform: platform }),

  liveInfo: {
    tiktok: { ...defaultLiveInfo },
    twitch: { ...defaultLiveInfo },
  },
  updateLiveInfo: (platform, patch) =>
    set((s) => ({
      liveInfo: {
        ...s.liveInfo,
        [platform]: { ...s.liveInfo[platform], ...patch },
      },
    })),
  setLiveInfoAll: (info) => set({ liveInfo: info }),

  moderators: [],
  setModerators: (mods) => set({ moderators: mods }),
  addModerator: (mod) =>
    set((s) => {
      if (s.moderators.length >= 30) return s;
      const handle = mod.handle.toLowerCase();
      if (s.moderators.some((m) => m.handle.toLowerCase() === handle)) return s;
      return { moderators: [...s.moderators, mod] };
    }),
  removeModerator: (id) =>
    set((s) => ({
      moderators: s.moderators.filter((m) => m.id !== id),
    })),

  showLiveSettings: false,
  setShowLiveSettings: (show) => set({ showLiveSettings: show }),

  showDiagnostics: false,
  setShowDiagnostics: (show) => set({ showDiagnostics: show }),

  onboardingDone: false,
  setOnboardingDone: (done) => set({ onboardingDone: done }),

  previewOffDuringLive: false,
  setPreviewOffDuringLive: (off) => set({ previewOffDuringLive: off }),

  chatSound: false,
  setChatSound: (on) => set({ chatSound: on }),

  countdownActive: false,
  setCountdownActive: (active) => set({ countdownActive: active }),

  isLive: false,
  setIsLive: (live) => set({ isLive: live }),

  chatMode: 'docked',
  setChatMode: (mode) => set({ chatMode: mode }),

  messages: [],
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg].slice(-500),
    })),
  setMessages: (messages) => set({ messages }),

  stats: {
    cpu: 1.45,
    memory: 0.21,
    uploadKbps: 0,
    fps: 60,
    droppedFrames: 0,
    totalFrames: 0,
  },
  setStats: (stats) =>
    set((s) => ({
      stats: { ...s.stats, ...stats },
    })),

  streamSettings: {
    cameraLabel: '',
    cameraDeviceId: '',
    audioLabel: '',
    bitrateKbps: 4500,
    fps: 30,
    twitchChannel: '',
    tiktokUsername: '',
    recordLocal: false,
    desktopAudio: false,
    destinations: [
      {
        platform: 'tiktok',
        enabled: true,
        rtmpUrl: 'rtmp://push-rtmp-global.tiktoklive.com/live',
        streamKey: '',
      },
      {
        platform: 'twitch',
        enabled: true,
        rtmpUrl: 'rtmp://live.twitch.tv/app',
        streamKey: '',
      },
    ],
  },
  updateStreamSettings: (patch) =>
    set((s) => ({
      streamSettings: { ...s.streamSettings, ...patch },
    })),
  updateDestination: (platform, patch) =>
    set((s) => ({
      streamSettings: {
        ...s.streamSettings,
        destinations: s.streamSettings.destinations.map((d) =>
          d.platform === platform ? { ...d, ...patch } : d
        ),
      },
    })),

  streamError: null,
  setStreamError: (error) => set({ streamError: error }),

  recordingPath: null,
  setRecordingPath: (path) => set({ recordingPath: path }),

  showStreamSettings: false,
  setShowStreamSettings: (show) => set({ showStreamSettings: show }),

  chatStatus: { twitch: 'disconnected', tiktok: 'disconnected' },
  setChatStatus: (status) => set({ chatStatus: status }),

  livePerformance: {
    tiktokViewers: 0,
    twitchViewers: 0,
    tiktokLikes: 0,
    tiktokDiamonds: 0,
  },
  setLivePerformance: (stats) =>
    set((s) => ({
      livePerformance: { ...s.livePerformance, ...stats },
    })),

  toast: null,
  setToast: (message) => set({ toast: message }),

  streamTestPending: false,
  setStreamTestPending: (pending) => set({ streamTestPending: pending }),
}));
