# Push Velora para GitHub usando D:\Projects\github.env
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Read-DotEnv {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $name, $value = $_ -split '=', 2
        if ($name) { $vars[$name.Trim()] = $value.Trim() }
    }
    return $vars
}

$sharedEnv = "D:\Projects\github.env"
$fallback = "D:\Projects\.bedhosting\github.env"
$envVars = Read-DotEnv $sharedEnv
if (-not $envVars["GITHUB_TOKEN"] -and (Test-Path $fallback)) {
    $envVars = Read-DotEnv $fallback
}

$token = $envVars["GITHUB_TOKEN"].Trim()
$user = if ($envVars["GITHUB_USER"]) { $envVars["GITHUB_USER"].Trim() } else { "h3atry" }
$repoName = "velora-studio"
$repo = "$user/$repoName"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "GITHUB_TOKEN ausente em $sharedEnv" -ForegroundColor Red
    exit 1
}

Write-Host "Repo alvo: $repo" -ForegroundColor Cyan

# Criar repo se nao existir
$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
try {
    $null = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo" -Headers $headers -Method Get
    Write-Host "Repositorio ja existe." -ForegroundColor DarkGray
} catch {
    $body = @{
        name        = $repoName
        description = "Velora Studio - desktop live streaming for TikTok and Twitch"
        private     = $false
        has_issues  = $true
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
    Write-Host "Repositorio criado." -ForegroundColor Green
}

if (-not (Test-Path ".git")) {
    git init -b main
}

git config user.email "82936678+h3atry@users.noreply.github.com"
git config user.name "h3atry"

git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "Initial Velora Studio - app and legal pages for TikTok OAuth"
} else {
    Write-Host "Nada novo para commitar." -ForegroundColor DarkGray
}

$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"
$remote = "https://${user}:$token@github.com/$repo.git"
$ErrorActionPreference = "Continue"
$null = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) { git remote set-url origin $remote } else { git remote add origin $remote }
$ErrorActionPreference = "Stop"
git push -u origin main --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push falhou." -ForegroundColor Red
    exit 1
}

# GitHub Pages: branch main, pasta /docs
$pagesBody = @{
    source = @{
        branch = "main"
        path   = "/docs"
    }
} | ConvertTo-Json -Depth 3
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/pages" -Headers $headers -Method Post -Body $pagesBody -ContentType "application/json"
    Write-Host "GitHub Pages ativado (pasta /docs)." -ForegroundColor Green
} catch {
    try {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/pages" -Headers $headers -Method Put -Body $pagesBody -ContentType "application/json"
        Write-Host "GitHub Pages atualizado." -ForegroundColor Green
    } catch {
        Write-Host "Pages: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Repo:  https://github.com/$repo" -ForegroundColor Green
Write-Host "Site:  https://$user.github.io/$repoName/" -ForegroundColor Green
Write-Host "Terms: https://$user.github.io/$repoName/terms.html" -ForegroundColor Green
Write-Host "Privacy: https://$user.github.io/$repoName/privacy.html" -ForegroundColor Green
