$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ports = @(5173, 8000)
$stoppedProcess = $false

function Get-ProjectProcessRoot([int]$ProcessId) {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    $root = $current

    while ($current -and $current.ParentProcessId -gt 0) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($current.ParentProcessId)" -ErrorAction SilentlyContinue
        if (-not $parent -or -not $parent.CommandLine -or -not $parent.CommandLine.Contains($projectRoot)) {
            break
        }
        $root = $parent
        $current = $parent
    }

    return $root
}

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports } |
    Sort-Object OwningProcess -Unique

foreach ($listener in $listeners) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if (-not $process) {
        continue
    }
    $belongsToProject = $process -and (
        ($process.CommandLine -and $process.CommandLine.Contains($projectRoot)) -or
        ($process.ExecutablePath -and $process.ExecutablePath.Contains($projectRoot)) -or
        ($process.CommandLine -match "^\.venv\\Scripts\\python\.exe\s+.*--app-dir apps/api")
    )
    $isProjectDevProcess = $belongsToProject -and
        $process.CommandLine -and
        $process.CommandLine -match "(vite|uvicorn|vocabulary-api)"

    if (-not $isProjectDevProcess) {
        throw "Port $($listener.LocalPort) is occupied by another program (PID $($listener.OwningProcess)). Close it and run npm run dev again."
    }

    $processRoot = Get-ProjectProcessRoot $listener.OwningProcess
    if ($processRoot) {
        & taskkill.exe /PID $processRoot.ProcessId /T /F 2>$null | Out-Null
        $stoppedProcess = $true
    }
}

if ($stoppedProcess) {
    Start-Sleep -Milliseconds 500
    Write-Host "Stopped the previous Vocaboom development process."
}

$occupiedPorts = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports }

if ($occupiedPorts) {
    throw "Development ports 5173 or 8000 are still occupied."
}
