import { ChatPanel } from '@/components/ChatPanel';
import type { ChatWindowMode } from '@/types';
import { useChatSync } from '@/hooks/useChatSync';
import { useChatBridge } from '@/hooks/useChatBridge';

export function ChatStandaloneView({ mode }: { mode: ChatWindowMode }) {
  useChatSync();
  useChatBridge();
  const isOverlay = mode === 'overlay';

  return (
    <div
      className={`h-full ${isOverlay ? 'bg-transparent p-2' : 'pl-panel-solid'}`}
    >
      <ChatPanel mode={mode} standalone />
    </div>
  );
}
