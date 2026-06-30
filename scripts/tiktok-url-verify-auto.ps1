# Monitora Downloads por tiktok*.html ou tiktok*.txt, publica no GitHub Pages e abre o link de teste.
param(
    [int]$TimeoutSec = 600
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Downloads = Join-Path $env:USERPROFILE "Downloads"
$Docs = Join-Path $Root "docs"

function Read-DotEnv([string]$Path) {
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $name, $value = $_ -split '=', 2
        if ($name) { $vars[$name.Trim()] = $value.Trim() }
    }
    return $vars
}

function Publish-VerifyFile([string]$SourcePath) {
    $name = Split-Path $SourcePath -Leaf
    Copy-Item -Force $SourcePath (Join-Path $Docs $name)
    Write-Host "Publicado em docs/$name" -ForegroundColor Green

    $envVars = Read-DotEnv "D:\Projects\github.env"
    $token = $envVars["GITHUB_TOKEN"]
    $user = if ($envVars["GITHUB_USER"]) { $envVars["GITHUB_USER"] } else { "h3atry" }
    if (-not $token) { throw "GITHUB_TOKEN ausente" }

    Push-Location $Root
    git add "docs/$name"
    git config user.email "82936678+h3atry@users.noreply.github.com"
    git config user.name "h3atry"
    git commit -m "Add TikTok URL verification file $name"
    $env:GIT_TERMINAL_PROMPT = "0"
    git push "https://${user}:$token@github.com/h3atry/velora-studio.git" main
    Pop-Location

    $url = "https://h3atry.github.io/velora-studio/$name"
    Write-Host "Aguardando GitHub Pages (30s)..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 30
    Start-Process $url
    return $url
}

Write-Host "=== TikTok URL verify auto ===" -ForegroundColor Cyan
Write-Host "1. Abra developers.tiktok.com -> app Velora Studio -> URL properties"
Write-Host "2. URL prefix: https://h3atry.github.io/velora-studio/"
Write-Host "3. Download do arquivo tiktok*.txt ou tiktok_verify_*.html"
Write-Host ""
Write-Host "Monitorando $Downloads por ate $TimeoutSec s..." -ForegroundColor Yellow

function Get-TikTokVerifyFile {
    Get-ChildItem -Path $Downloads -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'tiktok*.txt' -or $_.Name -like 'tiktok*.html' }
}

$existing = Get-TikTokVerifyFile |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($existing -and $existing.LastWriteTime -gt (Get-Date).AddHours(-2)) {
    $url = Publish-VerifyFile $existing.FullName
    Write-Host "Pronto: $url" -ForegroundColor Green
    Write-Host "Volte no portal TikTok e clique Verify." -ForegroundColor Cyan
    exit 0
}

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    $hit = Get-TikTokVerifyFile |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($hit) {
        $url = Publish-VerifyFile $hit.FullName
        Write-Host "Pronto: $url" -ForegroundColor Green
        Write-Host "Volte no portal TikTok e clique Verify." -ForegroundColor Cyan
        exit 0
    }
    Start-Sleep -Seconds 3
}

Write-Host 'Timeout - arquivo tiktok*.txt/html nao apareceu em Downloads.' -ForegroundColor Red
exit 1
