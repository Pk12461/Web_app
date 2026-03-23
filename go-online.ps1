param(
    [int]$Port = 8000,
    [int]$WaitSeconds = 25,
    [switch]$Force
)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $projectRoot '.study-online-online.json'
$publicUrlPath = Join-Path $projectRoot 'public-url.txt'
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$serverLog = Join-Path $projectRoot ("server-$runId.log")
$serverErrorLog = Join-Path $projectRoot ("server-$runId-error.log")
$tunnelLog = Join-Path $projectRoot ("localhost-run-$runId.log")
$tunnelErrorLog = Join-Path $projectRoot ("localhost-run-$runId-error.log")

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Stop-ProcessIfRunning {
    param([int]$Id)

    if (-not $Id) {
        return
    }

    try {
        Stop-Process -Id $Id -Force -ErrorAction Stop
    }
    catch {
    }
}

function Remove-FileIfExists {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (Test-Path $Path) {
        try {
            Remove-Item $Path -Force -ErrorAction Stop
        }
        catch {
        }
    }
}

function Get-PublicUrlFromTunnelLog {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    $lines = Get-Content $Path -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if (-not $trimmed.StartsWith('{')) {
            continue
        }

        try {
            $entry = $trimmed | ConvertFrom-Json -ErrorAction Stop
        }
        catch {
            continue
        }

        if ($entry.address) {
            return "https://$($entry.address)"
        }

        if ($entry.message -match 'https://[A-Za-z0-9.-]+') {
            return $matches[0]
        }
    }

    return $null
}

Require-Command -Name 'python'
Require-Command -Name 'ssh'

if (Test-Path $statePath) {
    $existingState = Get-Content $statePath -Raw | ConvertFrom-Json
    $serverAlive = $false
    $tunnelAlive = $false

    try {
        $null = Get-Process -Id $existingState.serverPid -ErrorAction Stop
        $serverAlive = $true
    }
    catch {
    }

    try {
        $null = Get-Process -Id $existingState.tunnelPid -ErrorAction Stop
        $tunnelAlive = $true
    }
    catch {
    }

    if ($serverAlive -and $tunnelAlive -and -not $Force) {
        Write-Host "MentorLoop is already online at: $($existingState.url)"
        exit 0
    }

    Stop-ProcessIfRunning -Id $existingState.serverPid
    Stop-ProcessIfRunning -Id $existingState.tunnelPid
    Remove-FileIfExists -Path $statePath
}

Remove-FileIfExists -Path $publicUrlPath

$serverProcess = Start-Process `
    -FilePath 'python' `
    -ArgumentList @('-m', 'http.server', $Port) `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $serverLog `
    -RedirectStandardError $serverErrorLog `
    -PassThru

Start-Sleep -Seconds 2

try {
    $null = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 10
}
catch {
    Stop-ProcessIfRunning -Id $serverProcess.Id
    throw "Local server did not start correctly. Check $serverErrorLog"
}

$tunnelProcess = Start-Process `
    -FilePath 'ssh' `
    -ArgumentList @(
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ExitOnForwardFailure=yes',
        '-R', "80:localhost:$Port",
        '-T', 'nokey@localhost.run',
        '--', '--output', 'json'
    ) `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError $tunnelErrorLog `
    -PassThru

$publicUrl = $null
$deadline = (Get-Date).AddSeconds($WaitSeconds)

while (-not $publicUrl -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1

    $publicUrl = Get-PublicUrlFromTunnelLog -Path $tunnelLog

    if ($tunnelProcess.HasExited) {
        break
    }
}

if (-not $publicUrl) {
    Stop-ProcessIfRunning -Id $serverProcess.Id
    Stop-ProcessIfRunning -Id $tunnelProcess.Id
    throw "Could not get a public URL from localhost.run. Check $tunnelLog and $tunnelErrorLog"
}

$state = [PSCustomObject]@{
    url = $publicUrl
    port = $Port
    serverPid = $serverProcess.Id
    tunnelPid = $tunnelProcess.Id
    serverLog = $serverLog
    serverErrorLog = $serverErrorLog
    tunnelLog = $tunnelLog
    tunnelErrorLog = $tunnelErrorLog
    startedAt = (Get-Date).ToString('o')
}

$state | ConvertTo-Json | Set-Content -Path $statePath
$publicUrl | Set-Content -Path $publicUrlPath

Write-Host "MentorLoop is live at: $publicUrl"
Write-Host "To stop it later, run: .\stop-online.ps1"

