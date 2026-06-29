# Requisitos — Velora

- **SO:** Windows 10 ou superior (64-bit)
- **Hardware:** câmera e microfone (DirectShow)
- **Rede:** conexão estável para RTMP; firewall com porta **17570** (chat LAN) e **17571** (webhooks de alertas) na rede privada
- **Contas:** TikTok LIVE Studio (stream key manual) + Twitch Developer App (OAuth)
- **FFmpeg:** incluído no instalador via `ffmpeg-static`

## Redirect URIs OAuth

- Twitch: `http://127.0.0.1:17563/callback`
- TikTok: `http://127.0.0.1:17564/callback`

## Smoke test pós-build

Ver [SMOKE_TEST.md](./SMOKE_TEST.md).
