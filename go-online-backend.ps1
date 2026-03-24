param(
    [int]$Port = 8787,
    [int]$WaitSeconds = 25
)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $projectRoot '.mentorloop-backend-online.json'
$urlPath = Join-Path $projectRoot 'backend-url.txt'
$enrollmentHtmlPath = Join-Path $projectRoot 'enrollment.html'
$apiLog = Join-Path $projectRoot 'backend-api.log'
$tunnelLog = Join-Path $projectRoot 'backend-tunnel.log'
$tunnelErr = Join-Path $projectRoot 'backend-tunnel-error.log'

function Stop-IfAlive {
    param([int]$Id)
    if (-not $Id) { return }
    try { Stop-Process -Id $Id -Force -ErrorAction Stop } catch {}
}

if (Test-Path $statePath) {
    $old = Get-Content $statePath -Raw | ConvertFrom-Json
    Stop-IfAlive -Id $old.apiPid
    Stop-IfAlive -Id $old.tunnelPid
    Remove-Item $statePath -Force -ErrorAction SilentlyContinue
}

Remove-Item $urlPath,$apiLog,$tunnelLog,$tunnelErr -Force -ErrorAction SilentlyContinue

$apiProcess = Start-Process -FilePath 'python' -ArgumentList @('api-server.py') -WorkingDirectory $projectRoot -RedirectStandardOutput $apiLog -RedirectStandardError $apiLog -PassThru
Start-Sleep -Seconds 2

try {
    $null = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/health" -TimeoutSec 10
} catch {
    Stop-IfAlive -Id $apiProcess.Id
    throw "API did not start. Check backend-api.log"
}

$tunnelProcess = Start-Process -FilePath 'ssh' -ArgumentList @(
    '-o','StrictHostKeyChecking=no',
    '-o','ServerAliveInterval=30',
    '-o','ExitOnForwardFailure=yes',
    '-R',"80:localhost:$Port",
    '-T','nokey@localhost.run',
    '--','--output','json'
) -WorkingDirectory $projectRoot -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelErr -PassThru

$publicUrl = $null
$deadline = (Get-Date).AddSeconds($WaitSeconds)
while (-not $publicUrl -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    if (Test-Path $tunnelLog) {
        $lines = Get-Content $tunnelLog -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if (-not $trimmed.StartsWith('{')) { continue }
            try { $obj = $trimmed | ConvertFrom-Json -ErrorAction Stop } catch { continue }
            if ($obj.address) {
                $publicUrl = "https://$($obj.address)"
                break
            }
        }
    }
    if ($tunnelProcess.HasExited) { break }
}

if (-not $publicUrl) {
    Stop-IfAlive -Id $apiProcess.Id
    Stop-IfAlive -Id $tunnelProcess.Id
    throw "Could not create backend public URL. Check backend-tunnel.log"
}

$state = [PSCustomObject]@{
    apiPid = $apiProcess.Id
    tunnelPid = $tunnelProcess.Id
    url = $publicUrl
    startedAt = (Get-Date).ToString('o')
}
$state | ConvertTo-Json | Set-Content $statePath
$publicUrl | Set-Content $urlPath

if (Test-Path $enrollmentHtmlPath) {
    $html = Get-Content $enrollmentHtmlPath -Raw
    $updated = $html -replace '<meta name="mentorloop-api-base" content="[^"]*" />', "<meta name=\"mentorloop-api-base\" content=\"$publicUrl\" />"
    Set-Content -Path $enrollmentHtmlPath -Value $updated
}

Write-Host "MentorLoop backend is live at: $publicUrl"
Write-Host "Saved to backend-url.txt"
Write-Host "Updated enrollment.html API base URL"

