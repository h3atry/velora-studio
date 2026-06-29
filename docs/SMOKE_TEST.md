# Smoke test pós-build

1. Executar `npm run sync` ou abrir `release\win-unpacked\Velora.exe`
2. App abre sem crash em &lt; 5s
3. Onboarding aparece na primeira execução
4. Modal **Configurações de transmissão** abre (Ctrl+,)
5. Preview de câmera ou empty state visível
6. Painel diagnóstico (Ctrl+Shift+D) mostra versão e FFmpeg
7. Fechar app sem erro no log (`%APPDATA%\Velora\logs\velora.log`)
