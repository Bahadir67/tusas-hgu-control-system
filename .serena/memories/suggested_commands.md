# Essential Commands for TUSAŞ HGU Control System

## Build Commands
```bash
# Standard build (use Windows PowerShell)
dotnet.exe build

# Release build
dotnet build --configuration Release

# Self-contained deployment for production
dotnet publish --self-contained true --runtime win-x64 --output ./dist
```

## Testing Commands
```bash
# Manual InfluxDB connectivity test
manual_test.bat

# PowerShell InfluxDB test
test_influx.ps1
```

## Development Environment Setup
- Requires **InfluxDB Server** at localhost:8086
- Requires **PLC/PLCSIM** - Siemens S7-1500 at 192.168.100.10:4840
- Requires **Visual Studio 2022** with .NET 6.0 Windows SDK
- Requires **WebView2 Runtime** for Grafana integration

## PowerShell Management Scripts (../Tools/Scripts/)
- `Setup-PLCSIM-Environment.ps1` - PLCSIM configuration
- `Install-InfluxDB-NSSM.ps1` - InfluxDB service setup
- `Debug-InfluxDB.ps1` - Database troubleshooting
- `Clean-All-InfluxDB-Services.ps1` - Service cleanup

## Git Commands
```bash
git status
git add .
git commit -m "message"
git push
```

## System Commands (Linux environment)
```bash
ls -la          # List files with details
cd directory    # Change directory
grep pattern    # Search in files
find . -name    # Find files by name
```