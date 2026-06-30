# Um unico atalho: Velora (dev + hot reload — mudancas aparecem sozinhas)
param(
  [string]$Root = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
)

$ErrorActionPreference = "Stop"
$Desktop = [Environment]::GetFolderPath("Desktop")
$DevVbs = Join-Path $Root "velora-dev.vbs"
$IconSrc = Join-Path $Root "public\brand\icon.ico"
$IconBust = Join-Path $env:TEMP ("velora-icon-" + (Get-Item $IconSrc).LastWriteTime.Ticks + ".ico")
Copy-Item $IconSrc $IconBust -Force

# Remove atalhos antigos / confusos
$OldPrism = Join-Path $Desktop "PrismLive.lnk"
$OldRelease = Join-Path $Desktop "Velora Release.lnk"
if (Test-Path $OldPrism) { Remove-Item $OldPrism -Force }
if (Test-Path $OldRelease) { Remove-Item $OldRelease -Force }

$Wsh = New-Object -ComObject WScript.Shell
$Link = Join-Path $Desktop "Velora.lnk"
$Sc = $Wsh.CreateShortcut($Link)
$Sc.TargetPath = Join-Path $env:SystemRoot "System32\wscript.exe"
$Sc.Arguments = "`"$DevVbs`""
$Sc.WorkingDirectory = $Root
$Sc.Description = "Velora"
$Sc.IconLocation = "$IconBust,0"
$Sc.Save()

Write-Host "  Atalho: $Link" -ForegroundColor Green
