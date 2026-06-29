import { create } from 'zustand';
import type {
  AlertChannel,
  AudioChannel,
  MediaChannel,
  MixerAdvancedSettings,
} from '@/types/audio';

interface AudioState {
  mixerOpen: boolean;
  mixerLocked: boolean;
  testingAudio: boolean;
  masterMuted: boolean;

  microphones: AudioChannel[];
  desktopAudio: AudioChannel[];
  mediaChannels: MediaChannel[];
  alertChannels: AlertChannel[];
  advanced: MixerAdvancedSettings;

  editingMicId: string | null;
  editingAudioId: string | null;
  effectsChannelId: string | null;

  setMixerOpen: (open: boolean) => void;
  setMixerLocked: (locked: boolean) => void;
  setTestingAudio: (testing: boolean) => void;
  setMasterMuted: (muted: boolean) => void;

  updateMicVolume: (id: string, volume: number) => void;
  updateDesktopVolume: (id: string, volume: number) => void;
  updateMediaVolume: (id: string, volume: number) => void;
  updateAlertVolume: (id: string, volume: number) => void;
  toggleMicMute: (id: string) => void;
  setChannelLevel: (id: string, level: number) => void;

  addDesktopAudio: () => void;
  removeDesktopAudio: (id: string) => void;
  updateMic: (id: string, patch: Partial<AudioChannel>) => void;
  updateDesktop: (id: string, patch: Partial<AudioChannel>) => void;

  setEditingMicId: (id: string | null) => void;
  setEditingAudioId: (id: string | null) => void;
  setEffectsChannelId: (id: string | null) => void;
  updateAdvanced: (patch: Partial<MixerAdvancedSettings>) => void;
  applyPersistedVolumes: (volumes: Record<string, number>) => void;
}

const defaultMic: AudioChannel = {
  id: 'mic-main',
  kind: 'microphone',
  name: 'Microfone',
  volume: 100,
  muted: false,
  level: 0,
  micSettings: {
    deviceId: 'default',
    deviceLabel: 'Microfone padrão',
    noiseSuppression: 'high',
    mono: false,
    audioCompensation: false,
    monitoring: 'off',
    echoCancellation: 'auto',
    signalProcessing: 'auto',
    effectPreset: 'none',
  },
};

const defaultDesktop: AudioChannel[] = [
  {
    id: 'audio-pc',
    kind: 'desktop',
    name: 'Áudio do desktop',
    volume: 80,
    muted: false,
    level: 0,
    desktopSettings: {
      deviceId: 'default',
      deviceLabel: 'Áudio do sistema',
      mono: false,
      audioCompensation: false,
      monitoring: 'off',
      effectPreset: 'none',
    },
  },
  {
    id: 'audio-spotify',
    kind: 'desktop',
    name: 'spotify',
    volume: 61,
    muted: false,
    level: 0,
    desktopSettings: {
      deviceId: 'default',
      deviceLabel: 'Dispositivo padrão (Voicemeeter Input)',
      mono: false,
      audioCompensation: false,
      monitoring: 'off',
      effectPreset: 'none',
    },
  },
  {
    id: 'audio-call',
    kind: 'desktop',
    name: 'call',
    volume: 63,
    muted: false,
    level: 0,
    desktopSettings: {
      deviceId: 'default',
      deviceLabel: 'Dispositivo padrão (Voicemeeter Input)',
      mono: false,
      audioCompensation: false,
      monitoring: 'off',
      effectPreset: 'none',
    },
  },
];

