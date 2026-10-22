# Stop only this checkout's VS Code dev-task process tree after debugging ends.
# Matching the launcher command avoids killing unrelated apps or other servers.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskPattern = '(?i)scripts[\\/](?:runtime[\\/])?vscode-node\.ps1\s+scripts[\\/](?:runtime[\\/])?run-framework\.mjs\s+dev(?:\s|$)'
$processes = @(Get-CimInstance Win32_Process)
$children = @{}

foreach ($process in $processes) {
    $parentId = [string]$process.ParentProcessId
    if (-not $children.ContainsKey($parentId)) {
        $children[$parentId] = [System.Collections.Generic.List[int]]::new()
    }
    $children[$parentId].Add([int]$process.ProcessId)
}

function Get-ProcessTree([int]$ProcessId) {
    $ids = [System.Collections.Generic.List[int]]::new()
    foreach ($childId in $children[[string]$ProcessId]) {
        foreach ($descendantId in (Get-ProcessTree $childId)) {
            $ids.Add($descendantId)
        }
    }
    $ids.Add($ProcessId)
    return $ids
}

$taskRoots = @(
    $processes | Where-Object {
        $_.Name -in @('powershell.exe', 'pwsh.exe') -and
        $_.CommandLine.Contains($projectRoot) -and
        $_.CommandLine -match $taskPattern
    }
)

foreach ($root in $taskRoots) {
    foreach ($processId in (Get-ProcessTree ([int]$root.ProcessId))) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                throw
            }
        }
    }
}
