# CAN Valve & Flowmeter Protocol Specification

## Network Topology
```
S7-1500 PLC ←→ Ethernet ←→ CAN-Ethernet Converter ←→ CAN Bus
     ↓                           ↓
TCP/IP Sockets              192.168.100.21
     ↓                           ↓
Port 40001: Valve Commands      Port 40002: Flowmeter Data
```

## TCP/IP Endpoints
- **192.168.100.21:40001** - Valve commands & status (bidirectional)
- **192.168.100.21:40002** - Flowmeter sensors (receive only, CANOPEN)

---

## Valve Protocol (Port 40001)

### **TX Frames (PLC → Valves)**

#### **Frame 1: Pump1-4 Commands**
```
Byte 0: DLC = 8
Byte 1-4: CAN Frame ID
Byte 5-6: Pump1 Command (0-10000) - 2 bytes Integer
Byte 7-8: Pump2 Command (0-10000) - 2 bytes Integer  
Byte 9-10: Pump3 Command (0-10000) - 2 bytes Integer
Byte 11-12: Pump4 Command (0-10000) - 2 bytes Integer
```

#### **Frame 2: Pump5-7 Commands + Bypass Control**
```
Byte 0: DLC = 8
Byte 1-4: CAN Frame ID
Byte 5-6: Pump5 Command (0-10000) - 2 bytes Integer
Byte 7-8: Pump6 Command (0-10000) - 2 bytes Integer
Byte 9-10: Pump7 Command (0-10000) - 2 bytes Integer
Byte 11-12: Bypass Control Bits
  Bit 0: Pump1 Bypass ON/OFF
  Bit 1: Pump2 Bypass ON/OFF
  Bit 2: Pump3 Bypass ON/OFF
  Bit 3: Pump4 Bypass ON/OFF
  Bit 4: Pump5 Bypass ON/OFF
  Bit 5: Pump6 Bypass ON/OFF
  Bit 6: Pump7 Bypass ON/OFF
  Bit 7-15: Reserved
```

### **RX Frames (Valves → PLC)**

#### **Frame 1: Proportional Valve Current Values**
```
Byte 0: DLC = 8
Byte 1-4: CAN Frame ID
Byte 5-6: Pump1 Valve Current (mA) - 2 bytes Integer
Byte 7-8: Pump2 Valve Current (mA) - 2 bytes Integer
Byte 9-10: Pump3 Valve Current (mA) - 2 bytes Integer
Byte 11-12: Pump4 Valve Current (mA) - 2 bytes Integer
```

#### **Frame 2: Pump5-7 Current + Bypass Status**
```
Byte 0: DLC = 8
Byte 1-4: CAN Frame ID
Byte 5-6: Pump5 Valve Current (mA) - 2 bytes Integer
Byte 7-8: Pump6 Valve Current (mA) - 2 bytes Integer
Byte 9-10: Pump7 Valve Current (mA) - 2 bytes Integer
Byte 11-12: Bypass Status (2-bit per valve)
  Bit 0-1: Pump1 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 2-3: Pump2 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 4-5: Pump3 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 6-7: Pump4 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 8-9: Pump5 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 10-11: Pump6 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 12-13: Pump7 Bypass (00=Normal, 01=Short, 10=Open, 11=Overcurrent)
  Bit 14-15: Reserved
```

### **Valve Watchdog System**
- **TX Timing**: 250ms maximum interval (PLC must send commands)
- **RX Timeout**: 250ms maximum (valve status expected)
- **Failsafe Action**: 
  - All bypass valves → OFF (safe position)
  - All proportional valve currents → 0 mA
- **Error Flag**: CAN_VALVE_COMMUNICATION_ERROR

---

## Flowmeter Protocol (Port 40002)

### **CANOPEN Standard Frames**
```
Each flowmeter sends:
Byte 0: DLC = 8
Byte 1-4: CANOPEN Frame ID (contains NodeID)
Byte 5-12: Flow data (8 bytes payload)
```

### **Timing Requirements**
- **TX Frequency**: 100ms (each flowmeter must send)
- **Timeout Detection**: 120ms threshold (>100ms = error)
- **Error Action**: Individual flowmeter error flag

---

## Watchdog Algorithm Implementation

### **Timer Array System**
```scl
// 16-element array (14 flowmeters + 2 valve frames)
Watchdog_Counters : Array[1..16] of Int;

// Self-triggering 10ms timer
Watchdog_Timer : TON;
Watchdog_Timer(IN := NOT Watchdog_Timer.Q, PT := T#10ms);

// Increment all counters every 10ms
IF Watchdog_Timer.Q THEN
    FOR i := 1 TO 16 DO
        Watchdog_Counters[i] := Watchdog_Counters[i] + 1;
    END_FOR;
END_IF;

// Reset counter when frame received
// For flowmeter NodeID X:
Watchdog_Counters[X] := 0;

// For valve frames:
Watchdog_Counters[15] := 0;  // Valve Frame 1
Watchdog_Counters[16] := 0;  // Valve Frame 2

// Error detection
FOR i := 1 TO 14 DO
    IF Watchdog_Counters[i] > 12 THEN  // 120ms exceeded
        Flowmeter_Error[i] := TRUE;
    END_IF;
END_FOR;

FOR i := 15 TO 16 DO
    IF Watchdog_Counters[i] > 25 THEN  // 250ms exceeded
        Valve_Communication_Error := TRUE;
    END_IF;
END_FOR;
```

### **Error Message Generation**
```scl
// Flowmeter error messages
FOR i := 1 TO 14 DO
    IF Flowmeter_Error[i] THEN
        Error_Message := CONCAT('Flowmeter ', INT_TO_STRING(i), ' not responding');
    END_IF;
END_FOR;

// Valve error messages
IF Valve_Communication_Error THEN
    Error_Message := 'Valve CAN communication timeout';
    // Execute failsafe actions
    Execute_Valve_Failsafe();
END_IF;
```

---

## Data Structures

### **Command Variables**
```scl
// Proportional valve commands (0-10000)
PUMP_VALVE_CMD : Array[1..7] of Int;

// Bypass valve commands (Boolean)
PUMP_BYPASS_CMD : Array[1..7] of Bool;
```

### **Status Variables**
```scl
// Proportional valve current feedback (mA)
PUMP_VALVE_CURRENT : Array[1..7] of Int;

// Bypass valve status (0-3 encoding)
PUMP_BYPASS_STATUS : Array[1..7] of USInt;

// Flowmeter values (CANOPEN)
FLOWMETER_VALUES : Array[1..14] of Real;
```

### **Timing & Error Variables**
```scl
// Watchdog system
Watchdog_Counters : Array[1..16] of Int;
Flowmeter_Error : Array[1..14] of Bool;
Valve_Communication_Error : Bool;

// Communication statistics
Valve_TX_Count : UDInt;
Valve_RX_Count : UDInt;
Flowmeter_RX_Count : Array[1..14] of UDInt;
```