# TUSAŞ HGU Sensor Systems - Complete Integration Analysis

## 🎯 Executive Summary
TUSAŞ HGU hydraulic control system implements a sophisticated multi-tier sensor architecture with:
- **7 pressure sensor arrays** (main + HSM pressure monitoring)
- **14 CAN flow sensors** (P-line + leak detection via TCP/IP-CAN conversion)
- **Temperature monitoring** (system + chiller arrays)
- **CAN-controlled Danfoss valves** (bypass + proportional pressure control)
- **Parker pollution monitoring** (ISO 4406 particle analysis)
- **Dual calibration system** (accredited + local drift correction)

---

## 🔧 1. Core Sensor Arrays Architecture

### **Primary Pressure Monitoring** (300 bar range)
```scl
PRESSURE_VALUES : Array[1..7] of Real;      // Main pressure sensors (0-300 bar)
PRESSURE_QUALITY : Array[1..7] of Bool;     // Data quality indicators
```
**Technical Specs**:
- **Signal Type**: 4-20mA analog (6554-32767 ADC counts)
- **Calibration**: Dual-layer (accredited lab + local drift correction)
- **Filter Time**: 1s low-pass (configurable)
- **Uncertainty**: 0.25% measurement accuracy

### **HSM Pressure Monitoring** (400 bar range)  
```scl
HSM_PRESSURE_VALUES : Array[1..7] of Real;  // High-speed monitoring (0-400 bar)
HSM_PRESSURE_QUALITY : Array[1..7] of Bool; // HSM quality indicators
```
**Purpose**: Critical pressure monitoring with faster sampling for emergency detection

### **Temperature Sensor Arrays**
- **System Temperature**: Single sensor (-40 to +150°C, 5s filter)
- **Chiller Array**: 2 sensors (-40 to +150°C, 3s filter)
- **All 4-20mA**: Standard analog scaling with temperature compensation

---

## 📡 2. CAN-Ethernet Flow Sensor Network

### **P-Line Main Flow Measurement**
```scl  
PLINE_FLOW_VALUES : Array[1..7] of Real;    // Main flow per motor (0-150 L/min)
PLINE_FLOW_STATUS : Array[1..7] of Bool;    // CAN communication status
```
**Network Configuration**:
- **CAN Device IDs**: 21-27 (Motor1-7 main flow sensors)
- **TCP/IP Endpoint**: 192.168.100.101:10001
- **Protocol**: 13-byte CANOPEN frame via TCP/IP-CAN converter
- **Baud Rate**: 250 kbit/s CAN
- **Timeout**: 5 seconds
- **Range**: 0-150 L/min (matches Danfoss ER-R-100B-LS pump capacity)

### **Leak Detection Flow Measurement**
```scl
LEAK_FLOW_VALUES : Array[1..7] of Real;     // Leak flow per motor (0-15 L/min)
LEAK_FLOW_STATUS : Array[1..7] of Bool;     // CAN communication status  
LEAK_ALARM : Array[1..7] of Bool;           // Major leak >1.0 L/min
LEAK_WARNING : Array[1..7] of Bool;         // Minor leak >0.1 L/min
```
**Network Configuration**:
- **CAN Device IDs**: 1-7 (Motor1-7 leak detection sensors)
- **TCP/IP Endpoint**: 192.168.100.100:10000
- **Deadband**: 0.01 L/min (ultra-sensitive leak detection)
- **Alarm Logic**: 0.1 L/min warning, 1.0 L/min alarm

### **CAN-Ethernet Protocol Implementation**
```scl
// TSEND_C/TRCV_C TCP socket communication
CANOPEN_Frame_Structure:
Byte[0] := CAN_NODE_ID          // Device Node ID (1-27)
Byte[1] := DLC                  // Data Length Code (8)
Byte[2..9] := CAN_DATA          // 8 bytes CAN payload
Byte[10..11] := CRC16           // Frame validation  
Byte[12] := TERMINATOR          // End of frame (0xFF)
```

---