export const useAudioStore = create<AudioState>((set) => ({
  mixerOpen: false,
  mixerLocked: false,
  testingAudio: false,
  masterMuted: false,

  microphones: [defaultMic],
  desktopAudio: defaultDesktop,
  mediaChannels: [{ id: 'sfx', name: 'Efeitos sonoros', volume: 75 }],
  alertChannels: [
    { id: 'alert-follow', name: 'Alerta(Seguidores)', volume: 50 },
    { id: 'alert-gift', name: 'Alerta(Presentes)', volume: 50 },
  ],
  advanced: {
    expanded: false,
    coHostSpeaker: 'Dispositivo padrão (Voicemeeter Input)',
    backgroundMusicEnabled: true,
    backgroundMusicVolume: 100,
  },

  editingMicId: null,
  editingAudioId: null,
  effectsChannelId: null,

  setMixerOpen: (open) => set({ mixerOpen: open }),
  setMixerLocked: (locked) => set({ mixerLocked: locked }),
  setTestingAudio: (testing) => set({ testingAudio: testing }),
  setMasterMuted: (muted) => set({ masterMuted: muted }),

  updateMicVolume: (id, volume) =>
    set((s) => ({
      microphones: s.mixerLocked
        ? s.microphones
        : s.microphones.map((m) => (m.id === id ? { ...m, volume } : m)),
    })),

  updateDesktopVolume: (id, volume) =>
    set((s) => ({
      desktopAudio: s.mixerLocked
        ? s.desktopAudio
        : s.desktopAudio.map((a) => (a.id === id ? { ...a, volume } : a)),
    })),

  updateMediaVolume: (id, volume) =>
    set((s) => ({
      mediaChannels: s.mixerLocked
        ? s.mediaChannels
        : s.mediaChannels.map((m) => (m.id === id ? { ...m, volume } : m)),
    })),

  updateAlertVolume: (id, volume) =>
    set((s) => ({
      alertChannels: s.mixerLocked
        ? s.alertChannels
        : s.alertChannels.map((a) => (a.id === id ? { ...a, volume } : a)),
    })),

  toggleMicMute: (id) =>
    set((s) => ({
      microphones: s.microphones.map((m) =>
        m.id === id ? { ...m, muted: !m.muted } : m
      ),
    })),

  setChannelLevel: (id, level) =>
    set((s) => {
      const mic = s.microphones.find((m) => m.id === id);
      const desk = s.desktopAudio.find((a) => a.id === id);
      if (mic?.level === level && !desk) return s;
      if (desk?.level === level && !mic) return s;
      if (mic?.level === level && desk?.level === level) return s;

      return {
        microphones: s.microphones.map((m) => (m.id === id ? { ...m, level } : m)),
        desktopAudio: s.desktopAudio.map((a) => (a.id === id ? { ...a, level } : a)),
      };
    }),

  addDesktopAudio: () =>
    set((s) => ({
      desktopAudio: [
        ...s.desktopAudio,
        {
          id: `audio-${Date.now()}`,
          kind: 'desktop' as const,
          name: `Áudio ${s.desktopAudio.length + 1}`,
          volume: 50,
          muted: false,
          level: 0,
          desktopSettings: {
            deviceId: 'default',
            deviceLabel: 'Dispositivo padrão',
            mono: false,
            audioCompensation: false,
            monitoring: 'off',
            effectPreset: 'none',
          },
        },
      ],
    })),

  removeDesktopAudio: (id) =>
    set((s) => ({
      desktopAudio: s.desktopAudio.filter((a) => a.id !== id),
    })),

  updateMic: (id, patch) =>
    set((s) => ({
      microphones: s.microphones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  updateDesktop: (id, patch) =>
    set((s) => ({
      desktopAudio: s.desktopAudio.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  setEditingMicId: (id) => set({ editingMicId: id }),
  setEditingAudioId: (id) => set({ editingAudioId: id }),
  setEffectsChannelId: (id) => set({ effectsChannelId: id }),
  updateAdvanced: (patch) =>
    set((s) => ({ advanced: { ...s.advanced, ...patch } })),

  applyPersistedVolumes: (volumes) =>
    set((s) => ({
      microphones: s.microphones.map((m) =>
        volumes[m.id] !== undefined ? { ...m, volume: volumes[m.id] } : m
      ),
      desktopAudio: s.desktopAudio.map((a) =>
        volumes[a.id] !== undefined ? { ...a, volume: volumes[a.id] } : a
      ),
      mediaChannels: s.mediaChannels.map((m) =>
        volumes[m.id] !== undefined ? { ...m, volume: volumes[m.id] } : m
      ),
      alertChannels: s.alertChannels.map((a) =>
        volumes[a.id] !== undefined ? { ...a, volume: volumes[a.id] } : a
      ),
    })),
}));
