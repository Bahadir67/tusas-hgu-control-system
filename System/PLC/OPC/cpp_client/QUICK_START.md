# TUSAS HGU C++ Client - Quick Start

Visual Studio Community kurulumu tamamlandı! Şimdi projeyi açalım.

## Step 1: vcpkg Package Manager

**Developer Command Prompt for VS 2022** açın:
- Start Menu → Visual Studio 2022 → Developer Command Prompt for VS 2022

```cmd
cd C:\
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
bootstrap-vcpkg.bat
vcpkg integrate install
```

## Step 2: Install Dependencies

```cmd
vcpkg install open62541:x64-windows
vcpkg install curl:x64-windows  
vcpkg install nlohmann-json:x64-windows
```

Bu işlem 5-10 dakika sürebilir (internetten download + compile).

## Step 3: Open Project in Visual Studio

1. **Visual Studio Community 2022** açın
2. **File** → **Open** → **CMake...**
3. Navigate to: `C:\projects\tusas_hgu_otomasyon\System\PLC\OPC\cpp_client`
4. Select **CMakeLists.txt**
5. Click **Open**

## Step 4: CMake Configuration

Visual Studio otomatik olarak:
- vcpkg toolchain detect edecek
- CMake configure edecek  
- Dependencies bulacak
- Build files generate edecek

**Output** penceresinde **CMake** seçin ve işlemin bitmesini bekleyin:
```
[cmake] -- Build files have been written to: C:/projects/tusas_hgu_otomasyon/System/PLC/OPC/cpp_client/build
```

## Step 5: Build Configuration

- Top toolbar'da **Release** seçin (Debug yerine)
- **x64** architecture seçin
- Startup Project: **tusas_hgu_opcua_client.exe**

## Step 6: Build Project

- **Build** → **Build All** (Ctrl+Shift+B)
- Ya da **Solution Explorer**'da right-click → **Build**

Success mesajı göreceksiniz:
```
========== Build: 1 succeeded, 0 failed, 0 up-to-date, 0 skipped ==========
```

## Step 7: Verify Build

Build output location:
```
C:\projects\tusas_hgu_otomasyon\System\PLC\OPC\cpp_client\build\Release\tusas_hgu_opcua_client.exe
```

## Next Steps

1. **Configure** → Edit `config/config.json`  
2. **Test Run** → F5 (Debug) or Ctrl+F5 (Run)
3. **Deploy** → Windows Service installation

Ready to rock! 🚀