## 🎛️ 3. Danfoss Valve Control System

### **Digital Bypass Valves** (8 units)
```scl
PUMP1_BYPASS_VALVE_CMD : Bool;              // Open/close command
PUMP1_BYPASS_VALVE_STATUS : Bool;           // Actual position feedback
PUMP1_BYPASS_VALVE_ERROR : USInt;           // Error code (0-3)
```
**Error Mapping**: 0=OK, 1=No Current, 2=Short Circuit, 3=Other Fault

### **Proportional Pressure Control Valves** (6 units)
```scl  
PUMP1_PROP_VALVE_CMD : Int;                 // Position command (0-10000)
PUMP1_PROP_VALVE_POSITION : Int;            // Actual position (0-10000)
PUMP1_PROP_VALVE_CURRENT : Int;             // Current feedback (mA)
```

### **PID Control Integration** (FB_CAN_Danfoss_Valves)
- **P Gain**: 2.0 (default proportional gain)
- **I Gain**: 0.5 (default integral gain)  
- **D Gain**: 0.1 (default derivative gain)
- **Position Deadband**: 1.0% (control precision)
- **CAN Protocol**: MC050-120 native CAN communication

---

## 🔬 4. Parker Pollution Monitoring

### **ISO 4406 Particle Classification**
```scl
PARTICLE_COUNT_4UM : Real;                  // Particles >4μm per ml
PARTICLE_COUNT_6UM : Real;                  // Particles >6μm per ml
PARTICLE_COUNT_14UM : Real;                 // Particles >14μm per ml
ISO_CODE_4UM : USInt;                       // ISO classification (10-30)
ISO_CODE_6UM : USInt;                       // ISO classification (10-30)  
ISO_CODE_14UM : USInt;                      // ISO classification (10-30)
```

### **Pollution Classification Algorithm**
```scl
IF ISO_CODE_COMBINED <= 16 THEN
    POLLUTION_LEVEL := 0;    // Clean fluid
ELSIF ISO_CODE_COMBINED <= 18 THEN
    POLLUTION_LEVEL := 1;    // Normal contamination
ELSIF ISO_CODE_COMBINED <= 21 THEN  
    POLLUTION_LEVEL := 2;    // Warning level
ELSE
    POLLUTION_LEVEL := 3;    // Critical contamination
END_IF;
```

### **RS485 Communication** 
- **Protocol**: Modbus RTU
- **Baud Rate**: 9600 bps (configurable up to 115200)
- **Device Address**: 1-247 range
- **Timeout**: 1 second with 3 retries
- **Update Interval**: 10 seconds with 30s filtering

---

## ⚖️ 5. Dual Calibration Management

### **Laboratory Accredited Calibration**
```scl
ACCREDITED_OFFSET : Real := 0.0;            // Lab certificate offset
ACCREDITED_GAIN : Real := 1.0;              // Lab certificate gain
ACCREDITED_DATE : Date := D#2025-08-10;     // Certificate issue date
ACCREDITED_DUE_DATE : Date := D#2026-08-10; // Certificate expiry  
CERTIFICATE_NUMBER : String[50];           // Lab certificate ID
LABORATORY_NAME : String[50];              // Accredited lab name
UNCERTAINTY_PERCENT : Real := 0.25;        // Measurement uncertainty
```

### **Local Drift Correction**
```scl
LOCAL_DRIFT_OFFSET : Real := 0.0;           // Field-measured drift
LOCAL_DRIFT_GAIN : Real := 1.0;             // Field-measured gain
LOCAL_LAST_DATE : Date := D#2025-08-10;     // Last local calibration
LOCAL_NEXT_DATE : Date := D#2025-08-17;     // Next local calibration
LOCAL_TECHNICIAN : String[30];             // Technician name
```

### **Combined Calibration Application** (FB_HGU_Scaling)
```scl
FINAL_OFFSET = ACCREDITED_OFFSET + LOCAL_DRIFT_OFFSET;
FINAL_GAIN = ACCREDITED_GAIN * LOCAL_DRIFT_GAIN;
CALIBRATED_VALUE = (LINEAR_SCALED_VALUE + FINAL_OFFSET) * FINAL_GAIN;
```

