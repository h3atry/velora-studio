# Velora - launcher silencioso (atalho desktop, sem PowerShell visivel)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$LogDir = Join-Path $env:APPDATA "Velora\logs"
$LogFile = Join-Path $LogDir "dev-launcher.log"

function Write-Log($msg) {
  if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
  Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class VeloraWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$NodeBin = Join-Path $Root ".tools\node"
if (Test-Path $NodeBin) {
  $env:PATH = "$NodeBin;$env:PATH"
}
$env:PATH = "$(Join-Path $Root 'node_modules\.bin');$env:PATH"

Set-Location $Root

$existing = Get-Process -Name electron -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -match 'Velora' -and $_.MainWindowHandle -ne 0 }
if ($existing) {
  $hwnd = $existing[0].MainWindowHandle
  [VeloraWin]::ShowWindow($hwnd, 9) | Out-Null
  [VeloraWin]::SetForegroundWindow($hwnd) | Out-Null
  Write-Log "Janela existente focada (PID $($existing[0].Id))"
  exit 0
}

$viteUp = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($viteUp) {
  Write-Log "Vite ja ativo na porta 5173"
  exit 0
}

Write-Log "Iniciando Velora em background..."

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c npm run dev"
$psi.WorkingDirectory = $Root
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($psi) | Out-Null

Write-Log "Processo dev iniciado"
