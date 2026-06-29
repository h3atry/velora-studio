import { ChatPanel } from '@/components/ChatPanel';
import { PerformancePanel } from '@/components/PerformancePanel';

export function RightSidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-pl-border pl-panel-solid min-h-0">
      <PerformancePanel />
      <div className="pl-divider" />
      <ChatPanel mode="docked" />
    </aside>
  );
}
