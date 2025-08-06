# Visual Studio Community Setup Guide

## Installation Requirements

When installing Visual Studio Community, make sure to select these workloads:

### ✅ Required Workloads
- **Desktop development with C++**
  - MSVC v143 compiler toolset
  - Windows 11 SDK (10.0.22000 or latest)
  - CMake tools for Visual Studio
  - Git for Windows
  - IntelliSense

### ✅ Individual Components (Optional but Recommended)
- **Debugging Tools**
  - Just-In-Time debugger
  - Graphics debugger and GPU profiler
- **Code Tools**
  - Live Share
  - GitHub extension for Visual Studio

## Post-Installation Setup

### 1. Install vcpkg (Package Manager)
Open **Developer Command Prompt for VS 2022**:

```cmd
cd C:\
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
bootstrap-vcpkg.bat
vcpkg integrate install
```

### 2. Install Required Libraries
```cmd
vcpkg install open62541:x64-windows
vcpkg install curl:x64-windows
vcpkg install nlohmann-json:x64-windows
```

### 3. Open the Project
1. Launch Visual Studio Community
2. **File** → **Open** → **CMake...**
3. Navigate to: `C:\projects\tusas_hgu_otomasyon\System\PLC\OPC\cpp_client`
4. Select `CMakeLists.txt`
5. Click **Open**

### 4. Configure CMake
Visual Studio will automatically:
- Detect vcpkg toolchain
- Configure CMake
- Download missing dependencies
- Generate build files

Wait for the **CMake generation** to complete (check Output window).

### 5. Build Configuration
- Set build configuration to **Release** (for performance)
- Set target architecture to **x64**
- Select **tusas_hgu_opcua_client.exe** as startup project

### 6. Build Project
- **Build** → **Build All** (Ctrl+Shift+B)
- Or right-click project → **Build**

## Visual Studio Features for Our Project

### Debugging
- **Breakpoints**: Set breakpoints in OPC UA callback functions
- **Call Stack**: Trace multi-threaded execution
- **Watch Variables**: Monitor sensor data in real-time
- **Memory Usage**: Profile performance bottlenecks

### IntelliSense
- **Auto-completion**: Full open62541 API
- **Error Detection**: Real-time syntax checking
- **Navigation**: Go to definition, find all references
- **Refactoring**: Rename symbols across project

### Integrated Tools
- **Git Integration**: Built-in source control
- **CMake Integration**: No need for external tools
- **Package Manager**: vcpkg integration
- **Testing**: Built-in test runner

## Development Workflow

### 1. Code → Build → Test
```
Edit code → F7 (Build) → F5 (Debug Run) → Test with PLC
```

### 2. Release Build
```
Configuration: Release → Build All → Deploy to production
```

### 3. Debugging Session
```
Set breakpoints → F5 (Start Debugging) → Step through OPC UA callbacks
```

## Project Structure in VS

```
Solution Explorer:
├── CMakeLists.txt
├── include/
│   ├── common.hpp
│   ├── opcua_client.hpp
│   ├── influxdb_writer.hpp
│   └── ...
├── src/
│   └── main.cpp
├── config/
│   └── config.json
└── External Dependencies (vcpkg)
    ├── open62541
    ├── curl
    └── nlohmann-json
```

## Tips for TUSAS HGU Development

### Performance Profiling
- **Tools** → **Performance Profiler**
- Monitor CPU usage during high-throughput scenarios
- Check memory allocation patterns

### Real-time Debugging
- Use **Diagnostic Tools** window
- Monitor thread activity during OPC UA subscriptions
- Track InfluxDB write performance

### Configuration Management
- Edit `config/config.json` directly in VS
- JSON syntax highlighting and validation
- Restart debugger after config changes

## Build Verification

After successful build, you should see:

```
Build Output:
1>------ Build started: Project: tusas_hgu_opcua_client ------
1>Building CXX object CMakeFiles/tusas_hgu_opcua_client.dir/src/main.cpp.obj
1>Linking CXX executable tusas_hgu_opcua_client.exe
1>Build succeeded.
========== Build: 1 succeeded, 0 failed, 0 up-to-date, 0 skipped ==========
```

### Output Location
- **Debug**: `build/Debug/tusas_hgu_opcua_client.exe`
- **Release**: `build/Release/tusas_hgu_opcua_client.exe`

Ready to develop! 🚀