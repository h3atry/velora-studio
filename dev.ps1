# Usa Node portátil em .tools/node (instalado automaticamente)
$nodeBin = Join-Path $PSScriptRoot ".tools\node"
if (Test-Path $nodeBin) {
  $env:PATH = "$nodeBin;$env:PATH"
}

Set-Location $PSScriptRoot
npm run dev
