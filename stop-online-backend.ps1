$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $projectRoot '.mentorloop-backend-online.json'

if (-not (Test-Path $statePath)) {
    Write-Host 'No backend tunnel state found.'
    exit 0
}

$state = Get-Content $statePath -Raw | ConvertFrom-Json
foreach ($pidValue in @($state.apiPid, $state.tunnelPid)) {
    if (-not $pidValue) { continue }
    try { Stop-Process -Id $pidValue -Force -ErrorAction Stop } catch {}
}

Remove-Item $statePath -Force -ErrorAction SilentlyContinue
Write-Host 'Backend API and tunnel stopped.'
