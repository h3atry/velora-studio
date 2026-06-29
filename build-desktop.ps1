# Gera o .exe Velora e cria atalho na area de trabalho
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeBin = Join-Path $Root ".tools\node"
$env:PATH = "$NodeBin;$Root\node_modules\.bin;" + $env:PATH

Set-Location $Root
Write-Host "Building Velora..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Exe = Join-Path $Root "release\win-unpacked\Velora.exe"
if (-not (Test-Path $Exe)) {
  Write-Error "Executavel nao encontrado: $Exe"
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Velora.lnk"
$OldShortcut = Join-Path $Desktop "PrismLive.lnk"
if (Test-Path $OldShortcut) { Remove-Item $OldShortcut -Force }

$Wsh = New-Object -ComObject WScript.Shell
$Sc = $Wsh.CreateShortcut($ShortcutPath)
$Sc.TargetPath = $Exe
$Sc.WorkingDirectory = Split-Path $Exe
$Sc.Description = "Velora - estudio multicanal de live"
$Sc.Save()

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
Write-Host "  EXE:      $Exe"
Write-Host "  Atalho:   $ShortcutPath"
