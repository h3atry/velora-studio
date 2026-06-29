import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useAudioStore } from '@/stores/audioStore';
import type { LiveInfo, Moderator, Platform, StreamSettings } from '@/types';

function collectAudioVolumes(): Record<string, number> {
  const s = useAudioStore.getState();
  const volumes: Record<string, number> = {};
  for (const m of s.microphones) volumes[m.id] = m.volume;
  for (const d of s.desktopAudio) volumes[d.id] = d.volume;
  for (const m of s.mediaChannels) volumes[m.id] = m.volume;
  for (const a of s.alertChannels) volumes[a.id] = a.volume;
  return volumes;
}

export function usePersist() {
  const setLiveInfoAll = useAppStore((s) => s.setLiveInfoAll);
  const setModerators = useAppStore((s) => s.setModerators);
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone);
  const setPreviewOffDuringLive = useAppStore((s) => s.setPreviewOffDuringLive);
  const setChatSound = useAppStore((s) => s.setChatSound);
  const updateStreamSettings = useAppStore((s) => s.updateStreamSettings);
  const liveInfo = useAppStore((s) => s.liveInfo);
  const moderators = useAppStore((s) => s.moderators);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const previewOffDuringLive = useAppStore((s) => s.previewOffDuringLive);
  const chatSound = useAppStore((s) => s.chatSound);
  const microphones = useAudioStore((s) => s.microphones);
  const desktopAudio = useAudioStore((s) => s.desktopAudio);
  const mediaChannels = useAudioStore((s) => s.mediaChannels);
  const alertChannels = useAudioStore((s) => s.alertChannels);
  const applyPersistedVolumes = useAudioStore((s) => s.applyPersistedVolumes);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.persistLoadApp) return;

    void (async () => {
      const [appData, settings, sync] = await Promise.all([
        api.persistLoadApp!() as Promise<{
          liveInfo?: Record<Platform, LiveInfo> | null;
          moderators?: Moderator[];
          onboardingDone?: boolean;
        }>,
        api.persistLoadSettings!() as Promise<{
          previewOffDuringLive?: boolean;
          chatSound?: boolean;
          audioVolumes?: Record<string, number>;
        }>,
        api.authSyncStreamSettings!() as Promise<{
          twitchChannel?: string;
          tiktokUsername?: string;
          destinations?: { platform: Platform; streamKey: string; rtmpUrl: string }[];
        }>,
      ]);

      if (appData.liveInfo) setLiveInfoAll(appData.liveInfo);
      if (appData.moderators) setModerators(appData.moderators);
      if (appData.onboardingDone) setOnboardingDone(true);
      if (settings.previewOffDuringLive !== undefined) {
        setPreviewOffDuringLive(settings.previewOffDuringLive);
      }
      if (settings.chatSound !== undefined) setChatSound(settings.chatSound);
      if (settings.audioVolumes) applyPersistedVolumes(settings.audioVolumes);

      const patch: Partial<StreamSettings> = {};
      if (sync.twitchChannel) patch.twitchChannel = sync.twitchChannel;
      if (sync.tiktokUsername) patch.tiktokUsername = sync.tiktokUsername;

      if (sync.destinations?.length) {
        const current = useAppStore.getState().streamSettings;
        patch.destinations = current.destinations.map((d) => {
          const oauth = sync.destinations!.find((o) => o.platform === d.platform);
          return oauth ? { ...d, streamKey: oauth.streamKey, rtmpUrl: oauth.rtmpUrl } : d;
        });
      }

      if (Object.keys(patch).length) updateStreamSettings(patch);
    })();
  }, [
    setLiveInfoAll,
    setModerators,
    setOnboardingDone,
    setPreviewOffDuringLive,
    setChatSound,
    updateStreamSettings,
    applyPersistedVolumes,
  ]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.persistSaveApp) return;
    const timer = setTimeout(() => {
      void api.persistSaveApp!({
        liveInfo,
        moderators,
        onboardingDone,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [liveInfo, moderators, onboardingDone]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.persistSaveSettings) return;
    const timer = setTimeout(() => {
      void api.persistSaveSettings!({
        previewOffDuringLive,
        chatSound,
        audioVolumes: collectAudioVolumes(),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [previewOffDuringLive, chatSound, microphones, desktopAudio, mediaChannels, alertChannels]);
}

export async function exportAppConfig(): Promise<{ ok: boolean; path?: string }> {
  const api = window.electronAPI;
  if (!api?.persistExportConfig) return { ok: false };
  return api.persistExportConfig();
}

export async function importAppConfig(): Promise<{ ok: boolean; path?: string }> {
  const api = window.electronAPI;
  if (!api?.persistImportConfig) return { ok: false };
  const result = await api.persistImportConfig();
  if (result.ok) window.location.reload();
  return result;
}

export function useSystemStats() {
  const setStats = useAppStore((s) => s.setStats);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.systemStats) return;
    const tick = async () => {
      const s = await api.systemStats!();
      setStats({ cpu: s.cpu, memory: s.memory });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [setStats]);
}

export function useTwitchViewers() {
  const isLive = useAppStore((s) => s.isLive);
  const channel = useAppStore((s) => s.streamSettings.twitchChannel);
  const setLivePerformance = useAppStore((s) => s.setLivePerformance);

  useEffect(() => {
    const api = window.electronAPI;
    if (!isLive || !channel || !api?.twitchViewers) return;
    const tick = async () => {
      const count = await api.twitchViewers!(channel);
      if (count > 0) {
        const prev = useAppStore.getState().livePerformance.twitchViewers;
        setLivePerformance({ twitchViewers: Math.max(prev, count) });
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [isLive, channel, setLivePerformance]);
}
