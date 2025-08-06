# Visual Studio Community - Minimal Installation

## ✅ Sadece Bu Workload'u Seç:

### **Desktop development with C++**

Bu workload şunları içerir:
- **MSVC v143 compiler toolset** (C++ derleyici)
- **Windows 11 SDK** (Windows API'leri)
- **CMake tools** (Build system)
- **IntelliSense** (Code completion)
- **Debugger** (Debugging tools)

## ❌ Bunları Seçmene Gerek Yok:

- ~~Game development with C++~~
- ~~Mobile development with C++~~
- ~~Linux and embedded development~~
- ~~Universal Windows Platform~~
- ~~.NET development~~
- ~~Web development~~
- ~~Python development~~
- ~~Node.js development~~
- ~~Data science and analytical applications~~

## Kurulum Boyutu:

**Minimal:** ~3-4 GB (sadece C++ desktop)
**Full:** ~15+ GB (tüm workload'lar)

## Bizim İhtiyaçlarımız:

✅ **C++ compiler** → MSVC  
✅ **Build system** → CMake  
✅ **Debugging** → Visual Studio debugger  
✅ **Libraries** → vcpkg (sonra kuracağız)  
✅ **Git** → Built-in (opsiyonel)

## Installation Summary:

```
Visual Studio Installer:
  ☑️ Desktop development with C++
  ☐ Everything else
  
Click: Install
```

## Sonra Yapacağımız:

1. **vcpkg kurulumu** (package manager)
2. **open62541, curl, json** dependencies
3. **Project açma** (CMakeLists.txt)
4. **Build & Run**

**3-4 GB kurulum** vs **15+ GB** - Büyük fark! 

Sadece C++ desktop seçersen tamamen yeterli. WinUI, Node.js, Python vs. hiç gerekmiyor bizim industrial automation projesi için.

Kur gelsin! 🚀