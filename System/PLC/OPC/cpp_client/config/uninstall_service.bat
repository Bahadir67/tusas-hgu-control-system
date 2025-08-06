@echo off
REM Uninstall TUSAS HGU OPC UA Client Windows Service

echo ========================================
echo TUSAS HGU OPC UA Service Uninstallation
echo ========================================

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

set SERVICE_NAME=TusasHguOpcClient

echo [1/3] Checking service status...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo Service "%SERVICE_NAME%" is not installed.
    pause
    exit /b 0
)

echo [2/3] Stopping service...
sc stop "%SERVICE_NAME%"
if %errorLevel% == 0 (
    echo Service stopped successfully.
    timeout /t 5 /nobreak >nul
) else (
    echo Service was not running or failed to stop.
)

echo [3/3] Uninstalling service...
sc delete "%SERVICE_NAME%"
if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo Service Uninstalled Successfully!
    echo ========================================
    echo.
    echo The TUSAS HGU OPC UA Client service has been removed.
    echo Log files and configuration remain in place.
    echo.
) else (
    echo.
    echo ERROR: Failed to uninstall service
    echo The service may still be running or in use.
    echo Try stopping all related processes and run this script again.
    echo.
)

pause