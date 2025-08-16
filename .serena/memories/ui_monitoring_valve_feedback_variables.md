# UI Monitoring - Valve Feedback Variables

## 🎯 UI Monitoring Scope
**Purpose**: Real-time valve status monitoring from SCADA/HMI interface
**Data Source**: CAN feedback frames from Danfoss valve controllers
**Update Rate**: 250ms (CAN watchdog timing)

---

## 📊 1. Valve Current Feedback Monitoring

### **Proportional Valve Current Arrays**
```scl
// DB_HGU_Execution - UI accessible variables
PUMP_PROPORTIONAL_VALVE_CURRENT : Array[1..7] of Int;  // mA feedback (0-20000)
PUMP_PROPORTIONAL_VALVE_CURRENT_PERCENT : Array[1..7] of Real; // % feedback (0-100%)

// Current scaling for UI display
FOR i := 1 TO 7 DO
    PUMP_PROPORTIONAL_VALVE_CURRENT_PERCENT[i] := 
        (PUMP_PROPORTIONAL_VALVE_CURRENT[i] / 20000.0) * 100.0;
END_FOR;
```

### **Current Status Indicators**
```scl
// Current range validation for UI color coding
PUMP_VALVE_CURRENT_STATUS : Array[1..7] of USInt;
// 0 = Normal (4-20mA range)
// 1 = Under-range (<4mA, broken wire)  
// 2 = Over-range (>20mA, short circuit)
// 3 = Communication lost

FOR i := 1 TO 7 DO
    IF NOT CAN_VALVE_COMMUNICATION_OK THEN
        PUMP_VALVE_CURRENT_STATUS[i] := 3;     // Comm lost
    ELSIF PUMP_PROPORTIONAL_VALVE_CURRENT[i] < 4000 THEN
        PUMP_VALVE_CURRENT_STATUS[i] := 1;     // Under-range
    ELSIF PUMP_PROPORTIONAL_VALVE_CURRENT[i] > 20000 THEN
        PUMP_VALVE_CURRENT_STATUS[i] := 2;     // Over-range
    ELSE
        PUMP_VALVE_CURRENT_STATUS[i] := 0;     // Normal
    END_IF;
END_FOR;
```

---

## 🔘 2. Bypass Valve Status Monitoring

### **Bypass Valve Status Arrays**
```scl
// Raw 2-bit status from CAN frames
PUMP_BYPASS_VALVE_STATUS_RAW : Array[1..7] of USInt;   // 0-3 raw codes

// Decoded status for UI display
PUMP_BYPASS_VALVE_STATUS_TEXT : Array[1..7] of String[20];
PUMP_BYPASS_VALVE_ALARM : Array[1..7] of Bool;         // Error condition flag

// Status decoding logic
FOR i := 1 TO 7 DO
    CASE PUMP_BYPASS_VALVE_STATUS_RAW[i] OF
        0: 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i] := 'Normal';
            PUMP_BYPASS_VALVE_ALARM[i] := FALSE;
        1: 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i] := 'Short Circuit';
            PUMP_BYPASS_VALVE_ALARM[i] := TRUE;
        2: 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i] := 'Open Circuit';
            PUMP_BYPASS_VALVE_ALARM[i] := TRUE;
        3: 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i] := 'Overcurrent';
            PUMP_BYPASS_VALVE_ALARM[i] := TRUE;
    END_CASE;
END_FOR;
```

---

## 📈 3. Valve Performance Statistics

### **Real-time Performance Metrics**
```scl
// Valve response time monitoring
PUMP_VALVE_RESPONSE_TIME : Array[1..7] of Time;       // Command to feedback delay
PUMP_VALVE_POSITION_ERROR : Array[1..7] of Real;      // Command vs feedback error
PUMP_VALVE_STABILITY : Array[1..7] of Real;           // Current stability (%)

// Command vs feedback comparison
FOR i := 1 TO 7 DO
    // Position error calculation (0-100% scale)
    PUMP_VALVE_POSITION_ERROR[i] := 
        ABS(PUMP_PROPORTIONAL_VALVE_CMD_PERCENT[i] - PUMP_PROPORTIONAL_VALVE_CURRENT_PERCENT[i]);
    
    // Position error status for UI
    IF PUMP_VALVE_POSITION_ERROR[i] > 5.0 THEN
        PUMP_VALVE_POSITION_ERROR_ALARM[i] := TRUE;    // >5% error = alarm
    ELSE
        PUMP_VALVE_POSITION_ERROR_ALARM[i] := FALSE;
    END_IF;
END_FOR;
```

### **Historical Statistics**
```scl
// Valve usage statistics for maintenance
PUMP_VALVE_OPERATION_HOURS : Array[1..7] of Real;     // Total operation hours
PUMP_VALVE_CYCLE_COUNT : Array[1..7] of UDInt;        // Total open/close cycles
PUMP_VALVE_ERROR_COUNT : Array[1..7] of UInt;         // Total error occurrences
PUMP_VALVE_LAST_SERVICE_DATE : Array[1..7] of Date;   // Last maintenance date

// Maintenance due indicators
PUMP_VALVE_SERVICE_DUE : Array[1..7] of Bool;         // Service interval exceeded
```

---

## 🖥️ 4. UI Display Elements

### **Valve Status Dashboard Layout**
```
┌─────────────────────────────────────────────────────────────┐
│  VALVE MONITORING DASHBOARD                                 │
├─────────────────────────────────────────────────────────────┤
│  MOTOR 1  │ Prop: 65% │ Curr: 13.2mA │ Status: Normal     │
│           │ Bypass: OFF │ Status: Normal │ Error: None     │
├─────────────────────────────────────────────────────────────┤
│  MOTOR 2  │ Prop: 0%  │ Curr: 4.1mA  │ Status: Normal     │
│           │ Bypass: ON  │ Status: Normal │ Error: None     │
├─────────────────────────────────────────────────────────────┤
│  ...      │ ...        │ ...          │ ...               │
└─────────────────────────────────────────────────────────────┘
```

