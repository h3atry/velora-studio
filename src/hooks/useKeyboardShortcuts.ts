import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useAudioStore } from '@/stores/audioStore';

export function useKeyboardShortcuts() {
  const setShowStreamSettings = useAppStore((s) => s.setShowStreamSettings);
  const setShowDiagnostics = useAppStore((s) => s.setShowDiagnostics);
  const setCountdownActive = useAppStore((s) => s.setCountdownActive);
  const isLive = useAppStore((s) => s.isLive);
  const setIsLive = useAppStore((s) => s.setIsLive);
  const masterMuted = useAudioStore((s) => s.masterMuted);
  const setMasterMuted = useAudioStore((s) => s.setMasterMuted);

  const stateRef = useRef({ isLive, masterMuted });
  useEffect(() => {
    stateRef.current = { isLive, masterMuted };
  }, [isLive, masterMuted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDiagnostics(true);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const live = stateRef.current.isLive;
        if (live) {
          void window.electronAPI?.streamStop().then(() => {
            void window.electronAPI?.chatDisconnect();
            setIsLive(false);
          });
        } else {
          setCountdownActive(true);
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMasterMuted(!stateRef.current.masterMuted);
        return;
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setShowStreamSettings(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setShowStreamSettings, setShowDiagnostics, setMasterMuted, setIsLive, setCountdownActive]);
}
