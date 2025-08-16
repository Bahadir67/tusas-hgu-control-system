# Sensör Sistemleri Mapping - Comprehensive Analysis

## 1. Sensör Array Yapıları (DB_HGU_Execution)

### **Pressure Sensors** - Ana Sistem Basınç Monitoring
```scl
PRESSURE_VALUES : Array[1..7] of Real;      // Calibrated pressure values (bar)
PRESSURE_QUALITY : Array[1..7] of Bool;     // Pressure sensor quality
```
- **Range**: 0-300 bar (standard pressure sensors)
- **Signal Type**: 4-20mA analog
- **Locations**: 7 farklı basınç ölçüm noktası
- **Purpose**: Ana sistem basınç kontrolü

### **HSM Pressure Sensors** - Yüksek Hızlı Monitoring
```scl
HSM_PRESSURE_VALUES : Array[1..7] of Real;  // HSM pressure values (bar)  
HSM_PRESSURE_QUALITY : Array[1..7] of Bool; // HSM pressure sensor quality
```
- **Range**: 0-400 bar (yüksek basınç sistemi)
- **Signal Type**: 4-20mA analog  
- **Purpose**: High-Speed Monitoring, kritik basınç takibi
- **Response Time**: Daha hızlı örnekleme

### **System Temperature Monitoring**
```scl
SYSTEM_TEMPERATURE_VALUE : Real;            // Calibrated system temperature (°C)
SYSTEM_TEMPERATURE_QUALITY : Bool;          // System temperature quality
```
- **Range**: -40 to +150°C
- **Signal Type**: 4-20mA analog
- **Purpose**: Genel sistem sıcaklık kontrolü

---

## 2. CAN Bus Flow Sensor Arrays

### **P-Line Flow Sensors** (Main Flow Measurement)
```scl
PLINE_FLOW_VALUES : Array[1..7] of Real;    // P-Line flow values (L/min)
PLINE_FLOW_STATUS : Array[1..7] of Bool;    // Communication status
```
**Calibration Parameters** (DB_HGU_Calibration):
- **CAN Device IDs**: 21-27 (NodeID mapping)
- **TCP/IP**: 192.168.100.101:10001
- **Range**: 0-150 L/min (matches LS pump capacity)
- **Protocol**: CAN-Ethernet TCP/IP conversion
- **Uncertainty**: 0.5% measurement accuracy

### **Leak Flow Sensors** (Leak Detection System)
```scl
LEAK_FLOW_VALUES : Array[1..7] of Real;     // Leak flow values (L/min)  
LEAK_FLOW_STATUS : Array[1..7] of Bool;     // Communication status
LEAK_ALARM : Array[1..7] of Bool;           // Major leak >1.0 L/min
LEAK_WARNING : Array[1..7] of Bool;         // Minor leak >0.1 L/min
```
**Calibration Parameters**:
- **CAN Device IDs**: 1-7 (sequential NodeID)
- **TCP/IP**: 192.168.100.100:10000  
- **Range**: 0-15 L/min (leak detection range)
- **Deadband**: 0.01 L/min (very sensitive)
- **Uncertainty**: 1.0% measurement accuracy

### **Leak Detection Logic**:
```scl
// Warning thresholds
IF LEAK_FLOW_VALUES[i] > 0.1 THEN
    LEAK_WARNING[i] := TRUE;  // Minor leak detected
END_IF;

IF LEAK_FLOW_VALUES[i] > 1.0 THEN
    LEAK_ALARM[i] := TRUE;    // Major leak alarm
END_IF;
```

---

## 3. CAN-Ethernet Network Architecture

### **Network Topology**:
```
S7-1500 PLC ←→ Ethernet ←→ CAN-Ethernet Converters ←→ CAN Bus ←→ Flow Sensors
     ↑                           ↓                        ↓
TCP/IP Sockets              192.168.100.x:10xxx      NodeID 1-27
```

### **CAN Device ID Mapping**:
- **P-Line Flow**: NodeID 21-27 (Pump1-7 main flow)
- **Leak Flow**: NodeID 1-7 (Pump1-7 leak detection)  
- **Future**: NodeID 10-16 (CANOPEN upgrade compatibility)

### **TCP/IP Configuration**:
- **P-Line Network**: 192.168.100.101:10001
- **Leak Network**: 192.168.100.100:10000
- **Timeout**: 5 seconds communication timeout
- **Protocol**: TCP sockets with CAN frame encapsulation

---

## 4. Danfoss Valve Control Integration

### **Digital Bypass Valves** (8 valves total):
```scl
PUMP1_BYPASS_VALVE_CMD : Bool;              // Command
PUMP1_BYPASS_VALVE_STATUS : Bool;           // Position feedback  
PUMP1_BYPASS_VALVE_ERROR : USInt;           // Error codes (0-3)
```
**Error Code Mapping**: 0=OK, 1=No Current, 2=Short Circuit, 3=Other Fault

