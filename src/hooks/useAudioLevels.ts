import { useEffect, useRef } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useAppStore } from '@/stores/appStore';
import { useHasEnabledCamera } from '@/hooks/useSceneSources';

export function useAudioLevels() {
  const isLive = useAppStore((s) => s.isLive);
  const hasMicSource = useHasEnabledCamera();
  const audioLabel = useAppStore((s) => s.streamSettings.audioLabel);
  const testing = useAudioStore((s) => s.testingAudio);
  const setChannelLevel = useAudioStore((s) => s.setChannelLevel);
  const micIdsRef = useRef(['mic-main']);

  const shouldRun = isLive || testing || hasMicSource || Boolean(audioLabel);

  useEffect(() => {
    if (!shouldRun) return;

    let raf = 0;
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const level = Math.min(100, (sum / data.length / 255) * 140);
          for (const id of micIdsRef.current) {
            setChannelLevel(id, level);
          }
          raf = requestAnimationFrame(loop);
        };
        loop();

        return () => {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => undefined);
        };
      } catch {
        /* sem permissão de microfone */
      }
    }

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [shouldRun, setChannelLevel]);
}
