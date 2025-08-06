# Suggested Commands for TUSAŞ HGU Project

## Development Commands

### Build and Run
```powershell
# Build entire solution
cd tusas-hgu-modern\backend
dotnet build

# Run API server
cd tusas-hgu-modern\backend\TUSAS.HGU.API
dotnet run

# Run with specific port
dotnet run --urls="http://localhost:5144"
```

### Testing and Validation
```powershell
# Test OPC connection
Invoke-RestMethod -Uri "http://localhost:5144/api/opc/status" -Method GET | ConvertTo-Json

# Test variable read
Invoke-RestMethod -Uri "http://localhost:5144/api/opc/read/MOTOR_1_TARGET_EXECUTION" -Method GET

# Test variable write
Invoke-RestMethod -Uri "http://localhost:5144/api/opc/write" -Method POST -ContentType "application/json" -Body '{"displayName":"MOTOR_1_TARGET_EXECUTION","value":30.5}'

# Get metadata
curl http://localhost:5144/api/opc/metadata

# Get latest sensor data
curl http://localhost:5144/api/opc/sensors/latest
```

### InfluxDB Queries
```powershell
# Query recent sensor data
curl -H "Authorization: Token vDyMTLnK9Ze12qzvugZmMmt7-z6ygg6btQl1wPjOCX9B51vmK5NxV2Ys-2dByV8KMo6ntgmuAI0VEClZow295w==" -H "Content-Type: application/vnd.flux" -X POST http://localhost:8086/api/v2/query?org=34c60c1a89df9a26 -d 'from(bucket: "tusas_hgu") |> range(start: -1m) |> filter(fn: (r) => r._measurement == "hgu_sensors") |> limit(n: 10)'
```

## File Operations
```powershell
# List project files
Get-ChildItem -Recurse -Name

# Find files
Get-ChildItem -Recurse -Filter "*.cs"

# Search in files
Select-String -Pattern "OPC" -Path *.cs -Recurse
```

## Git Commands
```powershell
# Initialize repository
git init

# Add files
git add .

# Commit changes
git commit -m "feat: Add new feature"

# Check status
git status

# View log
git log --oneline
```

## Windows System Commands
```powershell
# Process management
Get-Process -Name "TUSAS.HGU.API"
Stop-Process -Name "TUSAS.HGU.API" -Force

# Network check
Test-NetConnection 192.168.100.10 -Port 4840

# Service check
Get-Service | Where-Object {$_.Name -like "*influx*"}
```