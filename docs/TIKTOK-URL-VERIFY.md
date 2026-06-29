# Verificacao URL TikTok (GitHub Pages)

1. No portal TikTok: **URL properties** (topo da pagina do app) -> **Verify properties**
2. Tipo: **URL prefix** (nao Domain — voce nao controla DNS do github.io)
3. URL (com barra no final):
   ```
   https://h3atry.github.io/velora-studio/
   ```
4. Clique **Verify** -> **Download** do arquivo (ex.: `tiktok_verify_abc123.html`)
5. Rode:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\verify-tiktok-url.ps1 -File "C:\Users\askovski\Downloads\tiktok_verify_XXXX.html"
   ```
6. Aguarde ~1 min e clique **Verified** / **Verify** de novo no portal TikTok

Arquivo deve abrir no navegador em:
`https://h3atry.github.io/velora-studio/tiktok_verify_XXXX.html`

Verificar **uma vez** o prefixo cobre Terms, Privacy e Web URL.
