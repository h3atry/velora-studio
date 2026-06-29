import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useHasEnabledCamera } from '@/hooks/useSceneSources';
import type { MediaDeviceInfo } from '@/types';

const CameraStreamContext = createContext<MediaStream | null>(null);

async function loadCameraDevices(requestPermission: boolean): Promise<MediaDeviceInfo[]> {
  if (requestPermission) {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      /* sem câmera ou permissão negada */
    }
  }

  const browserDevices = await navigator.mediaDevices.enumerateDevices();
  let ffmpegDevices: { label: string; kind: 'video' | 'audio' }[] = [];

  if (window.electronAPI?.listMediaDevices) {
    ffmpegDevices = await window.electronAPI.listMediaDevices();
  }

  const videoInputs = browserDevices.filter((d) => d.kind === 'videoinput');
  const audioInputs = browserDevices.filter((d) => d.kind === 'audioinput');

  const merge = (
    browser: typeof videoInputs | typeof audioInputs,
    kind: 'video' | 'audio'
  ): MediaDeviceInfo[] =>
    browser.map((device) => {
      const ffmpegMatch = ffmpegDevices.find(
        (f) =>
          f.kind === kind &&
          f.label &&
          device.label &&
          f.label.toLowerCase().includes(device.label.toLowerCase().slice(0, 8))
      );
      return {
        label: device.label || `Câmera ${kind}`,
        deviceId: device.deviceId,
        kind,
        ffmpegName: ffmpegMatch?.label || device.label || device.deviceId,
      };
    });

  return [...merge(videoInputs, 'video'), ...merge(audioInputs, 'audio')];
}

/** Só carrega lista de dispositivos quando o modal de transmissão está aberto */
export function useCameraDevices(enabled = false) {
  const updateStreamSettings = useAppStore((s) => s.updateStreamSettings);
  const streamSettings = useAppStore((s) => s.streamSettings);
  const hasCameraSource = useHasEnabledCamera();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [ready, setReady] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const loadedRef = useRef(false);

  const shouldLoad = enabled && hasCameraSource;

  useEffect(() => {
    if (!shouldLoad) {
      loadedRef.current = false;
      setReady(false);
      setDevices([]);
      return;
    }

    if (loadedRef.current) return;

    let cancelled = false;

    async function init() {
      const list = await loadCameraDevices(false);
      if (cancelled) return;

      const hasLabels = list.some((d) => d.kind === 'video' && d.label && d.label !== 'Câmera video');
      if (!hasLabels) {
        setNeedsPermission(true);
        setDevices(list);
        setReady(true);
        return;
      }

      loadedRef.current = true;
      setDevices(list);
      setNeedsPermission(false);

      const firstCamera = list.find((d) => d.kind === 'video');
      const firstAudio = list.find((d) => d.kind === 'audio');

      if (firstCamera && !streamSettings.cameraDeviceId) {
        updateStreamSettings({
          cameraDeviceId: firstCamera.deviceId,
          cameraLabel: firstCamera.ffmpegName,
          audioLabel: firstAudio?.ffmpegName ?? streamSettings.audioLabel,
        });
      }

      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, streamSettings.cameraDeviceId, streamSettings.audioLabel, updateStreamSettings]);

  const requestPermission = async () => {
    const list = await loadCameraDevices(true);
    setDevices(list);
    setNeedsPermission(false);
    loadedRef.current = true;

    const firstCamera = list.find((d) => d.kind === 'video');
    const firstAudio = list.find((d) => d.kind === 'audio');
    if (firstCamera) {
      updateStreamSettings({
        cameraDeviceId: firstCamera.deviceId,
        cameraLabel: firstCamera.ffmpegName,
        audioLabel: firstAudio?.ffmpegName ?? streamSettings.audioLabel,
      });
    }
    setReady(true);
  };

  return { devices, ready, needsPermission, requestPermission };
}

export function CameraStreamProvider({ children }: { children: ReactNode }) {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const hasCameraSource = useHasEnabledCamera();
  const cameraDeviceId = useAppStore((s) => s.streamSettings.cameraDeviceId);
  const updateStreamSettings = useAppStore((s) => s.updateStreamSettings);
  const isLive = useAppStore((s) => s.isLive);
  const previewOffDuringLive = useAppStore((s) => s.previewOffDuringLive);

  useEffect(() => {
    if (!hasCameraSource) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      return;
    }

    if (isLive && previewOffDuringLive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      return;
    }

    let active = true;

    async function start() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);

      let deviceId = cameraDeviceId;

      if (!deviceId) {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          deviceId = probe.getVideoTracks()[0]?.getSettings().deviceId ?? '';
          probe.getTracks().forEach((t) => t.stop());
          if (deviceId && active) {
            const list = await loadCameraDevices(false);
            const match = list.find((d) => d.deviceId === deviceId);
            updateStreamSettings({
              cameraDeviceId: deviceId,
              cameraLabel: match?.ffmpegName ?? match?.label ?? deviceId,
            });
          }
        } catch {
          if (active) setStream(null);
          return;
        }
      }

      if (!deviceId || !active) return;

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { ideal: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!active) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
      } catch (err) {
        if (active) setStream(null);
        if (active && err instanceof DOMException && err.name === 'NotFoundError') {
          console.warn('Nenhuma câmera física detectada');
        }
      }
    }

    void start();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    };
  }, [hasCameraSource, cameraDeviceId, isLive, previewOffDuringLive, updateStreamSettings]);

  useEffect(() => {
    const onUnload = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  return (
    <CameraStreamContext.Provider value={stream}>{children}</CameraStreamContext.Provider>
  );
}

interface CameraPreviewProps {
  aspect: 'portrait' | 'landscape';
  className?: string;
}

export function CameraPreview({ aspect, className = '' }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sharedStream = useContext(CameraStreamContext);
  const hasCameraSource = useHasEnabledCamera();
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!hasCameraSource) return;
    if (sharedStream && videoRef.current) {
      videoRef.current.srcObject = sharedStream;
      setWaiting(false);
      return;
    }
    setWaiting(true);
  }, [hasCameraSource, sharedStream]);

  const aspectClass =
    aspect === 'portrait' ? 'aspect-[9/16] max-h-full' : 'aspect-video w-full';

  if (!hasCameraSource) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden pl-preview-frame bg-pl-bg-deep ${aspectClass} ${className}`}
    >
      {waiting || !sharedStream ? (
        <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-center text-xs text-pl-muted">
          {waiting
            ? 'Conectando câmera…'
            : 'Sem câmera física ou permissão negada — conecte uma webcam ou verifique privacidade do Windows'}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover ${aspect === 'portrait' ? 'object-center' : ''}`}
        />
      )}
    </div>
  );
}

export function PreviewEmptyState({ aspect }: { aspect: 'portrait' | 'landscape' }) {
  const aspectClass =
    aspect === 'portrait' ? 'aspect-[9/16] max-h-full' : 'aspect-video w-full';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-pl-border bg-pl-bg-deep/80 p-6 text-center ${aspectClass} mx-auto w-full`}
    >
      <p className="text-sm font-medium text-pl-text">Preview vazio</p>
      <p className="max-w-[220px] text-[11px] leading-relaxed text-pl-muted">
        Adicione uma origem na sidebar — por exemplo <strong className="text-pl-accent">Câmera</strong> ou{' '}
        <strong className="text-pl-accent">Captura de jogo</strong>.
      </p>
    </div>
  );
}
