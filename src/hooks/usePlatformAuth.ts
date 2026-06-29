import { useAppStore } from '@/stores/appStore';
import type { Platform, PlatformAccountStatus, PlatformConnectionResult } from '@/types';
import { useCallback, useEffect, useState } from 'react';

function accountsMap(list: PlatformAccountStatus[]) {
  return {
    tiktok: list.find((a) => a.platform === 'tiktok'),
    twitch: list.find((a) => a.platform === 'twitch'),
  };
}

function applyConnectionToStore(
  result: PlatformConnectionResult,
  updateDestination: ReturnType<typeof useAppStore.getState>['updateDestination'],
  updateStreamSettings: ReturnType<typeof useAppStore.getState>['updateStreamSettings']
) {
  if (!result.connected || !result.profile) return;

  if (result.platform === 'twitch') {
    updateStreamSettings({ twitchChannel: result.profile.username });
  } else {
    updateStreamSettings({ tiktokUsername: result.profile.username });
  }

  if (result.rtmpUrl && result.streamKey) {
    updateDestination(result.platform, {
      enabled: true,
      rtmpUrl: result.rtmpUrl,
      streamKey: result.streamKey,
    });
  }
}

export function usePlatformAuth() {
  const updateDestination = useAppStore((s) => s.updateDestination);
  const updateStreamSettings = useAppStore((s) => s.updateStreamSettings);

  const [accounts, setAccounts] = useState<{
    tiktok?: PlatformAccountStatus;
    twitch?: PlatformAccountStatus;
  }>({});
  const [oauthConfigured, setOauthConfigured] = useState({ tiktok: false, twitch: false });
  const [loading, setLoading] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    if (!window.electronAPI?.authGetAccounts) return;

    const list = await window.electronAPI.authGetAccounts();
    setAccounts(accountsMap(list));

    const [tiktokOk, twitchOk] = await Promise.all([
      window.electronAPI.authOAuthConfigured('tiktok'),
      window.electronAPI.authOAuthConfigured('twitch'),
    ]);
    setOauthConfigured({ tiktok: tiktokOk, twitch: twitchOk });
  }, []);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const connect = async (platform: Platform) => {
    if (!window.electronAPI?.authConnect) {
      setError('Conexão disponível apenas no app Electron');
      return;
    }

    setLoading(platform);
    setError(null);

    try {
      const result = await window.electronAPI.authConnect(platform);

      if (result.error || !result.connected) {
        setError(result.error ?? 'Falha ao conectar');
        return;
      }

      applyConnectionToStore(result, updateDestination, updateStreamSettings);

      if (result.message) setError(result.message);

      await refreshAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setLoading(null);
    }
  };

  const disconnect = async (platform: Platform) => {
    await window.electronAPI?.authDisconnect(platform);
    updateDestination(platform, { streamKey: '', enabled: false });
    if (platform === 'twitch') updateStreamSettings({ twitchChannel: '' });
    else updateStreamSettings({ tiktokUsername: '' });
    await refreshAccounts();
  };

  const refreshKey = async (platform: Platform) => {
    setLoading(platform);
    setError(null);
    try {
      const { rtmpUrl, streamKey } = await window.electronAPI!.authRefreshKey(platform);
      updateDestination(platform, { rtmpUrl, streamKey, enabled: true });
      await refreshAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar key');
    } finally {
      setLoading(null);
    }
  };

  const saveManualKey = async (platform: Platform, streamKey: string) => {
    if (!streamKey.trim()) return;
    await window.electronAPI?.authSaveManualKey(platform, streamKey);
    updateDestination(platform, {
      streamKey: streamKey.trim(),
      enabled: true,
      rtmpUrl:
        platform === 'twitch'
          ? 'rtmp://live.twitch.tv/app'
          : 'rtmp://push-rtmp-global.tiktoklive.com/live',
    });
    await refreshAccounts();
  };

  return {
    accounts,
    oauthConfigured,
    loading,
    error,
    connect,
    disconnect,
    refreshKey,
    saveManualKey,
    refreshAccounts,
  };
}
