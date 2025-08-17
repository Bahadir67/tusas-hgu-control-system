# OPC Server Fault Namespace Mapping

## 📋 DB_HGU_Execution_V17 → Fault Namespace Mapping

**Source:** DB_HGU_Execution_V17  
**Target Namespace:** `ns=2;s=Fault.*`

### 🔴 Critical Safety Variables (Priority 4-5)
```
DB_HGU_Execution_V17.CRITICAL_SAFETY_ERROR    → Fault.Emergency_Stop_Active
DB_HGU_Execution_V17.ANY_MOTOR_ERROR          → Fault.Motor_Thermal_Error
DB_HGU_Execution_V17.SAFETY_ERROR_WORD        → Fault.SAFETY_ERROR_WORD
DB_HGU_Execution_V17.MOTOR_ERROR_WORD         → Fault.MOTOR_ERROR_WORD
DB_HGU_Execution_V17.SAFETY_ERROR_CODE        → Fault.SAFETY_ERROR_CODE
```

### 🔍 Core Error Analysis Variables (UI ihtiyacı)
```
DB_HGU_Execution_V17.ANALOG_SENSOR_ERROR      → Fault.Analog_Sensor_Error
DB_HGU_Execution_V17.ANALOG_ERROR_CODE        → Fault.ANALOG_ERROR_CODE
DB_HGU_Execution_V17.CAN_SYSTEM_ERROR         → Fault.CAN_System_Error  
DB_HGU_Execution_V17.CAN_ACTIVE_DEVICE_COUNT  → Fault.CAN_Active_Device_Count
```

### 🔧 Additional Analysis Variables
```
DB_HGU_Execution_V17.VALVE_WATCHDOG_ERROR     → Fault.Valve_Watchdog_Error
DB_HGU_Execution_V17.VALVE_EMERGENCY_STOP     → Fault.Valve_Emergency_Stop_Required
DB_HGU_Execution_V17.VALVE_COMMUNICATION_OK   → Fault.Valve_Communication_OK
DB_HGU_Execution_V17.FILTER_ERROR_CODE        → Fault.FILTER_ERROR_CODE
DB_HGU_Execution_V17.TANK_LEVEL_ERROR         → Fault.Tank_Level_Error
DB_HGU_Execution_V17.CHILLER_FLOW_ERROR       → Fault.Chiller_Flow_Error
DB_HGU_Execution_V17.MCC_ERROR_CODE           → Fault.MCC_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_SELECTION_ERROR    → Fault.Motor_Selection_Error
DB_HGU_Execution_V17.G120C_COMMUNICATION_OK   → Fault.G120C_Communication_OK
DB_HGU_Execution_V17.G120C_SAFETY_ERROR       → Fault.G120C_Safety_Error
DB_HGU_Execution_V17.G120C_PARAMETER_ERROR    → Fault.G120C_Parameter_Error
DB_HGU_Execution_V17.DUAL_CONTROLLER_ERROR_CODE → Fault.DUAL_CONTROLLER_ERROR_CODE
```

### 🔴 Motor Status Variables (6 Motor için)
```
DB_HGU_Execution_V17.MOTOR_1_STATUS           → Fault.MOTOR_1_STATUS
DB_HGU_Execution_V17.MOTOR_1_ERROR_CODE       → Fault.MOTOR_1_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_2_STATUS           → Fault.MOTOR_2_STATUS  
DB_HGU_Execution_V17.MOTOR_2_ERROR_CODE       → Fault.MOTOR_2_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_3_STATUS           → Fault.MOTOR_3_STATUS
DB_HGU_Execution_V17.MOTOR_3_ERROR_CODE       → Fault.MOTOR_3_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_4_STATUS           → Fault.MOTOR_4_STATUS
DB_HGU_Execution_V17.MOTOR_4_ERROR_CODE       → Fault.MOTOR_4_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_5_STATUS           → Fault.MOTOR_5_STATUS
DB_HGU_Execution_V17.MOTOR_5_ERROR_CODE       → Fault.MOTOR_5_ERROR_CODE
DB_HGU_Execution_V17.MOTOR_6_STATUS           → Fault.MOTOR_6_STATUS
DB_HGU_Execution_V17.MOTOR_6_ERROR_CODE       → Fault.MOTOR_6_ERROR_CODE
```

