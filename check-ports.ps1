Write-Host "Checking ports..." -ForegroundColor Green

# Check what's listening on 3000-5999
$ports = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 5999 }

if ($ports) {
    Write-Host "Active ports found:" -ForegroundColor Yellow
    foreach ($port in $ports) {
        Write-Host "Port $($port.LocalPort) - PID: $($port.OwningProcess)" -ForegroundColor White
    }
} else {
    Write-Host "No ports 3000-5999 active" -ForegroundColor Green
}

# Kill specific forbidden ports
$forbiddenPorts = @(5001, 5002, 5003, 3001, 3002, 3003)
foreach ($port in $forbiddenPorts) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        Write-Host "Killing processes on port $port" -ForegroundColor Red
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Port check complete!" -ForegroundColor Green