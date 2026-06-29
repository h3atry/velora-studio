import { ChatMessageLine } from '@/components/ChatMessageLine';
import { ChatConnectionIndicators } from '@/components/ChatConnectionIndicators';
import { MobileChatLinkPopover } from '@/components/MobileChatLinkPopover';
import { ChatFiltersModal, ChatSendBar } from '@/components/ChatExtras';
import { Download, ExternalLink, Pin, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useEffect, useRef, useState } from 'react';
import type { ChatWindowMode } from '@/types';

interface ChatPanelProps {
  mode?: ChatWindowMode;
  standalone?: boolean;
}

export function ChatPanel({ mode = 'docked', standalone = false }: ChatPanelProps) {
  const messages = useAppStore((s) => s.messages);
  const chatMode = useAppStore((s) => s.chatMode);
  const setChatMode = useAppStore((s) => s.setChatMode);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [pinned, setPinned] = useState(false);
  const isPopout = mode === 'popout' || (standalone && mode !== 'overlay');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUp.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    userScrolledUp.current = !atBottom;
  };

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubMode = api.onChatModeChanged((m) => setChatMode(m));
    const unsubClosed = api.onChatWindowClosed?.(() => setChatMode('docked'));
    return () => {
      unsubMode();
      unsubClosed?.();
    };
  }, [setChatMode]);

  useEffect(() => {
    if (!standalone || !isPopout || !window.electronAPI?.chatPopoutIsPinned) return;
    void window.electronAPI.chatPopoutIsPinned().then((r) => setPinned(r.pinned));
  }, [standalone, isPopout]);

  const handlePopout = () => {
    window.electronAPI?.chatOpenPopout();
  };

  const handleTogglePin = async () => {
    if (!window.electronAPI?.chatPopoutTogglePin) return;
    const res = await window.electronAPI.chatPopoutTogglePin();
    setPinned(res.pinned);
  };

  const handleReturnToApp = () => {
    void window.electronAPI?.chatReturnToDocked();
  };

  if (!standalone && chatMode === 'popout') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <p className="text-xs text-pl-muted">Chat em janela separada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-pl-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-white">Chat da LIVE</h3>
          <ChatConnectionIndicators />
        </div>
        <div className="flex items-center gap-1">
          <MobileChatLinkPopover />
          <ChatFiltersModal />
          {!standalone && (
            <IconButton
              icon={Download}
              title="Exportar log de chat"
              onClick={async () => {
                if (!window.electronAPI?.chatExport) return;
                const path = await window.electronAPI.chatExport('txt');
                if (path) alert(`Chat exportado: ${path}`);
              }}
            />
          )}
          {!standalone && mode === 'docked' && (
            <IconButton icon={ExternalLink} title="Abrir chat em janela separada" onClick={handlePopout} />
          )}
          {standalone && isPopout && (
            <>
              <IconButton
                icon={Pin}
                title={pinned ? 'Desafixar janela' : 'Fixar sobre outras janelas'}
                onClick={() => void handleTogglePin()}
                active={pinned}
              />
              <IconButton icon={X} title="Fechar e voltar ao app" onClick={handleReturnToApp} />
            </>
          )}
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {messages.length === 0 ? (
          <p className="p-4 text-center text-xs text-pl-muted">
            As mensagens da sua LIVE serão exibidas aqui.
          </p>
        ) : (
          messages.map((msg) => <ChatMessageLine key={msg.id} msg={msg} />)
        )}
      </div>
      {(!standalone || isPopout) && <ChatSendBar />}
    </div>
  );
}

function IconButton({
  icon: Icon,
  title,
  onClick,
  active = false,
}: {
  icon: typeof Pin;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-1 transition-colors hover:bg-pl-hover hover:text-white ${
        active ? 'bg-pl-primary/25 text-pl-accent' : 'text-pl-muted'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}
