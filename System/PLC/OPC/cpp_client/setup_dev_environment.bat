@echo off
REM TUSAS HGU C++ Development Environment Setup
REM This script sets up the development environment for the C++ OPC UA client

echo ========================================
echo TUSAS HGU C++ Development Setup
echo ========================================

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/8] Checking Visual Studio installation...
where cl >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Visual Studio C++ compiler not found
    echo Please install Visual Studio 2019 or later with C++ development tools
    pause
    exit /b 1
) else (
    echo ✓ Visual Studio C++ compiler found
)

echo.
echo [2/8] Checking CMake installation...
where cmake >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing CMake...
    winget install Kitware.CMake
    if %errorLevel% neq 0 (
        echo ERROR: Failed to install CMake
        echo Please install CMake manually from https://cmake.org/
        pause
        exit /b 1
    )
) else (
    echo ✓ CMake found
)

echo.
echo [3/8] Checking Git installation...
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing Git...
    winget install Git.Git
    if %errorLevel% neq 0 (
        echo ERROR: Failed to install Git
        pause
        exit /b 1
    )
) else (
    echo ✓ Git found
)

echo.
echo [4/8] Checking vcpkg installation...
if not exist "C:\vcpkg" (
    echo Installing vcpkg...
    cd C:\
    git clone https://github.com/Microsoft/vcpkg.git
    cd vcpkg
    call bootstrap-vcpkg.bat
    vcpkg integrate install
    cd %~dp0
) else (
    echo ✓ vcpkg found at C:\vcpkg
)

echo.
echo [5/8] Installing open62541...
C:\vcpkg\vcpkg install open62541:x64-windows
if %errorLevel% neq 0 (
    echo ERROR: Failed to install open62541
    pause
    exit /b 1
) else (
    echo ✓ open62541 installed
)

echo.
echo [6/8] Installing curl...
C:\vcpkg\vcpkg install curl:x64-windows
if %errorLevel% neq 0 (
    echo ERROR: Failed to install curl
    pause
    exit /b 1
) else (
    echo ✓ curl installed
)

echo.
echo [7/8] Installing nlohmann-json...
C:\vcpkg\vcpkg install nlohmann-json:x64-windows
if %errorLevel% neq 0 (
    echo ERROR: Failed to install nlohmann-json
    pause
    exit /b 1
) else (
    echo ✓ nlohmann-json installed
)

echo.
echo [8/8] Creating build directories...
if not exist "build" mkdir build
if not exist "logs" mkdir logs
if not exist "certificates" mkdir certificates

echo.
echo ========================================
echo Development Environment Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Open Visual Studio 2019/2022
echo 2. File ^> Open ^> CMake... and select CMakeLists.txt
echo 3. Configure and build the project
echo.
echo Or use command line:
echo   cd build
echo   cmake .. -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake
echo   cmake --build . --config Release
echo.
echo Dependencies installed:
echo   - open62541 (OPC UA library)
echo   - curl (HTTP client)
echo   - nlohmann-json (JSON parser)
echo.
pause