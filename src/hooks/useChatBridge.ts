import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import type { ChatConnectionStatus, LivePerformanceStats } from '@/types';

export function useChatBridge() {
  const setChatStatus = useAppStore((s) => s.setChatStatus);
  const setLivePerformance = useAppStore((s) => s.setLivePerformance);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.chatGetStatus().then(setChatStatus);
    window.electronAPI.chatGetPerformance().then(setLivePerformance);

    const unsubStatus = window.electronAPI.onChatStatus((status) => {
      setChatStatus(status as ChatConnectionStatus);
    });

    const unsubPerf = window.electronAPI.onLivePerformance((stats) => {
      setLivePerformance(stats as LivePerformanceStats);
    });

    return () => {
      unsubStatus();
      unsubPerf();
    };
  }, [setChatStatus, setLivePerformance]);
}

export async function connectLiveChat(twitchChannel: string, tiktokUsername: string) {
  if (!window.electronAPI?.chatConnect) return;

  await window.electronAPI.chatClear();
  await window.electronAPI.chatConnect({
    twitchChannel: twitchChannel.trim() || undefined,
    tiktokUsername: tiktokUsername.trim() || undefined,
  });
}

export async function disconnectLiveChat() {
  await window.electronAPI?.chatDisconnect();
}
