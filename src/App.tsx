import { lazy, Suspense } from 'react';
import { LeftSidebar } from '@/components/LeftSidebar';
import { CenterPanel } from '@/components/CenterPanel';
import { RightSidebar } from '@/components/RightSidebar';
import { StatusBar } from '@/components/StatusBar';
import { TitleBar } from '@/components/TitleBar';
import { AlertToast } from '@/components/ChatExtras';
import { useChatSync } from '@/hooks/useChatSync';
import { useChatBridge } from '@/hooks/useChatBridge';
import { usePersist, useSystemStats, useTwitchViewers } from '@/hooks/usePersist';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const OnboardingModal = lazy(() =>
  import('@/components/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const LiveCountdownOverlay = lazy(() =>
  import('@/components/OnboardingModal').then((m) => ({ default: m.LiveCountdownOverlay }))
);
const DiagnosticsPanel = lazy(() =>
  import('@/components/DiagnosticsPanel').then((m) => ({ default: m.DiagnosticsPanel }))
);

export default function App() {
  useChatSync();
  useChatBridge();
  usePersist();
  useSystemStats();
  useTwitchViewers();
  useKeyboardShortcuts();

  return (
    <div className="pl-mesh-bg flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <CenterPanel />
        <RightSidebar />
      </div>
      <StatusBar />
      <Suspense fallback={null}>
        <OnboardingModal />
        <LiveCountdownOverlay />
        <DiagnosticsPanel />
      </Suspense>
      <AlertToast />
    </div>
  );
}
