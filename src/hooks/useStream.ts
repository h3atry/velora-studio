import { useCallback, useEffect, useRef } from 'react';
import { connectLiveChat, disconnectLiveChat } from '@/hooks/useChatBridge';
import { useAppStore } from '@/stores/appStore';
import { useSceneStore } from '@/stores/sceneStore';
import { resolveStreamInput } from '@/utils/streamInput';
import type { PreviewMode } from '@/types';

function getStreamDimensions(previewMode: PreviewMode) {
  if (previewMode === 'landscape') {
    return { width: 1920, height: 1080 };
  }
  return { width: 1080, height: 1920 };
}

export function useStreamStats() {
  const isLive = useAppStore((s) => s.isLive);
  const setIsLive = useAppStore((s) => s.setIsLive);
  const setStats = useAppStore((s) => s.setStats);
  const setStreamError = useAppStore((s) => s.setStreamError);
  const setToast = useAppStore((s) => s.setToast);
  const wasLiveRef = useRef(false);

  useEffect(() => {
    if (!isLive || !window.electronAPI?.streamStatus) return;

    const interval = setInterval(async () => {
      const status = await window.electronAPI!.streamStatus();
      setStats({
        uploadKbps: status.uploadKbps,
        fps: status.fps,
        droppedFrames: status.droppedFrames,
        totalFrames: status.totalFrames ?? 0,
        bitrateWarning: status.bitrateWarning ?? null,
      });

      if (status.running) {
        wasLiveRef.current = true;
      }

      if (!status.running && isLive) {
        if (status.recordingPath && wasLiveRef.current) {
          setToast(`Gravação salva em: ${status.recordingPath}`);
        }
        wasLiveRef.current = false;
        await disconnectLiveChat();
        setIsLive(false);
        if (status.error) setStreamError(status.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, setStats, setIsLive, setStreamError, setToast]);
}

export function useStreamControl() {
  const isLive = useAppStore((s) => s.isLive);
  const setIsLive = useAppStore((s) => s.setIsLive);
  const previewMode = useAppStore((s) => s.previewMode);
  const streamSettings = useAppStore((s) => s.streamSettings);
  const setStreamError = useAppStore((s) => s.setStreamError);
  const setShowStreamSettings = useAppStore((s) => s.setShowStreamSettings);
  const setCountdownActive = useAppStore((s) => s.setCountdownActive);
  const setToast = useAppStore((s) => s.setToast);
  const setStreamTestPending = useAppStore((s) => s.setStreamTestPending);

  const validateBeforeLive = useCallback(() => {
    const enabled = streamSettings.destinations.filter((d) => d.enabled);
    const missingKey = enabled.find((d) => !d.streamKey.trim());
    if (missingKey) {
      setStreamError(`Informe a stream key do ${missingKey.platform === 'tiktok' ? 'TikTok' : 'Twitch'}`);
      setShowStreamSettings(true);
      return false;
    }

    const { scenes, activeSceneId } = useSceneStore.getState();
    const scene = scenes.find((s) => s.id === activeSceneId);
    const activeSources = scene?.sources.filter((s) => s.enabled) ?? [];
    const resolved = resolveStreamInput(activeSources);
    const { hasCamera, hasVideo } = resolved;

    if (activeSources.length === 0) {
      setStreamError('Adicione pelo menos uma origem na cena (Câmera, Captura de jogo, etc.)');
      return false;
    }

    if (!hasVideo) {
      setStreamError('Adicione uma origem de vídeo (Câmera ou Captura) para ir ao vivo');
      return false;
    }

    if (hasCamera && !streamSettings.cameraLabel) {
      setStreamError('Origem Câmera ativa — aguarde permissão ou escolha o dispositivo em Transmissão');
      setShowStreamSettings(true);
      return false;
    }

    const tiktokKey = streamSettings.destinations.find((d) => d.platform === 'tiktok' && d.enabled);
    if (tiktokKey && !tiktokKey.streamKey.trim()) {
      setStreamError('Informe a stream key do TikTok (manual após OAuth)');
      setShowStreamSettings(true);
      return false;
    }

    const twitchKey = streamSettings.destinations.find((d) => d.platform === 'twitch' && d.enabled);
    if (twitchKey?.streamKey && !twitchKey.streamKey.startsWith('live_')) {
      /* aviso soft — não bloqueia */
    }

    const info = useAppStore.getState().liveInfo;
    const hasTitle =
      info.twitch.title.trim().length > 0 || info.tiktok.title.trim().length > 0;
    if (!hasTitle) {
      setStreamError('Defina um título da LIVE em Configurações antes de ir ao vivo');
      return false;
    }

    return true;
  }, [streamSettings, setStreamError, setShowStreamSettings]);

  const goLive = useCallback(async () => {
    const { scenes, activeSceneId } = useSceneStore.getState();
    const scene = scenes.find((s) => s.id === activeSceneId);
    const activeSources = scene?.sources.filter((s) => s.enabled) ?? [];
    const { inputSource, captureTarget } = resolveStreamInput(activeSources);

    const { width, height } = getStreamDimensions(previewMode);
    const result = await window.electronAPI!.streamStart({
      cameraId: streamSettings.cameraLabel || captureTarget || 'default',
      audioId: streamSettings.audioLabel || undefined,
      width,
      height,
      fps: streamSettings.fps,
      bitrateKbps: streamSettings.bitrateKbps,
      destinations: streamSettings.destinations,
      recordLocal: streamSettings.recordLocal,
      desktopAudio: streamSettings.desktopAudio,
      reconnect: true,
      inputSource,
      captureTarget,
    });

    if (result.error) {
      setStreamError(result.error);
      return;
    }

    setIsLive(true);
    setStreamError(null);
    await connectLiveChat(streamSettings.twitchChannel, streamSettings.tiktokUsername);
  }, [previewMode, streamSettings, setIsLive, setStreamError]);

  const testStream = useCallback(async () => {
    if (!window.electronAPI?.streamTest) return;
    setStreamTestPending(true);
    setStreamError(null);
    setToast('Testando conexão RTMP (até 10s)…');

    const { width, height } = getStreamDimensions(previewMode);
    try {
      const res = await window.electronAPI.streamTest({
        cameraId: streamSettings.cameraLabel,
        width,
        height,
        fps: streamSettings.fps,
        bitrateKbps: streamSettings.bitrateKbps,
        destinations: streamSettings.destinations,
      });
      if (res.ok) {
        setStreamError(null);
        setToast('Teste RTMP OK — servidor respondeu em até 10s');
      } else {
        setToast(null);
        setStreamError(res.error ?? 'Teste falhou');
      }
    } finally {
      setStreamTestPending(false);
    }
  }, [previewMode, streamSettings, setStreamError, setToast, setStreamTestPending]);

  const toggleLive = useCallback(async () => {
    if (!window.electronAPI?.streamStart) {
      setStreamError('Streaming disponível apenas no app Electron');
      return;
    }

    if (isLive) {
      await window.electronAPI.streamStop();
      await disconnectLiveChat();
      setIsLive(false);
      setStreamError(null);
      return;
    }

    if (!validateBeforeLive()) return;

    const ffmpegOk = window.electronAPI.ffmpegAvailable
      ? await window.electronAPI.ffmpegAvailable()
      : true;
    if (!ffmpegOk) {
      setStreamError('FFmpeg não encontrado. Reinstale o Velora ou execute npm run sync.');
      return;
    }

    setCountdownActive(true);
  }, [isLive, validateBeforeLive, setIsLive, setStreamError, setCountdownActive]);

  return { toggleLive, testStream, goLive, validateBeforeLive };
}

export function useCountdownTrigger() {
  const countdownActive = useAppStore((s) => s.countdownActive);
  const isLive = useAppStore((s) => s.isLive);
  const { goLive } = useStreamControl();
  const goLiveRef = useRef(goLive);
  const wasCounting = useRef(false);

  useEffect(() => {
    goLiveRef.current = goLive;
  }, [goLive]);

  useEffect(() => {
    if (countdownActive) {
      wasCounting.current = true;
      return;
    }
    if (wasCounting.current && !isLive) {
      wasCounting.current = false;
      void goLiveRef.current();
    }
  }, [countdownActive, isLive]);
}
