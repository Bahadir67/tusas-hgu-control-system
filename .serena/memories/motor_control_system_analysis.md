# Motor Kontrol Sistemi - G120C PROFINET & PZD Telegram Analizi

## 1. G120C PROFINET Drive System

### **Drive Configuration**:
- **Model**: Siemens SINAMICS G120C
- **Communication**: PROFINET with Standard Telegram
- **Motor Count**: 6 motors (75kW each = 450kW total)
- **Control Type**: Speed control with efficiency feedback

### **FB_Pump_Efficiency G120C Integration**:

#### **G120C Standard Telegram Parameters**:
```scl
// Motor Parameters (from G120C PROFINET Standard Telegram)
Motor_Current : Real;                    // r0027 - Motor current (A)
Motor_Output_Voltage : Real;             // r0076 - Motor output voltage (V)  
Motor_Output_Power : Real;               // r0077 - Motor output power (kW)
Motor_RPM : Real;                        // r0063 - Current motor RPM
Motor_Temperature : Real;                // r0025 - Motor temperature (°C)
Motor_DC_Link_Voltage : Real;            // r0072 - DC link voltage (V) [optional]
```

#### **PZD (Process Data) Structure**:
**Standard G120C PROFINET Telegram**:
- **PZD-1**: STW1 (Control Word 1)
- **PZD-2**: HSW (Main Setpoint Value - RPM)
- **PZD-3**: ZSW1 (Status Word 1) 
- **PZD-4**: HIW (Main Actual Value - RPM)
- **PZD-5**: r0077 (Motor Output Power)
- **PZD-6**: r0027 (Motor Current)

---

## 2. Motor Control Data Mapping

### **DB_HGU_Execution Motor Variables** (6 motors):
```scl
MOTOR_X_MOTOR_RPM_EXECUTION : Real;           // Actual RPM (PZD-4/HIW/r0063)
MOTOR_X_MOTOR_TARGET_RPM_EXECUTION : Real;    // Target RPM setpoint (PZD-2/HSW)
MOTOR_X_MOTOR_CURRENT_EXECUTION : Real;       // Motor current (PZD-6/r0027)
MOTOR_X_MOTOR_TEMPERATURE_EXECUTION : Real;   // Motor temperature (r0025)
MOTOR_X_MOTOR_STATUS_EXECUTION : USInt;       // Status (derived from ZSW1)
```

### **Control Signal Flow**:
```
FB_HGU_Load_Balance_LS → RPM Setpoints → G120C HSW (PZD-2)
                      → Start Commands → G120C STW1 (PZD-1)
                      
G120C HIW (PZD-4) → Actual RPM → FB_Pump_Efficiency
G120C r0077 (PZD-5) → Motor Power → FB_Pump_Efficiency  
G120C r0027 (PZD-6) → Motor Current → FB_Pump_Efficiency
```

---

## 3. FB_Pump_Efficiency Motor Integration

### **G120C Data Acquisition**:
```scl
// Power calculation using G120C output power
IF Motor_Output_Power > 0.0 THEN
    // P_input = P_output / η_motor 
    Mechanical_Power := Motor_Output_Power / (Motor_Rated_Efficiency / 100.0);
ELSE
    // Fallback: estimate from current and voltage
    temp_power := SQRT3 * Motor_Output_Voltage * Motor_Current * 0.85;
    Mechanical_Power := temp_power * 0.001; // Convert to kW
END_IF;
```

### **Efficiency Calculation Algorithm**:
```scl
// Hydraulic power from flow and pressure
Hydraulic_Power := (Flow_Rate * Delta_Pressure) / 600.0; // kW

// Overall pump efficiency
IF Mechanical_Power > 0.1 THEN
    Instantaneous_Efficiency := (Hydraulic_Power / Mechanical_Power) * 100.0;
END_IF;
```

### **Load-Based Power Factor Estimation**:
```scl
// Dynamic power factor based on motor loading
temp_ratio := Motor_Current / 100.0;  // Normalize current
Power_Factor := 0.8 + (temp_ratio * 0.15); // 0.8-0.95 range
```

