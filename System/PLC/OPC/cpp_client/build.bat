@echo off
REM TUSAS HGU C++ OPC Client Build Script

echo ========================================
echo TUSAS HGU C++ OPC Client Build
echo ========================================

REM Check if vcpkg is available
if not exist "C:\vcpkg\vcpkg.exe" (
    echo ERROR: vcpkg not found at C:\vcpkg
    echo Please run setup_dev_environment.bat first
    pause
    exit /b 1
)

REM Create build directory
if not exist "build" mkdir build
cd build

echo [1/3] Configuring CMake...
cmake .. -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake -DCMAKE_BUILD_TYPE=Release
if %errorLevel% neq 0 (
    echo ERROR: CMake configuration failed
    pause
    exit /b 1
)

echo.
echo [2/3] Building project...
cmake --build . --config Release
if %errorLevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Build completed successfully!

REM Check if executable was created
if exist "Release\tusas_hgu_opcua_client.exe" (
    echo ✓ Executable created: Release\tusas_hgu_opcua_client.exe
) else if exist "tusas_hgu_opcua_client.exe" (
    echo ✓ Executable created: tusas_hgu_opcua_client.exe
) else (
    echo WARNING: Executable not found in expected location
)

echo.
echo ========================================
echo Build Summary
echo ========================================
echo Project: TUSAS HGU OPC UA Client
echo Build Type: Release (optimized)
echo Target: Windows x64
echo Dependencies: open62541, curl, nlohmann-json
echo.
echo To run the client:
echo   1. Configure config\config.json
echo   2. Run the executable from build directory
echo.
cd ..
pause