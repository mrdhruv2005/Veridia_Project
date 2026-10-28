param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+(?:\.git)?/?$')]
    [string]$RepositoryUrl,
    [ValidateNotNullOrEmpty()]
    [string]$AuthorName = 'mrdhruv2005'
)

# Run in normal PowerShell after reviewing the files and completing local checks.
# Uses the existing Git email and credentials. Never force-pushes or changes visibility.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Use-DDrive.ps1')

function Invoke-VeridiaGit {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw "Git failed: $($args -join ' ')" }
}

if (!(Test-Path -LiteralPath (Join-Path $veridiaRoot '.git'))) { Invoke-VeridiaGit init -b main }
$veridiaBranch = (Invoke-VeridiaGit branch --show-current).Trim()
if ($veridiaBranch -ne 'main') { throw 'Expected branch main. Review the current branch before publishing.' }
if (!(git config --get user.email)) { throw 'Set your Git author email before publishing.' }
Invoke-VeridiaGit config --local user.name $AuthorName

$veridiaRemotes = @(Invoke-VeridiaGit remote)
if ($veridiaRemotes -contains 'origin') {
    $veridiaRemote = Invoke-VeridiaGit remote get-url origin
    $veridiaExistingUrl = $veridiaRemote.TrimEnd('/') -replace '\.git$', ''
    $veridiaRequestedUrl = $RepositoryUrl.TrimEnd('/') -replace '\.git$', ''
    if ($veridiaExistingUrl -ne $veridiaRequestedUrl) {
        throw "Origin already points to $veridiaRemote. Review it before changing the destination."
    }
} else { Invoke-VeridiaGit remote add origin $RepositoryUrl }

$veridiaFiles = @('.gitignore', '.npmrc', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'index.html', 'README.md', 'THIRD_PARTY_NOTICES.md', 'IMPLEMENTATION_PLAN.md', 'Product_Engineer_Assignment.docx', 'veridia_csv.csv', 'src', 'scripts', 'data', 'tests', 'e2e', 'docs')
Invoke-VeridiaGit add -- @veridiaFiles
Invoke-VeridiaGit diff --cached --stat
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) { Invoke-VeridiaGit commit -m 'Complete manufacturer matching tool and audit fixes' }
elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes.' }
Invoke-VeridiaGit push -u origin main

$veridiaLocalHead = (Invoke-VeridiaGit rev-parse HEAD).Trim()
$veridiaRemoteHead = Invoke-VeridiaGit ls-remote --exit-code origin refs/heads/main
if (($veridiaRemoteHead -split '\s+')[0] -ne $veridiaLocalHead) { throw 'The remote branch does not match the local commit.' }
$veridiaPublicUrl = $RepositoryUrl.TrimEnd('/') -replace '\.git$', ''
try { $veridiaPage = Invoke-WebRequest -Uri $veridiaPublicUrl -UseBasicParsing -TimeoutSec 30 }
catch { throw 'Code was pushed, but public reviewer access could not be verified. Check repository visibility and the URL.' }
if ($veridiaPage.StatusCode -ne 200) { throw 'Public reviewer access could not be verified.' }

$veridiaMessagePath = Join-Path $veridiaRoot 'docs/submission-message.md'
$veridiaMessage = [System.IO.File]::ReadAllText($veridiaMessagePath)
$veridiaMessage = $veridiaMessage.Replace('[insert verified repository URL]', $veridiaPublicUrl)
[System.IO.File]::WriteAllText($veridiaMessagePath, $veridiaMessage, [System.Text.UTF8Encoding]::new($false))
Invoke-VeridiaGit add -- docs/submission-message.md
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    Invoke-VeridiaGit commit -m 'Add verified public repository link to submission draft'
    Invoke-VeridiaGit push
} elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect the submission link update.' }
$veridiaFinalHead = (Invoke-VeridiaGit rev-parse HEAD).Trim()
$veridiaFinalRemote = Invoke-VeridiaGit ls-remote --exit-code origin refs/heads/main
if (($veridiaFinalRemote -split '\s+')[0] -ne $veridiaFinalHead) { throw 'The final submission-link commit could not be verified on the remote.' }
[pscustomobject]@{ repository = $veridiaPublicUrl; commit = $veridiaFinalHead; publicAccessVerified = $true; verifiedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $veridiaRoot '.tmp/publish-result.json') -Encoding UTF8
Write-Host "Published and verified: $veridiaPublicUrl"
Write-Host 'The submission draft has the verified link. No submission message was sent.'
