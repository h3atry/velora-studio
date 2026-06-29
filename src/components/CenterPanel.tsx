import { LiveInfoPanel } from '@/components/LiveInfoPanel';
import { PreviewArea } from '@/components/PreviewArea';
import { StreamSettingsModal } from '@/components/StreamSettingsModal';
import { AudioEffectsModal } from '@/components/audio/AudioEffectsModal';
import { AudioMixerPanel } from '@/components/audio/AudioMixerPanel';
import { EditAudioModal } from '@/components/audio/EditAudioModal';
import { EditMicrophoneModal } from '@/components/audio/EditMicrophoneModal';
import { CameraStreamProvider } from '@/hooks/useCamera';
import { useAudioLevels } from '@/hooks/useAudioLevels';
import { useStreamControl, useStreamStats, useCountdownTrigger } from '@/hooks/useStream';
import { useAudioStore } from '@/stores/audioStore';
import { Mic, MicOff, Radio, Settings2, SlidersHorizontal, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useRef, useState } from 'react';

export function CenterPanel() {
  const isLive = useAppStore((s) => s.isLive);
  const streamError = useAppStore((s) => s.streamError);
  const setStreamError = useAppStore((s) => s.setStreamError);
  const recordingPath = useAppStore((s) => s.recordingPath);
  const setShowStreamSettings = useAppStore((s) => s.setShowStreamSettings);
  const { toggleLive } = useStreamControl();
  useStreamStats();
  useCountdownTrigger();
  useAudioLevels();

  const mixerOpen = useAudioStore((s) => s.mixerOpen);
  const setMixerOpen = useAudioStore((s) => s.setMixerOpen);
  const masterMuted = useAudioStore((s) => s.masterMuted);
  const setMasterMuted = useAudioStore((s) => s.setMasterMuted);
  const toggleMicMute = useAudioStore((s) => s.toggleMicMute);
  const micMuted = useAudioStore((s) => s.microphones[0]?.muted ?? false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [dismissedRecording, setDismissedRecording] = useState<string | null>(null);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <LiveInfoPanel />
      <StreamSettingsModal />
      <EditMicrophoneModal />
      <EditAudioModal />
      <AudioEffectsModal />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <CameraStreamProvider>
          <PreviewArea />
        </CameraStreamProvider>

        {streamError && (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-300">
            <p className="min-w-0 flex-1">{streamError}</p>
            <button
              type="button"
              title="Dispensar"
              onClick={() => setStreamError(null)}
              className="shrink-0 rounded p-0.5 hover:bg-red-800/40"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {recordingPath && recordingPath !== dismissedRecording && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-pl-accent/30 bg-pl-accent/10 px-3 py-2 text-xs text-pl-accent">
            <p className="min-w-0 flex-1">
              Gravando em: <span className="font-mono">{recordingPath}</span>
            </p>
            <button
              type="button"
              title="Dispensar"
              onClick={() => setDismissedRecording(recordingPath)}
              className="shrink-0 rounded p-0.5 hover:bg-pl-accent/20"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div ref={toolbarRef} className="relative mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToolbarButton
              icon={SlidersHorizontal}
              title="Mixer de áudio"
              active={mixerOpen}
              onClick={() => setMixerOpen(!mixerOpen)}
            />
            <ToolbarButton
              icon={Settings2}
              title="Configurações de transmissão"
              onClick={() => setShowStreamSettings(true)}
            />
            <button
              type="button"
              title={micMuted || masterMuted ? 'Ativar microfone' : 'Silenciar microfone'}
              onClick={() => {
                toggleMicMute('mic-main');
                setMasterMuted(!masterMuted);
              }}
              className={`rounded-lg p-2 transition-colors ${
                !micMuted && !masterMuted
                  ? 'bg-pl-hover text-pl-text'
                  : 'bg-red-900/50 text-red-400'
              }`}
            >
              {!micMuted && !masterMuted ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
          </div>

          <AudioMixerPanel anchorRef={toolbarRef} />

          <button
            type="button"
            onClick={() => toggleLive()}
            className={`flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-semibold transition-all ${
              isLive
                ? 'bg-pl-live pl-live-pulse text-white shadow-lg hover:brightness-110'
                : 'btn-brand rounded-full shadow-pl-glow'
            }`}
          >
            <Radio size={16} />
            {isLive ? 'Encerrar LIVE' : 'Iniciar LIVE'}
          </button>
        </div>
      </div>
    </main>
  );
}

function ToolbarButton({
  icon: Icon,
  title,
  onClick,
  active,
}: {
  icon: typeof Settings2;
  title: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors ${
        active
          ? 'bg-pl-primary/20 text-pl-accent ring-1 ring-pl-primary/60'
          : 'bg-pl-surface text-pl-muted hover:bg-pl-hover hover:text-pl-text'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}
