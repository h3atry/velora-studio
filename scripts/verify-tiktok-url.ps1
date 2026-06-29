# Publica arquivo de verificacao TikTok em docs/ e faz push
param(
    [Parameter(Mandatory = $true)]
    [string]$File
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$destDir = Join-Path $Root "docs"

if (-not (Test-Path $File)) {
    Write-Host "Arquivo nao encontrado: $File" -ForegroundColor Red
    exit 1
}

$name = Split-Path $File -Leaf
$dest = Join-Path $destDir $name
Copy-Item -Force $File $dest
Write-Host "Copiado para $dest" -ForegroundColor Green

& (Join-Path $PSScriptRoot "push-github.ps1")

Write-Host ""
Write-Host "Teste no navegador:" -ForegroundColor Cyan
Write-Host "https://h3atry.github.io/velora-studio/$name"
