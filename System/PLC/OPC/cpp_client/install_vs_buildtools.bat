@echo off
REM Install Visual Studio Build Tools for C++ development

echo ========================================
echo Installing Visual Studio Build Tools
echo ========================================

echo [1/3] Downloading Visual Studio Build Tools...
powershell -Command "& {Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile 'vs_buildtools.exe'}"

if not exist "vs_buildtools.exe" (
    echo ERROR: Failed to download Visual Studio Build Tools
    echo Please download manually from: https://visualstudio.microsoft.com/downloads/
    pause
    exit /b 1
)

echo [2/3] Installing Build Tools (this may take 10-15 minutes)...
echo Installing C++ build tools, CMake, and vcpkg...

vs_buildtools.exe --quiet --wait --add Microsoft.VisualStudio.Workload.VCTools ^
    --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 ^
    --add Microsoft.VisualStudio.Component.VC.CMake.Project ^
    --add Microsoft.VisualStudio.Component.Windows11SDK.22000 ^
    --add Microsoft.VisualStudio.Component.VC.ASAN ^
    --includeRecommended

if %errorLevel% neq 0 (
    echo ERROR: Visual Studio Build Tools installation failed
    echo Please install manually with C++ development tools
    pause
    exit /b 1
)

echo [3/3] Cleaning up...
del vs_buildtools.exe

echo.
echo ========================================
echo Visual Studio Build Tools Installed!
echo ========================================
echo.
echo Next: Run setup_dev_environment.bat
echo.
pause