---

## 4. G120C Control Word (STW1) Bit Mapping

### **Standard STW1 Control Bits**:
- **Bit 0**: ON/OFF1 (Main switch)
- **Bit 1**: OFF2/Quick stop
- **Bit 2**: OFF3/Coast to halt
- **Bit 3**: Operation enable
- **Bit 6**: Setpoint enable
- **Bit 7**: Fault acknowledge
- **Bit 10**: Control by PLC

### **Status Word (ZSW1) Monitoring**:
- **Bit 0**: Ready to switch on
- **Bit 1**: Ready to operate  
- **Bit 2**: Operation enabled
- **Bit 3**: Fault active
- **Bit 6**: Setpoint acknowledgment
- **Bit 10**: Control requested

---

## 5. Motor Status Mapping Logic

### **Status Classification**:
```scl
// Motor status derived from G120C ZSW1
IF (ZSW1.3 = TRUE) THEN
    Motor_Status := 3; // Error
ELSIF (ZSW1.2 = TRUE) THEN  
    Motor_Status := 2; // Running
ELSIF (ZSW1.1 = TRUE) THEN
    Motor_Status := 1; // Ready  
ELSE
    Motor_Status := 0; // Offline
END_IF;
```

### **Error Code Processing**:
```scl
// G120C fault codes (r0947, r2122)
MOTOR_X_ERROR_CODE_EXECUTION := G120C_Fault_Code; // From PROFINET
```

---

## 6. Load Balancing Integration

### **RPM Setpoint Calculation** (from FB_HGU_Load_Balance_LS):
```scl
// LS pump RPM calculation
temp_rpm := (Individual_Flow_Target / LS_PUMP_DISPLACEMENT) * 1000.0;
temp_rpm := LIMIT(MN := 500.0, IN := temp_rpm, MX := 1400.0);

// Send to G120C via PROFINET
Motor1_Speed_Setpoint := temp_rpm; // → G120C HSW (PZD-2)
```

### **Start/Stop Command Processing**:
```scl
// Motor start command → G120C STW1
IF Motor1_Start_Command THEN
    G120C_STW1 := G120C_STW1 OR 16#000F; // Set ON/OFF1, enable bits
ELSE
    G120C_STW1 := G120C_STW1 AND 16#FFF0; // Clear control bits
END_IF;
```

---

## 7. Performance Monitoring Integration

### **Real-time Efficiency Feedback Loop**:
```
G120C Power Data → FB_Pump_Efficiency → Efficiency % → FB_HGU_Load_Balance_LS
                                            ↓
                                Motor Selection Algorithm
                                            ↓
                              Optimized Motor Commands → G120C
```

### **Energy Management**:
```scl
// Total energy integration (FB_Pump_Efficiency)
Total_Energy_Consumed += (Mechanical_Power / 3600.0); // kWh per second
Total_Hydraulic_Work += (Hydraulic_Power / 3600.0);   // kWh per second
```

### **Predictive Maintenance**:
```scl
// Maintenance indicator based on efficiency degradation
Maintenance_Indicator := (Average_Efficiency_1Min < (Peak_Efficiency * 0.7)) 
                         AND (Peak_Efficiency > 50.0);
```

---

## 8. Communication Architecture

### **PROFINET Network Structure**:
```
S7-1500 PLC ←→ PROFINET ←→ G120C Drives (6x)
    ↑                           ↓
OPC UA Server              Motor Control
    ↑                      (STW1/HSW out)
SCADA/HMI                  (ZSW1/HIW in)
```

### **Update Rates**:
- **PROFINET Cycle**: 4-8ms typical
- **PLC Scan**: 100ms
- **Load Balance**: 5 second intervals
- **Efficiency Calc**: 1 second intervals
- **OPC UA**: 1 second updates

### **Data Volume**:
- **Per Motor**: 6 PZD words (12 bytes)  
- **Total System**: 6 motors × 12 bytes = 72 bytes/cycle
- **Network Load**: ~18 KB/second at 4ms cycle