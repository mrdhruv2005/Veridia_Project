# Copy only reviewable source and documentation; caches, dependencies and build outputs stay local.
. (Join-Path $PSScriptRoot 'Use-DDrive.ps1')
$veridiaPackageRoot = Join-Path $veridiaRoot 'submission'
New-Item -ItemType Directory -Force -Path $veridiaPackageRoot | Out-Null
$veridiaStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$veridiaStage = Join-Path $veridiaRoot ".tmp/submission-$veridiaStamp"
New-Item -ItemType Directory -Path $veridiaStage | Out-Null
$veridiaFiles = @('.gitignore', '.npmrc', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'index.html', 'README.md', 'THIRD_PARTY_NOTICES.md', 'IMPLEMENTATION_PLAN.md', 'Product_Engineer_Assignment.docx', 'veridia_csv.csv')
foreach ($veridiaFile in $veridiaFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $veridiaRoot $veridiaFile))) { throw "Missing required submission file: $veridiaFile" }
    Copy-Item -LiteralPath (Join-Path $veridiaRoot $veridiaFile) -Destination $veridiaStage
}
foreach ($veridiaFolder in @('src', 'scripts', 'data', 'tests', 'e2e', 'docs')) {
    Copy-Item -LiteralPath (Join-Path $veridiaRoot $veridiaFolder) -Destination $veridiaStage -Recurse
}
$veridiaArchive = Join-Path $veridiaPackageRoot "veridia-source-$veridiaStamp.zip"
Compress-Archive -Path (Join-Path $veridiaStage '*') -DestinationPath $veridiaArchive -CompressionLevel Optimal
Write-Host "Prepared local source archive: $veridiaArchive"
Write-Host 'This does not publish a repository or send a submission.'
