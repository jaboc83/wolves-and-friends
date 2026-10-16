# VS Code process tasks do not initialize fnm through a terminal profile.
# Prefer PATH, then the project's fnm version, then checkout-local portable Node.
$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not $nodeExecutable) {
    $versionFile = Join-Path $projectRoot '.node-version'
    if (Test-Path -LiteralPath $versionFile) {
        $nodeVersion = (Get-Content -LiteralPath $versionFile -Raw).Trim()
        if ($nodeVersion -match '^v?\d+\.\d+\.\d+$') {
            $nodeVersion = 'v' + $nodeVersion.TrimStart('v')
            foreach ($fnmRoot in @("$env:APPDATA\fnm", "$env:LOCALAPPDATA\fnm")) {
                $candidate = Join-Path $fnmRoot "node-versions\$nodeVersion\installation\node.exe"
                if (Test-Path -LiteralPath $candidate) {
                    $nodeExecutable = $candidate
                    break
                }
            }
        }
    }
}

if (-not $nodeExecutable) {
    $portableRoot = Join-Path $projectRoot '.sites-runtime\tools'
    $nodeExecutable = Get-ChildItem -Path "$portableRoot\node-v*-win-x64\node.exe" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $nodeExecutable) {
    throw 'Node.js was not found. Install Node.js 22.13+ and restart VS Code, or install the version in .node-version with fnm.'
}

# Child tooling also needs Node available through PATH.
$env:PATH = "$(Split-Path -Parent $nodeExecutable);$env:PATH"
& $nodeExecutable @args
exit $LASTEXITCODE