---

## 🔗 6. G120C PROFINET Motor Integration

### **Real-time Motor Data Acquisition**
```scl
MOTOR_X_POWER_INPUT : Real;                 // Input power from G120C (kW)
MOTOR_X_VOLTAGE : Real;                     // Motor voltage from G120C (V)  
MOTOR_X_CURRENT : Real;                     // Motor current from G120C (A)
MOTOR_X_RPM : Real;                         // Motor speed from G120C (RPM)
MOTOR_X_POWER_FACTOR : Real;                // Power factor from G120C
```

### **Efficiency Calculation Integration** (FB_Pump_Efficiency)
```scl
MOTOR_X_INSTANTANEOUS_EFFICIENCY : Real;    // Real-time efficiency (%)
MOTOR_X_AVERAGE_EFFICIENCY_1MIN : Real;     // 1-minute moving average (%)
MOTOR_X_HYDRAULIC_POWER : Real;             // Calculated hydraulic output (kW)
MOTOR_X_EFFICIENCY_VALID : Bool;            // Calculation validity flag
```

### **Load Sensing Mode Detection**
```scl
MOTOR_X_LS_MODE_ACTIVE : Bool;              // LS displacement control active
MOTOR_X_STANDBY_MODE_ACTIVE : Bool;         // Zero displacement standby
MOTOR_X_CURRENT_DISPLACEMENT_RATIO : Real;  // Effective displacement (0-1.0)
```

---

## 🚨 7. System Health & Alarm Integration

### **Critical Alarm Conditions**
```scl
ALARM_HIGH_PRESSURE : Bool;                 // >280 bar alarm  
ALARM_LOW_PRESSURE : Bool;                  // <50 bar alarm
ALARM_HIGH_TEMPERATURE : Bool;              // >80°C alarm
ALARM_LOW_TANK_LEVEL : Bool;                // <15% tank level
ALARM_MAJOR_LEAK : Bool;                    // >1.0 L/min leak detected
ALARM_POLLUTION_CRITICAL : Bool;            // ISO >21 pollution level
```

### **Communication Health Monitoring**
```scl
VALVE_COMMUNICATION_OK : Bool;              // All valve CAN communication OK
PARKER_DEVICE_ERROR : Bool;                 // Parker RS485 device errors  
CAN_COMMUNICATION_OK : Bool;                // CAN-Ethernet network status
PROFINET_MOTORS_OK : Bool;                  // G120C PROFINET communication
```

### **Data Quality Assessment Framework**
- **Quality Flags**: Per-sensor boolean quality indicators
- **Range Validation**: Under/over-range detection (4-20mA signals)
- **Trend Analysis**: Rate-of-change validation and spike detection
- **Communication Timeouts**: Configurable timeout per device type
- **Consecutive Error Counting**: Automatic device offline detection

---

## 📊 8. Performance & Scaling Characteristics

### **System Scan Performance**:
- **Total Sensors**: 39 analog + 14 CAN + 1 RS485 + 7 PROFINET motors
- **Update Rates**: 100ms analog, 1s CAN, 10s pollution, 250ms PROFINET
- **Processing Load**: ~15% CPU utilization on S7-1500 (estimated)
- **Memory Usage**: ~50KB data blocks for sensor storage

### **Network Bandwidth**:
- **CAN Networks**: 250 kbit/s per network (2 networks)
- **PROFINET**: Standard Class B (100 Mbps)
- **TCP/IP**: 100 Mbps Ethernet (CAN-Ethernet converters)
- **RS485**: 9.6 kbit/s (Parker device)

### **Scalability Considerations**:
- **CAN Device Expansion**: Up to NodeID 127 per network
- **Analog Expansion**: S7-1500 supports up to 30 AI modules
- **PROFINET Motors**: Up to 64 drives per network
- **TCP/IP Sockets**: 32 concurrent connections maximum