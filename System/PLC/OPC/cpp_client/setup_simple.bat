@echo off
REM Simplified setup for systems without Visual Studio

echo ========================================
echo TUSAS HGU C++ Simple Setup
echo ========================================

echo Installing required tools via winget...

echo [1/5] Installing Git...
winget install --id Git.Git -e --silent
if %errorLevel% neq 0 echo WARNING: Git installation may have failed

echo [2/5] Installing CMake...
winget install --id Kitware.CMake -e --silent
if %errorLevel% neq 0 echo WARNING: CMake installation may have failed

echo [3/5] Installing Microsoft C++ Build Tools...
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent
if %errorLevel% neq 0 echo WARNING: Build Tools installation may have failed

echo [4/5] Installing LLVM (alternative compiler)...
winget install --id LLVM.LLVM -e --silent
if %errorLevel% neq 0 echo WARNING: LLVM installation may have failed

echo [5/5] Creating project structure...
if not exist "build" mkdir build
if not exist "logs" mkdir logs
if not exist "certificates" mkdir certificates
if not exist "lib" mkdir lib

echo.
echo ========================================
echo Setup completed!
echo ========================================
echo.
echo You may need to restart your command prompt
echo for PATH changes to take effect.
echo.
echo Alternative build options:
echo 1. Install Visual Studio Community (recommended)
echo 2. Use LLVM/Clang compiler
echo 3. Use MinGW-w64
echo.
echo To verify installation:
echo   where cmake
echo   where git
echo   where cl.exe (Visual Studio)
echo   where clang (LLVM)
echo.
pause