# Run in a normal PowerShell window. A new D: folder is used; existing files are never removed.
. (Join-Path $PSScriptRoot 'Use-DDrive.ps1')
$veridiaReview = Join-Path $veridiaRoot ('.tmp/clean-review-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $veridiaReview | Out-Null
$veridiaCopyFiles = @('.gitignore', '.npmrc', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'index.html', 'README.md', 'THIRD_PARTY_NOTICES.md', 'veridia_csv.csv')
foreach ($veridiaFile in $veridiaCopyFiles) { Copy-Item -LiteralPath (Join-Path $veridiaRoot $veridiaFile) -Destination $veridiaReview }
foreach ($veridiaFolder in @('src', 'scripts', 'data', 'tests', 'e2e', 'docs')) { Copy-Item -LiteralPath (Join-Path $veridiaRoot $veridiaFolder) -Destination $veridiaReview -Recurse }
Push-Location -LiteralPath $veridiaReview
try {
    npm.cmd ci --offline=false 2>&1 | Tee-Object -FilePath (Join-Path $veridiaRoot '.tmp/clean-install.log')
    if ($LASTEXITCODE -ne 0) { throw 'Clean install failed. See .tmp/clean-install.log.' }
    npm.cmd run check 2>&1 | Tee-Object -FilePath (Join-Path $veridiaRoot '.tmp/clean-check.log')
    if ($LASTEXITCODE -ne 0) { throw 'Clean-copy checks failed. See .tmp/clean-check.log.' }
    Write-Host "Clean-copy installation and all checks passed in $veridiaReview"
} finally { Pop-Location }
