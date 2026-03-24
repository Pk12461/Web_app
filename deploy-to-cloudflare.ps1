# MentorLoop - Deploy to Cloudflare Pages (API Token method)
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MentorLoop - Cloudflare Pages Deploy  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need a FREE Cloudflare API Token." -ForegroundColor White
Write-Host ""
Write-Host "STEP 1: Open this URL in your browser:" -ForegroundColor Yellow
Write-Host "  https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEP 2: Click 'Create Token'" -ForegroundColor Yellow
Write-Host "STEP 3: Use template: 'Edit Cloudflare Workers'" -ForegroundColor Yellow
Write-Host "        OR click 'Create Custom Token' and enable:" -ForegroundColor Yellow
Write-Host "        - Account > Cloudflare Pages > Edit" -ForegroundColor White
Write-Host "STEP 4: Click 'Continue to Summary' then 'Create Token'" -ForegroundColor Yellow
Write-Host "STEP 5: COPY the token shown (you only see it once!)" -ForegroundColor Yellow
Write-Host ""

$token = Read-Host "Paste your Cloudflare API Token here and press Enter"

if (-not $token.Trim()) {
    Write-Host "No token entered. Exiting." -ForegroundColor Red
    pause
    exit 1
}

$env:CLOUDFLARE_API_TOKEN = $token.Trim()

Write-Host ""
Write-Host "[1/2] Building dist folder..." -ForegroundColor Yellow
node build-pages.mjs
Write-Host "      Done!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/2] Deploying to Cloudflare Pages..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name mentorloop --branch main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "  Visit: https://mentorloop.pages.dev" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
