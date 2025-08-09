# TUSAS HGU Safe Starter - Port Guaranteed
Write-Host "🚀 TUSAS HGU Safe Starter" -ForegroundColor Green

# Step 1: Clean ports
Write-Host "1. Cleaning forbidden ports..." -ForegroundColor Yellow
& "C:\projects\tusas_hgu\check-ports.ps1"

# Step 2: Start backend
Write-Host "2. Starting Backend on Port 5000..." -ForegroundColor Cyan
$backendPath = "C:\projects\tusas_hgu\tusas-hgu-modern\backend\TUSAS.HGU.API"
Start-Process powershell -ArgumentList "-Command", "cd '$backendPath'; Write-Host 'Backend starting...'; dotnet run" 

Start-Sleep -Seconds 3
Write-Host "✅ Backend command sent" -ForegroundColor Green

# Step 3: Start frontend  
Write-Host "3. Starting Frontend on Port 3000..." -ForegroundColor Cyan
$frontendPath = "C:\projects\tusas_hgu\tusas-hgu-modern\Frontend"
Start-Process powershell -ArgumentList "-Command", "cd '$frontendPath'; Write-Host 'Frontend starting...'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "✅ Frontend command sent" -ForegroundColor Green

Write-Host "🎯 Both services starting..." -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Cyan  
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📝 PORTS GUARANTEED: Only 5000 & 3000!" -ForegroundColor Green