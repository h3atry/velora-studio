/**
 * Relay RTMP local opcional — stub para arquitetura 1 encoder → N destinos.
 * Produção: nginx-rtmp ou Node Media Server em localhost:1935
 */
export interface RelayStatus {
  enabled: boolean;
  port: number;
  running: boolean;
  note: string;
}

const RELAY_PORT = Number(process.env.RELAY_PORT) || 1935;

export function getRelayStatus(): RelayStatus {
  return {
    enabled: false,
    port: RELAY_PORT,
    running: false,
    note: 'Relay local desabilitado — Velora envia dual RTMP direto. Ative RELAY_PORT no futuro.',
  };
}

export function startRelayServer(): RelayStatus {
  return getRelayStatus();
}

export function stopRelayServer(): void {
  /* stub */
}
