# Velora — guia para agentes

## Bugs conhecidos e roadmap de correções

Ver [ROADMAP-FIXES.md](./ROADMAP-FIXES.md) (220 passos de bugs/melhorias no código existente).

## OAuth Twitch (redirect HTTPS)

A Twitch exige **HTTPS** no redirect URI. Use no [dev.twitch.tv](https://dev.twitch.tv/console/apps):

`https://127.0.0.1:17563/callback/twitch`

O Velora sobe um servidor HTTPS local com certificado autoassinado (aceito só no loopback).

## Workaround câmera + FFmpeg (Windows)

DirectShow não permite dois consumidores no mesmo dispositivo. Se o LIVE falhar com "device in use":

1. Ative **Preview OFF durante LIVE** nas configurações de transmissão, ou
2. Remova a origem Câmera do preview antes de ir ao vivo (use captura de jogo/tela).

## Comandos

- `npm run sync` — build + atalho desktop
- `npm run typecheck` / `npm run test`
- Diagnóstico no app: **Ctrl+Shift+D**

## Logs

`%APPDATA%/Velora/logs/velora.log` — stream keys são redigidas automaticamente.
