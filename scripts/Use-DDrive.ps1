# Dot-source before installing or running tools: . .\scripts\Use-DDrive.ps1
$veridiaRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([System.IO.Path]::GetPathRoot($veridiaRoot) -ne 'D:\') { throw 'Veridia must run from D:.' }
Set-Location -LiteralPath $veridiaRoot
foreach ($veridiaFolder in @('.cache/npm', '.cache/ms-playwright', '.tmp')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $veridiaRoot $veridiaFolder) | Out-Null
}
$env:npm_config_cache = Join-Path $veridiaRoot '.cache/npm'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $veridiaRoot '.cache/ms-playwright'
$env:TEMP = Join-Path $veridiaRoot '.tmp'
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
$env:XDG_CACHE_HOME = Join-Path $veridiaRoot '.cache'
$env:PYTHONDONTWRITEBYTECODE = '1'
Write-Host "Workspace: $veridiaRoot | npm cache: $env:npm_config_cache | browsers: $env:PLAYWRIGHT_BROWSERS_PATH | temp: $env:TEMP"
