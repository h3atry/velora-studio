export type AudioSourceKind = 'microphone' | 'desktop';

export type NoiseSuppression = 'off' | 'low' | 'medium' | 'high';
export type MonitoringMode = 'off' | 'monitor';
export type AutoSetting = 'auto' | 'off' | 'on';

export interface MicrophoneSettings {
  deviceId: string;
  deviceLabel: string;
  noiseSuppression: NoiseSuppression;
  mono: boolean;
  audioCompensation: boolean;
  monitoring: MonitoringMode;
  echoCancellation: AutoSetting;
  signalProcessing: AutoSetting;
  effectPreset: string;
}

export interface DesktopAudioSettings {
  deviceId: string;
  deviceLabel: string;
  mono: boolean;
  audioCompensation: boolean;
  monitoring: MonitoringMode;
  effectPreset: string;
}

export interface AudioChannel {
  id: string;
  kind: AudioSourceKind;
  name: string;
  volume: number;
  muted: boolean;
  level: number;
  micSettings?: MicrophoneSettings;
  desktopSettings?: DesktopAudioSettings;
}

export interface MediaChannel {
  id: string;
  name: string;
  volume: number;
}

export interface AlertChannel {
  id: string;
  name: string;
  volume: number;
}

export interface MixerAdvancedSettings {
  expanded: boolean;
  coHostSpeaker: string;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number;
}

export type AudioEffectsTab = 'models' | 'equalizer' | 'reverb';

export const AUDIO_EFFECT_PRESETS = [
  { id: 'none', label: 'Nenhum' },
  { id: 'deep', label: 'Profundo' },
  { id: 'vocal', label: 'Aprimoramento vocal' },
  { id: 'bass', label: 'Aprimoramento do grave' },
  { id: 'michog', label: 'Mic hog' },
  { id: 'megaphone', label: 'Megafone' },
  { id: 'vinyl', label: 'Vinil' },
  { id: 'phonography', label: 'Fonografia' },
  { id: 'revolving', label: 'Revolving' },
  { id: 'walkie', label: 'Walkie-talkie' },
  { id: 'ethereal', label: 'Etéreo' },
  { id: 'emptyroom', label: 'Sala vazia' },
  { id: 'sanctuary', label: 'Santuário' },
] as const;