### **UI Color Coding System**
```scl
// Color status indicators for SCADA display
PUMP_VALVE_UI_COLOR : Array[1..7] of USInt;
// 0 = Green (Normal operation)
// 1 = Yellow (Warning - minor deviation)
// 2 = Orange (Alarm - requires attention) 
// 3 = Red (Critical - requires immediate action)
// 4 = Gray (Communication lost/disabled)

FOR i := 1 TO 7 DO
    IF NOT CAN_VALVE_COMMUNICATION_OK THEN
        PUMP_VALVE_UI_COLOR[i] := 4;           // Gray - comm lost
    ELSIF PUMP_BYPASS_VALVE_ALARM[i] THEN
        PUMP_VALVE_UI_COLOR[i] := 3;           // Red - bypass alarm
    ELSIF PUMP_VALVE_POSITION_ERROR_ALARM[i] THEN
        PUMP_VALVE_UI_COLOR[i] := 2;           // Orange - position error
    ELSIF PUMP_VALVE_CURRENT_STATUS[i] <> 0 THEN
        PUMP_VALVE_UI_COLOR[i] := 1;           // Yellow - current warning
    ELSE
        PUMP_VALVE_UI_COLOR[i] := 0;           // Green - normal
    END_IF;
END_FOR;
```

---

## 🔔 5. Alarm Integration

### **Valve-Specific Alarms**
```scl
// Individual valve alarms
ALARM_VALVE_COMM_TIMEOUT : Bool;               // 250ms watchdog timeout
ALARM_VALVE_CURRENT_FAULT : Array[1..7] of Bool; // Current range fault
ALARM_VALVE_POSITION_ERROR : Array[1..7] of Bool; // Position tracking error
ALARM_BYPASS_VALVE_FAULT : Array[1..7] of Bool;   // Bypass valve hardware fault

// System-level valve alarms
ALARM_VALVE_SYSTEM_FAULT : Bool;               // Any valve in fault state
ALARM_VALVE_MAINTENANCE_DUE : Bool;            // Any valve needs service
```

### **Alarm Message Generation**
```scl
// Dynamic alarm text generation
FOR i := 1 TO 7 DO
    IF ALARM_VALVE_CURRENT_FAULT[i] THEN
        ALARM_VALVE_MESSAGE[i] := CONCAT('Motor ', INT_TO_STRING(i), 
            ' proportional valve current fault: ', 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i]);
    END_IF;
    
    IF ALARM_BYPASS_VALVE_FAULT[i] THEN
        ALARM_BYPASS_MESSAGE[i] := CONCAT('Motor ', INT_TO_STRING(i), 
            ' bypass valve fault: ', 
            PUMP_BYPASS_VALVE_STATUS_TEXT[i]);
    END_IF;
END_FOR;
```

---

## 📊 6. OPC UA Variable Mapping

### **SCADA Interface Variables**
```scl
// Variables exposed to OPC UA for SCADA/HMI access
OPC_VALVE_MONITORING_GROUP:
{
    // Current feedback values
    "PUMP1_VALVE_CURRENT_MA" := PUMP_PROPORTIONAL_VALVE_CURRENT[1];
    "PUMP1_VALVE_CURRENT_PERCENT" := PUMP_PROPORTIONAL_VALVE_CURRENT_PERCENT[1];
    "PUMP1_VALVE_STATUS" := PUMP_VALVE_CURRENT_STATUS[1];
    
    // Bypass valve status
    "PUMP1_BYPASS_STATUS" := PUMP_BYPASS_VALVE_STATUS_TEXT[1];
    "PUMP1_BYPASS_ALARM" := PUMP_BYPASS_VALVE_ALARM[1];
    
    // Performance metrics
    "PUMP1_VALVE_POSITION_ERROR" := PUMP_VALVE_POSITION_ERROR[1];
    "PUMP1_VALVE_UI_COLOR" := PUMP_VALVE_UI_COLOR[1];
    
    // Statistics
    "PUMP1_VALVE_OPERATION_HOURS" := PUMP_VALVE_OPERATION_HOURS[1];
    "PUMP1_VALVE_CYCLE_COUNT" := PUMP_VALVE_CYCLE_COUNT[1];
    
    // Repeat for PUMP2-7...
}

// System-level variables
OPC_VALVE_SYSTEM_GROUP:
{
    "CAN_VALVE_COMMUNICATION_OK" := CAN_VALVE_COMMUNICATION_OK;
    "VALVE_SYSTEM_FAULT" := ALARM_VALVE_SYSTEM_FAULT;
    "VALVE_MAINTENANCE_DUE" := ALARM_VALVE_MAINTENANCE_DUE;
}
```

---

## 🎨 7. SCADA Display Recommendations

### **Trend Display Elements**
- **Real-time Current Trends**: 1-minute rolling graph per valve
- **Position Error Trends**: Command vs feedback tracking
- **Usage Statistics**: Daily/weekly/monthly operation hours
- **Alarm History**: Timestamped fault occurrences

### **Interactive Controls**
- **Manual Valve Test**: Test individual valve operation
- **Calibration Access**: Adjust current feedback scaling
- **Maintenance Reset**: Reset service interval counters
- **Alarm Acknowledgment**: Clear acknowledged alarms

### **Diagnostic Views**
- **CAN Frame Monitor**: Raw frame data inspection
- **Watchdog Status**: Real-time timeout counter display
- **Network Health**: Communication quality metrics