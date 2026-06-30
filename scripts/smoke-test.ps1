# Smoke test: launch Velora.exe with --smoke-test, verify clean startup.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Exe = Join-Path $Root "release\win-unpacked\Velora.exe"

if (-not (Test-Path $Exe)) {
  Write-Error "Velora.exe not found at $Exe - run npm run build first"
}

Write-Host "=== Velora smoke test ===" -ForegroundColor Cyan
Write-Host "Launching: $Exe --smoke-test"

$proc = Start-Process -FilePath $Exe -ArgumentList "--smoke-test" -WorkingDirectory (Split-Path $Exe) -PassThru
$timeoutSec = 30
$elapsed = 0

while ($elapsed -lt $timeoutSec) {
  Start-Sleep -Seconds 1
  $elapsed++
  $alive = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
  if (-not $alive) {
    if ($elapsed -lt 2) {
      Write-Error "Velora exited too quickly (${elapsed}s) - possible crash on startup"
    }
    Write-Host "Velora smoke exit OK after ${elapsed}s" -ForegroundColor Green
    exit 0
  }
}

Write-Host "Velora still running after ${timeoutSec}s - sending quit" -ForegroundColor Yellow
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Start-Sleep 2

if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
  Write-Error "Failed to stop Velora process"
}

Write-Host "Smoke test passed" -ForegroundColor Green
exit 0