### **Proportional Pressure Control Valves** (6 valves):
```scl
PUMP1_PROP_VALVE_CMD : Int;                 // Command (0-10000)
PUMP1_PROP_VALVE_POSITION : Int;            // Actual position (0-10000)
PUMP1_PROP_VALVE_CURRENT : Int;             // Current feedback (mA)
```

### **Valve System Status**:
```scl
VALVE_SYSTEM_STATUS : USInt;                // 0=OK, 1=Warning, 2=Error, 3=Offline
ACTIVE_VALVE_COUNT : USInt;                 // Number of active valves
VALVE_COMMUNICATION_OK : Bool;              // Overall communication status
```

---

## 5. Parker Pollution Measurement Integration

### **ISO 4406 Particle Analysis**:
```scl
PARTICLE_COUNT_4UM : Real;                  // Particles >4μm per ml
PARTICLE_COUNT_6UM : Real;                  // Particles >6μm per ml  
PARTICLE_COUNT_14UM : Real;                 // Particles >14μm per ml
ISO_CODE_4UM : USInt;                       // ISO 4406 code (10-30)
ISO_CODE_6UM : USInt;                       // ISO 4406 code (10-30)
ISO_CODE_14UM : USInt;                      // ISO 4406 code (10-30)
```

### **Pollution Classification**:
```scl
POLLUTION_LEVEL : USInt;                    // 0=Clean, 1=Normal, 2=Warning, 3=Critical
POLLUTION_STATUS : USInt;                   // 0=OK, 1=Warning, 2=Error, 3=Offline
```

### **RS485 Communication** (FB_Parker_RS485):
- **Protocol**: Modbus RTU
- **Baud Rate**: Configurable (typically 9600-115200)
- **Timeout**: User-configurable (default 3s)
- **Data Processing**: Real-time particle counting with trend analysis

---

## 6. Analog Scaling & Calibration System

### **Dual Calibration Architecture**:
```scl
ACCREDITED_OFFSET : Real;                   // Lab certificate correction
ACCREDITED_GAIN : Real;                     // Lab certificate gain
LOCAL_DRIFT_OFFSET : Real;                  // Field drift correction
LOCAL_DRIFT_GAIN : Real;                    // Field drift gain

// Combined correction
FINAL_OFFSET = ACCREDITED_OFFSET + LOCAL_DRIFT_OFFSET;
FINAL_GAIN = ACCREDITED_GAIN * LOCAL_DRIFT_GAIN;
```

### **Calibration Status Tracking**:
```scl
CALIBRATION_STATUS : USInt;                 // 0=Valid, 1=Due, 2=Overdue, 3=Failed
CALIBRATION_ALARM : Bool;                   // Calibration alarm status  
CERTIFICATE_NUMBER : String[50];           // Lab certificate reference
UNCERTAINTY_PERCENT : Real;                // Measurement uncertainty
```

### **4-20mA Signal Processing**:
- **ADC Range**: 6554-32767 counts (4-20mA)
- **Under-Range**: <6054 counts (broken wire detection)
- **Over-Range**: >33267 counts (short circuit detection)
- **Filter Time**: Configurable per sensor (1-5s typical)

---

## 7. Motor & G120C Integration

### **PROFINET Data Acquisition**:
```scl
MOTOR_X_POWER_INPUT : Real;                 // Input power from G120C (kW)
MOTOR_X_VOLTAGE : Real;                     // Motor voltage from G120C (V)
MOTOR_X_POWER_FACTOR : Real;                // Power factor from G120C
```

### **Efficiency Calculation Integration**:
```scl
MOTOR_X_INSTANTANEOUS_EFFICIENCY : Real;    // Real-time efficiency (%)
MOTOR_X_AVERAGE_EFFICIENCY_1MIN : Real;     // 1-minute average (%)
MOTOR_X_HYDRAULIC_POWER : Real;             // Hydraulic power output (kW)
MOTOR_X_EFFICIENCY_VALID : Bool;            // Calculation validity
```

### **LS Mode Status Tracking**:
```scl
MOTOR_X_LS_MODE_ACTIVE : Bool;              // LS mode active (displacement > 0)
MOTOR_X_STANDBY_MODE_ACTIVE : Bool;         // Standby mode (zero displacement)
```

---

## 8. System Health & Diagnostics

### **Alarm Management**:
```scl
ALARM_HIGH_PRESSURE : Bool;                 // High pressure alarm
ALARM_LOW_PRESSURE : Bool;                  // Low pressure alarm  
ALARM_HIGH_TEMPERATURE : Bool;              // High temperature alarm
ALARM_LOW_TANK_LEVEL : Bool;                // Low tank level alarm
```

### **Communication Health**:
```scl
VALVE_COMMUNICATION_OK : Bool;              // Valve system communication
PARKER_DEVICE_ERROR : Bool;                 // Parker device errors
CAN_COMMUNICATION_OK : Bool;                // CAN network status
```

### **Data Quality Assessment**:
- **Quality Flags**: Boolean indicators per sensor array
- **Validation Logic**: Range checking, trend analysis, timeout detection
- **Error Counting**: Consecutive error thresholds for fault classification
- **Recovery Mechanisms**: Automatic retry logic and fallback values