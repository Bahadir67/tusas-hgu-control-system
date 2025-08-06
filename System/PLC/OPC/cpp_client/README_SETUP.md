# TUSAS HGU C++ Development Setup

## Method 1: Visual Studio Community (Recommended)

### Step 1: Install Visual Studio
1. Download Visual Studio Community 2022 (FREE):
   ```
   https://visualstudio.microsoft.com/downloads/
   ```

2. During installation, select:
   - ✅ **Desktop development with C++**
   - ✅ **C++ CMake tools for Visual Studio**
   - ✅ **Git for Windows** 
   - ✅ **Windows 11 SDK (10.0.22000)**

### Step 2: Run Setup Script
```cmd
# Run as Administrator
setup_dev_environment.bat
```

## Method 2: Build Tools Only

If you don't want full Visual Studio:

```cmd
# Run as Administrator
install_vs_buildtools.bat
```

Then run:
```cmd
setup_dev_environment.bat
```

## Method 3: Alternative Tools

For lightweight setup:

```cmd
setup_simple.bat
```

This installs:
- Git
- CMake  
- Microsoft C++ Build Tools
- LLVM/Clang compiler

## Manual Dependencies

If automatic installation fails, install manually:

### 1. vcpkg (Package Manager)
```cmd
git clone https://github.com/Microsoft/vcpkg.git C:\vcpkg
cd C:\vcpkg
bootstrap-vcpkg.bat
vcpkg integrate install
```

### 2. Required Libraries
```cmd
C:\vcpkg\vcpkg install open62541:x64-windows
C:\vcpkg\vcpkg install curl:x64-windows  
C:\vcpkg\vcpkg install nlohmann-json:x64-windows
```

## Build Project

### Option 1: Command Line
```cmd
cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake
cmake --build . --config Release
```

### Option 2: Visual Studio
1. File → Open → CMake...
2. Select `CMakeLists.txt`
3. Build → Build All

### Option 3: Automated
```cmd
build.bat
```

## Troubleshooting

### Error: "vcpkg not found"
```cmd
# Add to PATH
set PATH=%PATH%;C:\vcpkg
```

### Error: "CMake not found"
```cmd
# Restart command prompt after installation
# Or add CMake to PATH manually
```

### Error: "open62541 not found"
```cmd
# Reinstall with explicit triplet
vcpkg install open62541:x64-windows --recurse
```

### Error: "compiler not found"
```cmd
# Option 1: Install Visual Studio
# Option 2: Use alternative compiler
cmake .. -G "MinGW Makefiles"
```

## System Requirements

- **OS**: Windows 10/11 (x64)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB for tools + dependencies
- **Network**: Required for downloading packages

## Performance Notes

**Development Build**:
- Debug symbols included
- No optimizations
- ~5MB executable

**Release Build**:
- Optimized for speed
- ~2MB executable
- 10,000+ tags/second performance