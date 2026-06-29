# Monitora Velora — reinicia se crashar e grava log
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Exe = Join-Path $Root "release\win-unpacked\Velora.exe"
$MonitorLog = Join-Path $Root "release\velora-monitor.log"
$UserLog = Join-Path $env:APPDATA "Velora\logs\velora.log"

function Write-MonitorLog($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $MonitorLog -Value $line
  Write-Host $line
}

if (-not (Test-Path $Exe)) {
  Write-MonitorLog "ERRO: EXE nao encontrado em $Exe"
  exit 1
}

Write-MonitorLog "Monitor iniciado: $Exe"
Write-MonitorLog "Log do app: $UserLog"

$restartCount = 0
$maxRestarts = 20

while ($restartCount -lt $maxRestarts) {
  $existing = Get-Process Velora -ErrorAction SilentlyContinue
  if ($existing) {
    Write-MonitorLog "Encerrando instancias antigas ($($existing.Count))..."
    Stop-Process -Name Velora -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
  }

  Write-MonitorLog "Iniciando Velora (tentativa $($restartCount + 1))..."
  $proc = Start-Process -FilePath $Exe -WorkingDirectory (Split-Path $Exe) -PassThru
  $startTime = Get-Date

  while ($true) {
    Start-Sleep 2
    $alive = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($alive) { continue }

    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    Write-MonitorLog "Processo encerrou apos $([math]::Round($elapsed,1))s (PID $($proc.Id))"

    if (Test-Path $UserLog) {
      Write-MonitorLog "--- ultimas linhas do log do app ---"
      Get-Content $UserLog -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Write-MonitorLog "  $_" }
      Write-MonitorLog "--- fim ---"
    }

    if ($elapsed -lt 3) {
      $restartCount++
      Write-MonitorLog "Crash rapido detectado - reiniciando ($restartCount/$maxRestarts)..."
      Start-Sleep 3
      break
    }

    Write-MonitorLog "Encerramento normal - monitor parado."
    exit 0
  }
}

Write-MonitorLog "Limite de reinicios. Verifique $UserLog"
