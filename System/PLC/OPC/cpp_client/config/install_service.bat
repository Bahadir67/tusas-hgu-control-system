@echo off
REM Install TUSAS HGU OPC UA Client as Windows Service

echo ========================================
echo TUSAS HGU OPC UA Service Installation
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
set SERVICE_DISPLAY_NAME=TUSAS HGU OPC UA Client
set EXECUTABLE_PATH=%~dp0..\build\Release\tusas_hgu_opcua_client.exe

REM Check if executable exists
if not exist "%EXECUTABLE_PATH%" (
    echo ERROR: Executable not found at:
    echo %EXECUTABLE_PATH%
    echo.
    echo Please build the project first:
    echo   cd build
    echo   cmake --build . --config Release
    pause
    exit /b 1
)

echo [1/4] Stopping existing service (if running)...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/4] Uninstalling existing service (if exists)...
sc delete "%SERVICE_NAME%" >nul 2>&1

echo [3/4] Installing service...
sc create "%SERVICE_NAME%" ^
    binPath= "\"%EXECUTABLE_PATH%\" --service" ^
    DisplayName= "%SERVICE_DISPLAY_NAME%" ^
    start= auto ^
    type= own ^
    error= normal

if %errorLevel% neq 0 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

echo [4/4] Configuring service...

REM Set service description
sc description "%SERVICE_NAME%" "High-performance OPC UA client for TUSAS hydraulic power unit automation system. Collects real-time data from Siemens S7-1500 PLC and stores to InfluxDB."

REM Configure service recovery actions
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/5000/restart/10000/restart/30000

REM Set service to delayed auto start (better for system boot)
sc config "%SERVICE_NAME%" start= delayed-auto

echo.
echo ========================================
echo Service Installation Complete!
echo ========================================
echo.
echo Service Name: %SERVICE_NAME%
echo Display Name: %SERVICE_DISPLAY_NAME%
echo Executable: %EXECUTABLE_PATH%
echo Startup Type: Automatic (Delayed Start)
echo.
echo Management Commands:
echo   Start Service:   sc start "%SERVICE_NAME%"
echo   Stop Service:    sc stop "%SERVICE_NAME%"
echo   Service Status:  sc query "%SERVICE_NAME%"
echo   Uninstall:       sc delete "%SERVICE_NAME%"
echo.
echo Configuration:
echo   Edit config\config.json before starting the service
echo   Log files: logs\tusas_hgu_service.log
echo.

set /p START_NOW="Start the service now? (y/n): "
if /i "%START_NOW%"=="y" (
    echo.
    echo Starting service...
    sc start "%SERVICE_NAME%"
    if %errorLevel% == 0 (
        echo Service started successfully!
        echo.
        echo Check status with: sc query "%SERVICE_NAME%"
        echo View logs in: logs\tusas_hgu_service.log
    ) else (
        echo Failed to start service. Check configuration and logs.
    )
)

echo.
pause