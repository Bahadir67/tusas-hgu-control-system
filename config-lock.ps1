$BACKEND_CONFIG = "C:\projects\tusas_hgu\tusas-hgu-modern\backend\TUSAS.HGU.API\Properties\launchSettings.json"
$FRONTEND_CONFIG = "C:\projects\tusas_hgu\tusas-hgu-modern\Frontend\vite.config.ts"

$EXPECTED_BACKEND_PORT = '"applicationUrl": "http://localhost:5000"'
$EXPECTED_FRONTEND_PORT = 'port: 3000,'

Write-Host "Configuration Lock System" -ForegroundColor Red
Write-Host "=========================" -ForegroundColor Red

Write-Host "Checking backend config..." -ForegroundColor Yellow
$backendContent = Get-Content $BACKEND_CONFIG -Raw
if ($backendContent -match $EXPECTED_BACKEND_PORT) {
    Write-Host "Backend port 5000 - PROTECTED" -ForegroundColor Green
} else {
    Write-Host "BACKEND PORT VIOLATION DETECTED!" -ForegroundColor Red
    Write-Host "Expected: $EXPECTED_BACKEND_PORT" -ForegroundColor White
    Write-Host "Configuration has been CORRUPTED!" -ForegroundColor Red
}

Write-Host "Checking frontend config..." -ForegroundColor Yellow
$frontendContent = Get-Content $FRONTEND_CONFIG -Raw
if ($frontendContent -match $EXPECTED_FRONTEND_PORT) {
    Write-Host "Frontend port 3000 - PROTECTED" -ForegroundColor Green
} else {
    Write-Host "FRONTEND PORT VIOLATION DETECTED!" -ForegroundColor Red
    Write-Host "Expected: $EXPECTED_FRONTEND_PORT" -ForegroundColor White
    Write-Host "Configuration has been CORRUPTED!" -ForegroundColor Red
}

Write-Host "=========================" -ForegroundColor Red
Write-Host "RULE: Backend=5000, Frontend=3000 ONLY!" -ForegroundColor Red