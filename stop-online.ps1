$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $projectRoot '.study-online-online.json'

if (-not (Test-Path $statePath)) {
    Write-Host 'No active MentorLoop tunnel state file was found.'
    exit 0
}

$state = Get-Content $statePath -Raw | ConvertFrom-Json
$stopped = @()

foreach ($processId in @($state.serverPid, $state.tunnelPid)) {
    if (-not $processId) {
        continue
    }

    try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
        $stopped += $processId
    }
    catch {
    }
}

Remove-Item $statePath -Force

if ($stopped.Count -gt 0) {
    Write-Host ("Stopped processes: " + ($stopped -join ', '))
}
else {
    Write-Host 'No running MentorLoop processes were found, but the saved state was cleared.'
}

