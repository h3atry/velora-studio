# Velora

Estúdio desktop de live multicanal (TikTok + Twitch) — um núcleo, duas plataformas, delay mínimo.

## Stack

- **Electron** — multi-window (chat pop-out + always-on-top overlay)
- **React + Vite + TypeScript**
- **Tailwind CSS**
- **Zustand** — app state

## Subagentes (Cursor)

Regra em `.cursor/rules/multi-agent-coordination.mdc` + `AGENTS.md`: o assistente usa subagentes **Task** em paralelo em tarefas grandes.

## Chat no celular (rede local)

1. Ícone **celular** no painel de chat → copie o link
2. Abra no Safari (mesma Wi‑Fi)
3. Porta padrão **17570** (`CHAT_LAN_PORT` no `.env`)

## Câmera + FFmpeg (Windows)

No Windows, o DirectShow não permite dois consumidores no mesmo dispositivo de vídeo. Se a LIVE falhar com *device in use*:

1. Ative **Preview OFF durante LIVE** nas configurações de transmissão, ou
2. Remova a origem Câmera do preview antes de ir ao vivo (use captura de jogo/tela).

## Identidade visual

Marca **Velora** — núcleo luminoso + duas auroras (TikTok/Twitch). Ícone: `public/brand/icon.png`, logo: `<BrandMark />`, tokens: `src/styles/tokens.css`.

## Development (hot reload — sem rebuild)

Abre o atalho **Velora** na área de trabalho, ou:

```powershell
.\dev.ps1
# ou: npm run dev
```

Mudanças em `src/` recarregam sozinhas. **Não precisa** de `npm run sync` a cada alteração.

## Build release (.exe empacotado)

```powershell
.\sync-build.ps1
# ou: npm run sync
```

Gera `Velora.exe` em `release/win-unpacked/` — só se precisares testar o instalável. O atalho **Velora** na área de trabalho continua a ser dev com hot reload.
