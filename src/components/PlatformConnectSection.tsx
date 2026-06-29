import type { ReactNode } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { usePlatformAuth } from '@/hooks/usePlatformAuth';
import type { Platform } from '@/types';
import { Check, Key, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { useState } from 'react';

type ConnectMode = 'oauth' | 'manual';

export function PlatformConnectSection() {
  const {
    accounts,
    loading,
    error,
    connect,
    disconnect,
    refreshKey,
    saveManualKey,
    oauthConfigured,
  } = usePlatformAuth();

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-white">Destino da transmissão</p>
      {error && (
        <p className="rounded-md bg-red-900/30 px-2 py-1.5 text-[11px] text-red-300">{error}</p>
      )}
      <PlatformCard
        platform="twitch"
        account={accounts.twitch}
        oauthReady={oauthConfigured.twitch}
        loading={loading === 'twitch'}
        onConnect={() => connect('twitch')}
        onDisconnect={() => disconnect('twitch')}
        onRefresh={() => refreshKey('twitch')}
        onSaveManualKey={(key) => saveManualKey('twitch', key)}
        manualKeyHint="Cole a stream key live_… do painel da Twitch"
      />
      <PlatformCard
        platform="tiktok"
        account={accounts.tiktok}
        oauthReady={oauthConfigured.tiktok}
        loading={loading === 'tiktok'}
        onConnect={() => connect('tiktok')}
        onDisconnect={() => disconnect('tiktok')}
        onRefresh={() => refreshKey('tiktok')}
        onSaveManualKey={(key) => saveManualKey('tiktok', key)}
        manualKeyHint="Cole a stream key do TikTok LIVE Studio"
      />
      <p className="text-[10px] leading-relaxed text-pl-muted">
        <strong className="text-pl-text">Twitch:</strong> ao conectar, o Velora abre login (como OBS),
        obtém stream key e canal automaticamente.{' '}
        <strong className="text-pl-text">TikTok:</strong> login OAuth + username; stream key ainda via
        LIVE Studio (limitação da API).
      </p>
    </div>
  );
}

function PlatformCard({
  platform,
  account,
  oauthReady,
  loading,
  onConnect,
  onDisconnect,
  onRefresh,
  onSaveManualKey,
  manualKeyHint,
}: {
  platform: Platform;
  account?: {
    connected: boolean;
    username?: string;
    displayName?: string;
    hasStreamKey: boolean;
    streamKeyPreview?: string;
  };
  oauthReady: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onSaveManualKey: (key: string) => void;
  manualKeyHint: string;
}) {
  const name = platform === 'tiktok' ? 'TikTok' : 'Twitch';
  const [mode, setMode] = useState<ConnectMode>('oauth');
  const [manualKey, setManualKey] = useState('');
  const connected = account?.connected;

  return (
    <div className="rounded-lg border border-pl-border bg-pl-bg p-3">
      <div className="mb-3 flex items-center gap-2">
        <PlatformIcon platform={platform} size={18} />
        <div className="flex-1">
          <p className="text-xs font-medium text-white">{name}</p>
          {connected ? (
            <p className="text-[11px] text-green-400">
              <Check size={10} className="mr-0.5 inline" />
              @{account?.username}
              {account?.hasStreamKey && account.streamKeyPreview && (
                <span className="ml-1 text-pl-muted">· key {account.streamKeyPreview}</span>
              )}
            </p>
          ) : (
            <p className="text-[11px] text-pl-muted">Não conectado</p>
          )}
        </div>
        {connected && (
          <div className="flex shrink-0 gap-1">
            <IconBtn title="Atualizar stream key" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </IconBtn>
            <IconBtn title="Desconectar" onClick={onDisconnect} disabled={loading}>
              <Unlink size={14} />
            </IconBtn>
          </div>
        )}
      </div>

      {!connected && (
        <>
          <div className="mb-3 flex gap-1 rounded-lg bg-pl-surface/60 p-0.5">
            <ModeBtn
              active={mode === 'oauth'}
              onClick={() => setMode('oauth')}
              icon={<Link2 size={12} />}
              label="Conectar conta"
              sub="recomendado"
            />
            <ModeBtn
              active={mode === 'manual'}
              onClick={() => setMode('manual')}
              icon={<Key size={12} />}
              label="Usar stream key"
              sub="manual"
            />
          </div>

          {mode === 'oauth' ? (
            <div>
              <button
                type="button"
                disabled={loading || !oauthReady}
                onClick={onConnect}
                className="flex w-full items-center justify-center gap-2 rounded-lg btn-brand py-2.5 text-xs font-medium disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Link2 size={14} />
                )}
                Conectar conta {name}
              </button>
              {!oauthReady && (
                <p className="mt-2 text-[10px] leading-relaxed text-amber-400/90">
                  OAuth do app ainda não embarcado neste build. O mantenedor do Velora precisa
                  registrar o app em{' '}
                  {platform === 'twitch' ? 'dev.twitch.tv' : 'developers.tiktok.com'} e incluir{' '}
                  <code className="text-pl-muted">oauth-credentials.json</code> no instalador — ou use
                  stream key manual abaixo.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-pl-muted">{manualKeyHint}</p>
              <input
                type="password"
                className="input-field w-full text-[11px]"
                placeholder="Stream key"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value.trim())}
              />
              <button
                type="button"
                disabled={!manualKey.trim()}
                onClick={() => {
                  onSaveManualKey(manualKey.trim());
                  setManualKey('');
                }}
                className="w-full rounded-lg bg-zinc-700 py-2 text-[11px] text-white hover:bg-zinc-600 disabled:opacity-40"
              >
                Salvar stream key
              </button>
            </div>
          )}
        </>
      )}

      {connected && platform === 'tiktok' && !account?.hasStreamKey && (
        <div className="mt-2 space-y-1 border-t border-pl-border pt-2">
          <p className="text-[10px] text-pl-muted">Falta stream key — cole do LIVE Studio:</p>
          <div className="flex gap-1">
            <input
              type="password"
              className="input-field flex-1 text-[11px]"
              placeholder="Stream key TikTok"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                onSaveManualKey(manualKey);
                setManualKey('');
              }}
              className="rounded-lg bg-zinc-700 px-2 text-[11px] text-white hover:bg-zinc-600"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] transition-colors ${
        active ? 'bg-pl-primary/20 text-pl-accent' : 'text-pl-muted hover:text-pl-text'
      }`}
    >
      <span className="flex items-center gap-1 font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[9px] opacity-70">({sub})</span>
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1.5 text-pl-muted hover:bg-pl-hover hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