## 📡 OPC Server Configuration

### Node Structure
```
Root
└── Fault (ns=2)
    ├── Emergency_Stop_Active
    ├── Motor_Thermal_Error
    ├── Valve_Watchdog_Error
    ├── ...
    ├── SAFETY_ERROR_WORD
    ├── MOTOR_ERROR_WORD
    └── ANALOG_ERROR_CODE
```

### Batch API Endpoint
**Endpoint:** `GET /api/opc/batch/fault`
**Response:** JSON object with all Fault namespace variables
```json
{
  "Emergency_Stop_Active": false,
  "Motor_Thermal_Error": false,
  "SAFETY_ERROR_WORD": 0,
  "MOTOR_ERROR_WORD": 0,
  "ANALOG_ERROR_CODE": 0,
  "timestamp": "2025-01-17T10:30:00Z"
}
```

### 📈 Bit Analysis Strategy (109 Spesifik Error Kodu)

**Core Analysis Variables:**
- **SAFETY_ERROR_WORD** (WORD) → 6 Emergency Stop sources (Bits 0-5)
- **MOTOR_ERROR_WORD** (WORD) → 9 Motor thermal errors (Bits 0-8) 
- **ANALOG_ERROR_CODE** (USINT) → 19 Analog sensor errors (Values 1-19)
- **CAN_ACTIVE_DEVICE_COUNT** (USINT) → 14 CAN device watchdog (Expected: 14)
- **MOTOR_X_STATUS** (USINT) → 6 Motor G120C status (Value 3 = Fault)
- **MOTOR_X_ERROR_CODE** (USINT) → 6 Motor specific error codes
- **DUAL_CONTROLLER_ERROR_CODE** (USINT) → Flow/Pressure controller errors (11-14, 21-24)
- **FILTER_ERROR_CODE** (USINT) → Motor filter errors (711-717)
- **MCC_ERROR_CODE** (USINT) → MCC feedback errors (741-745)

**UI Error Derivation Logic:**
```javascript
// Emergency Stop Sources (6 specific)
if (SAFETY_ERROR_WORD & 0x0001) → Emergency_Stop_PLC_Panel
if (SAFETY_ERROR_WORD & 0x0002) → Emergency_Stop_GP_Panel
if (SAFETY_ERROR_WORD & 0x0004) → Emergency_Stop_Unit_1
// ... continue for all 6 sources

// Motor Thermal Errors (9 specific)
if (MOTOR_ERROR_WORD & 0x0001) → Motor_1_Thermal_Error
if (MOTOR_ERROR_WORD & 0x0002) → Motor_2_Thermal_Error
// ... continue for all 9 motors

// G120C Drive Faults (6 specific)
if (MOTOR_1_STATUS === 3) → Motor_1_G120C_Fault + MOTOR_1_ERROR_CODE
if (MOTOR_2_STATUS === 3) → Motor_2_G120C_Fault + MOTOR_2_ERROR_CODE
// ... continue for all 6 motors

// Analog Sensor Errors (19 specific)
if (ANALOG_ERROR_CODE === 1) → System_Temperature_Sensor_Error
if (ANALOG_ERROR_CODE === 4) → Motor_1_Pressure_Sensor_Error
// ... continue for all 19 sensors

// CAN Device Watchdog (14 specific)
activeDevices = CAN_ACTIVE_DEVICE_COUNT;
for(device = 1; device <= 14; device++) {
  if (!isDeviceActive(device)) → CAN_Device_X_Watchdog
}
```

**Performance Metrics:**
- **Total Variables:** ~25 core variables in Fault namespace
- **Derived Errors:** 109 specific error codes from bit/value analysis
- **Update Rate:** 1-second polling from PLC DB_HGU_Execution_V17
- **UI Polling:** 1-second from OPC Server via `/api/opc/batch/fault`
- **Error Processing:** Client-side bit analysis for real-time specificity