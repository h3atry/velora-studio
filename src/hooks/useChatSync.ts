import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import type { ChatMessage } from '@/types';

function playChatBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => void ctx.close();
  } catch {
    /* sem áudio */
  }
}

export function useChatSync() {
  const setMessagesRef = useRef(useAppStore.getState().setMessages);
  const initialized = useRef(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    setMessagesRef.current = useAppStore.getState().setMessages;
  });

  useEffect(() => {
    if (!window.electronAPI || initialized.current) return;
    initialized.current = true;

    void window.electronAPI.getChatMessages().then((cached) => {
      if (Array.isArray(cached) && cached.length > 0) {
        setMessagesRef.current(cached as ChatMessage[]);
      }
    });

    const unsub = window.electronAPI.onChatUpdate((payload) => {
      if (!Array.isArray(payload)) return;
      const msgs = payload as ChatMessage[];
      const chatSound = useAppStore.getState().chatSound;
      if (chatSound && msgs.length > prevCountRef.current) {
        playChatBeep();
      }
      prevCountRef.current = msgs.length;
      setMessagesRef.current(msgs);
    });

    return unsub;
  }, []);
}
