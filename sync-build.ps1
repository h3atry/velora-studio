# Sincroniza source → dist → Velora.exe → atalho desktop
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeBin = Join-Path $Root ".tools\node"
$env:PATH = "$NodeBin;$Root\node_modules\.bin;" + $env:PATH

Set-Location $Root

Write-Host "=== Velora sync-build ===" -ForegroundColor Cyan

Stop-Process -Name Velora,PrismLive -Force -ErrorAction SilentlyContinue
Start-Sleep 1
for ($i = 0; $i -lt 3; $i++) {
  if (-not (Get-Process Velora -ErrorAction SilentlyContinue)) { break }
  Stop-Process -Name Velora -Force -ErrorAction SilentlyContinue
  Start-Sleep 2
}

Write-Host "[0/4] icones (PNG + ICO quadrados)..." -ForegroundColor Yellow
npm run icons
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[1/4] typecheck..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/4] build (dist + Velora.exe)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Exe = Join-Path $Root "release\win-unpacked\Velora.exe"
$DistTitle = Join-Path $Root "dist\index.html"
$SrcTitle = Join-Path $Root "index.html"

if (-not (Test-Path $Exe)) {
  Write-Error "FALHA: Velora.exe nao gerado em $Exe"
}

$distHtml = Get-Content $DistTitle -Raw -ErrorAction SilentlyContinue
$srcHtml = Get-Content $SrcTitle -Raw
if ($distHtml -notmatch '<title>Velora</title>') {
  Write-Error "FALHA: dist/index.html desatualizado (titulo nao e Velora)"
}

Write-Host "[3/4] atalho desktop + .env.example..." -ForegroundColor Yellow
$EnvExample = Join-Path $Root ".env.example"
$EnvDest = Join-Path (Split-Path $Exe) ".env.example"
if (Test-Path $EnvExample) {
  Copy-Item $EnvExample $EnvDest -Force
}
$OAuthCreds = Join-Path $Root "oauth-credentials.json"
$OAuthDest = Join-Path (Split-Path $Exe) "resources\oauth-credentials.json"
if (Test-Path $OAuthCreds) {
  Copy-Item $OAuthCreds $OAuthDest -Force
  Write-Host "  OAuth: oauth-credentials.json embarcado no build" -ForegroundColor Green
} else {
  Write-Host "  OAuth: oauth-credentials.json ausente (Conectar conta desabilitado ate incluir)" -ForegroundColor Yellow
}
$Desktop = [Environment]::GetFolderPath("Desktop")
$Old = Join-Path $Desktop "PrismLive.lnk"
$New = Join-Path $Desktop "Velora.lnk"
if (Test-Path $Old) { Remove-Item $Old -Force }
$Wsh = New-Object -ComObject WScript.Shell
$Sc = $Wsh.CreateShortcut($New)
$Sc.TargetPath = $Exe
$Sc.WorkingDirectory = Split-Path $Exe
$Sc.Description = "Velora - estudio multicanal de live"
$IconSrc = Join-Path $Root "public\brand\icon.ico"
$IconBust = Join-Path $env:TEMP ("velora-icon-" + (Get-Item $IconSrc).LastWriteTime.Ticks + ".ico")
Copy-Item $IconSrc $IconBust -Force
$Sc.IconLocation = "$IconBust,0"
$Sc.Save()

Write-Host "[4/4] verificacao..." -ForegroundColor Yellow
$iconOk = (Test-Path (Join-Path $Root "public\brand\icon.ico")) -and (Test-Path (Join-Path $Root "public\brand\icon.png"))
$exeTime = (Get-Item $Exe).LastWriteTime
Write-Host ""
Write-Host "OK - build sincronizada" -ForegroundColor Green
Write-Host "  EXE:     $Exe"
Write-Host "  Modificado: $exeTime"
Write-Host "  Icone:   $(if ($iconOk) { 'icon.ico + icon.png (512x512)' } else { 'AUSENTE' })"
Write-Host "  Atalho:  $New"
