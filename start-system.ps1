# ================================================
# TUSAŞ HGU System Starter with Port Guardian
# ================================================

Write-Host "🚀 TUSAŞ HGU System Starter" -ForegroundColor Green

# Step 1: Run Port Guardian
Write-Host "`n1️⃣  Running Port Guardian..." -ForegroundColor Cyan
try {
    & "C:\projects\tusas_hgu\port-guardian.ps1"
} catch {
    Write-Host "❌ Port Guardian failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Verify ports are clear
Write-Host "`n2️⃣  Final port verification..." -ForegroundColor Cyan
$backendInUse = (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0
$frontendInUse = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0

if ($backendInUse) {
    Write-Host "⚠️  Port 5000 is in use. Stopping..." -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -LocalPort 5000
    foreach ($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

if ($frontendInUse) {
    Write-Host "⚠️  Port 3000 is in use. Stopping..." -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -LocalPort 3000
    foreach ($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host "`n3️⃣  Starting Backend on Port 5000..." -ForegroundColor Cyan
$backendPath = "C:\projects\tusas_hgu\tusas-hgu-modern\backend\TUSAS.HGU.API"

# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; dotnet run" -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend started
$backendStarted = (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0
if ($backendStarted) {
    Write-Host "✅ Backend started on port 5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend failed to start on port 5000" -ForegroundColor Red
    exit 1
}

Write-Host "`n4️⃣  Starting Frontend on Port 3000..." -ForegroundColor Cyan
$frontendPath = "C:\projects\tusas_hgu\tusas-hgu-modern\Frontend"

# Start frontend in background  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Final verification
Write-Host "`n5️⃣  Final System Check..." -ForegroundColor Cyan
$backendFinal = (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0
$frontendFinal = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0

Write-Host "`n🎯 SYSTEM STATUS:" -ForegroundColor White
Write-Host "=================" -ForegroundColor White
if ($backendFinal) {
    Write-Host "✅ Backend  : Running on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend  : FAILED" -ForegroundColor Red
}

if ($frontendFinal) {
    Write-Host "✅ Frontend : Running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend : FAILED" -ForegroundColor Red
}

if ($backendFinal -and $frontendFinal) {
    Write-Host "`n🎉 SYSTEM READY!" -ForegroundColor Green
    Write-Host "🌐 Open: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ SYSTEM STARTUP FAILED!" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")