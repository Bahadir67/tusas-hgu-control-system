# TUSAŞ HGU Control System - Claude Development Guide

## 🎯 Current Status
**Backend:** ✅ Complete (26/26 tasks)  
**Frontend:** 🔄 In Progress (Task 27/29)  
**Overall Progress:** 90% Complete

## 📍 Where We Are Now

### Current Task: #27 - Tauri Setup
**Status:** Waiting for Rust installation
**Location:** `C:\projects\tusas_hgu\`

**Required Actions:**
1. Install Rust from https://rustup.rs/
2. Run: `cargo install tauri-cli`
3. Verify: `rustc --version` and `cargo --version`

## 📋 Remaining Tasks

### Task #27: Tauri Setup (IN PROGRESS)
```bash
# After Rust installation:
cargo install tauri-cli
npm create tauri-app@latest
```

### Task #28: Frontend Dashboard Components
- [ ] Create React project structure
- [ ] Build 6x Motor Panel components
- [ ] Implement System Overview panel
- [ ] Setup Zustand global state
- [ ] Industrial UI theme (dark + bright gauges)

### Task #29: Batch API Optimization
- [ ] Add `/api/opc/batch` endpoint to C# backend
- [ ] Return all variables in single response
- [ ] Optimize from 50 HTTP/s → 1 HTTP/s

## 🏗️ System Architecture

### Backend (✅ COMPLETE - DO NOT MODIFY)
**Location:** `C:\projects\tusas_hgu_otomasyon\TUSAS.HGU.Control\`
- C# .NET 9 + OPC UA + InfluxDB
- Authentication: user1/masterkey
- API: /api/opc/read, /api/opc/write
- Real-time collection: 1-second updates

### Frontend (🔄 BUILDING)
**Location:** `C:\projects\tusas_hgu\`
- Tauri (Rust + React)
- 6x 75kW motor dashboard
- Global state with Zustand
- Batch API integration

## 🎨 Dashboard Design

### System Layout
```
┌─────────────────────────────────────────────┐
│  SYSTEM: 125.5 bar | 450 L/min | 0.02% leak │
├─────────────────────────────────────────────┤
│  [Motor 1]    [Motor 2]    [Motor 3]        │
│  [Motor 4]    [Motor 5]    [Motor 6]        │
└─────────────────────────────────────────────┘
```

### Motor Panel Features
- Status: Ready(🔵), Running(🟢), Warning(🟡), Error(🔴)
- Pressure gauge with real-time value
- Setpoint input control
- Leak test button

### Variables
**Read:** MOTOR_X_PRESSURE_VALUE, MOTOR_X_STATUS, SYSTEM_TOTALS
**Write:** MOTOR_X_PRESSURE_SETPOINT, MOTOR_X_LEAK_EXECUTION

## 🚀 Quick Start Commands

### Check Backend Status
```powershell
cd C:\projects\tusas_hgu_otomasyon\TUSAS.HGU.Control\
dotnet run
# API runs on: http://localhost:5000
```

### Start Frontend Development (After Rust Install)
```powershell
cd C:\projects\tusas_hgu\
npm create tauri-app@latest -- --name hgu-dashboard --template react-ts
cd hgu-dashboard
npm install zustand axios
npm run tauri dev
```

### Test OPC Connection
```bash
curl http://localhost:5000/api/opc/status
curl http://localhost:5000/api/opc/read/MOTOR_4_LEAK_EXECUTION
```

## 📁 Project Structure

```
C:\projects\
├── tusas_hgu_otomasyon\
│   └── TUSAS.HGU.Control\     # ✅ Backend (KEEP AS IS)
│       ├── A1.xml              # 136 OPC variables
│       ├── Program.cs          # Main API
│       └── OPC/                # OPC UA client
│
└── tusas_hgu\                  # 🔄 Frontend (NEW)
    ├── CLAUDE.md               # This file
    ├── System\PLC\S7-1500\Development\  # ✅ PLC Code Structure
    │   ├── Function_Blocks\    # All FB files (.scl)
    │   ├── User_Data_Types\    # All UDT files (.scl)
    │   ├── Organization_Blocks\ # Main programs (.scl)
    │   ├── Data_Blocks\        # DB files (.scl)
    │   └── Tools\              # Utilities & helpers
    ├── .serena/                # Memory storage
    └── hgu-dashboard/          # Tauri app (TO CREATE)
```

## 🔧 **PLC Code Organization Rule**

**IMPORTANT:** All PLC code files (.scl) MUST be placed in:
`C:\projects\tusas_hgu\System\PLC\S7-1500\Development\`

- **Function_Blocks\** → FB_*.scl files
- **User_Data_Types\** → UDT_*.scl files  
- **Organization_Blocks\** → OB_*.scl, Main_*.scl files
- **Data_Blocks\** → DB_*.scl files
- **Tools\** → Utility scripts and helpers

## 🔧 Development Tips

### Backend API Endpoints
- `GET /api/opc/status` - Connection status
- `GET /api/opc/read/{displayName}` - Read variable
- `POST /api/opc/write` - Write variable
- `GET /api/opc/batch` - (TODO) Batch read all

### Frontend State Management
```javascript
// Global store with Zustand
const useOpcStore = create((set) => ({
  variables: {},
  updateAll: (data) => set({ variables: data })
}));

// Single timer for all updates
setInterval(() => {
  fetch('/api/opc/batch')
    .then(res => res.json())
    .then(data => store.updateAll(data));
}, 1000);
```

## 🎯 Next Immediate Actions

1. **Complete Rust Installation**
   - Download: https://rustup.rs/
   - Install with default options
   - Restart terminal

2. **Initialize Tauri Project**
   ```bash
   cd C:\projects\tusas_hgu\
   npm create tauri-app@latest
   ```

3. **Start Building Dashboard**
   - Motor panel components
   - System overview
   - API integration

## 📝 Important Notes

- **DO NOT** move backend from `tusas_hgu_otomasyon`
- **DO NOT** modify working OPC/InfluxDB setup
- Backend API must be running for frontend to work
- Use batch API for performance (1 request/second)
- All 6 motors work together for single output

## 🔗 Resources

- Tauri Docs: https://tauri.app/v1/guides/
- Zustand: https://github.com/pmndrs/zustand
- OPC UA: Already implemented in backend
- InfluxDB: Running on localhost:8086

---
**Last Update:** 2025-08-06
**Current Focus:** Rust Installation → Tauri Setup → Dashboard Components
**Contact:** Continue with `claude --resume` in this directory