# ================================================
# TUSAŞ HGU Port Guardian Script  
# Backend: 5000 (ONLY), Frontend: 3000 (ONLY)
# ================================================

Write-Host "🛡️  TUSAŞ HGU Port Guardian - Starting..." -ForegroundColor Green

# Define ports
$ALLOWED_BACKEND_PORT = 5000
$ALLOWED_FRONTEND_PORT = 3000
$FORBIDDEN_PORTS = @(5001, 5002, 5003, 5004, 3001, 3002, 3003, 3004, 8080, 8000)

Write-Host "🧹 Cleaning forbidden ports..." -ForegroundColor Yellow

# Kill forbidden ports
foreach ($port in $FORBIDDEN_PORTS) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "🚨 Found forbidden port $port in use!" -ForegroundColor Red
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                Write-Host "   Stopping PID: $processId" -ForegroundColor Red
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        # Port not in use, which is good
    }
}

Write-Host "✅ Forbidden ports cleaned" -ForegroundColor Green

# Show current status
Write-Host "`n📊 Current Port Status:" -ForegroundColor White
Write-Host "========================" -ForegroundColor White

try {
    $allPorts = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 5999 }
    if ($allPorts) {
        foreach ($port in $allPorts) {
            if ($port.LocalPort -eq $ALLOWED_BACKEND_PORT) {
                Write-Host "✅ Port $($port.LocalPort) : Backend (ALLOWED)" -ForegroundColor Green
            } elseif ($port.LocalPort -eq $ALLOWED_FRONTEND_PORT) {
                Write-Host "✅ Port $($port.LocalPort) : Frontend (ALLOWED)" -ForegroundColor Green  
            } else {
                Write-Host "❌ Port $($port.LocalPort) : FORBIDDEN" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "ℹ️  No ports 3000-5999 in use" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "⚠️  Could not check port status" -ForegroundColor Yellow
}

Write-Host "========================" -ForegroundColor White
Write-Host "✅ Port Guardian complete!" -ForegroundColor Green
Write-Host "📝 ALLOWED: Backend=5000, Frontend=3000 ONLY!" -ForegroundColor Cyan