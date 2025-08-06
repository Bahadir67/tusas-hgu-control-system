# TUSAŞ HGU Control System - TIA Portal Integration Guide

## 📋 Overview
This guide explains how to integrate the G120C PN motor control system with TIA Portal S7-1500 project.

## 🔧 Components Created

### 1. Data Types (UDT)
- **UDT_G120C_Telegram1.scl** - Standard Telegram 1 structure for G120C PN drives
- **UDT_HGU_Complete_System.scl** - Complete system structure 
- **UDT_HGU_System_Variables.scl** - System level variables
- **UDT_HGU_Motor_Pump.scl** - Standard motor-pump structure
- **UDT_HGU_Motor_Pump_Special.scl** - Special motor-pump structure (#7)

### 2. Data Blocks (DB)
- **DB_HGU_Motors.scl** - Motor control data with G120C Telegram 1 interfaces
- **DB_HGU_Execution.scl** - All execution variables synchronized with UI
- **DB_HGU_SensorData.scl** - Basic sensor data for OPC UA interface

### 3. Function Blocks (FB)
- **FB_HGU_Motor_Control_Simple.scl** - Simple motor control function block for 6x G120C PN drives
- **FB_HGU_LED_Control.scl** - LED control for status indication

### 4. Organization Blocks (OB)
- **OB1_Working_Example.scl** - Working example of how to call motor control from OB1

## 🚀 TIA Portal Integration Steps

### Step 1: Import Data Types
1. Open TIA Portal
2. Go to **Program blocks → Data types**
3. Right-click → **Import** → Select all `.scl` files from `Data_Types` folder
4. Compile all UDTs

### Step 2: Create Data Blocks
1. Go to **Program blocks → Data blocks**
2. Right-click → **Add new block**
3. Copy content from each `.scl` file in `Data_Blocks` folder
4. Compile all DBs

### Step 3: Import Function Block
1. Go to **Program blocks → Function blocks**
2. Right-click → **Add new block**
3. Copy content from `FB_HGU_Motor_Control_Simple.scl`
4. Compile the FB

### Step 3b: Add Instance Variable to OB1
1. Open **OB1 (Main)**
2. Go to **Interface** section
3. Add to **VAR** section:
   ```scl
   MotorControl : "FB_HGU_Motor_Control_Simple";
   ```

### Step 4: Hardware Configuration
1. Go to **Device configuration**
2. Add 6x G120C PN drives to PROFINET network
3. Configure each drive with IP addresses:
   - Motor 1: 192.168.100.11
   - Motor 2: 192.168.100.12
   - Motor 3: 192.168.100.13
   - Motor 4: 192.168.100.14
   - Motor 5: 192.168.100.15
   - Motor 6: 192.168.100.16

### Step 5: PROFINET Configuration
1. Select each G120C drive
2. Go to **Device configuration → PROFINET interface**
3. Enable **Standard telegram 1 (PROFIdrive)**
4. Configure I/O addresses:
   - Control Word (STW1): Output Word
   - Setpoint (NSOLL_A): Output Word
   - Status Word (ZSW1): Input Word
   - Actual Value (NIST_A): Input Word

### Step 6: Link Process Images
1. Go to **Device configuration → I/O addresses**
2. Link PROFINET inputs/outputs to data block variables:

```
Motor 1:
- Control Word: DB_HGU_Motors.MOTOR_1.STW1
- Setpoint: DB_HGU_Motors.MOTOR_1.NSOLL_A
- Status Word: DB_HGU_Motors.MOTOR_1.ZSW1
- Actual Value: DB_HGU_Motors.MOTOR_1.NIST_A

Motor 2:
- Control Word: DB_HGU_Motors.MOTOR_2.STW1
- Setpoint: DB_HGU_Motors.MOTOR_2.NSOLL_A
- Status Word: DB_HGU_Motors.MOTOR_2.ZSW1
- Actual Value: DB_HGU_Motors.MOTOR_2.NIST_A

[... same pattern for Motors 3-6]
```

### Step 7: Call Motor Control Block
1. Open **OB1 (Main)**
2. Add call to motor control function block:

```scl
// Call motor control function block with parameters
#MotorControl(
    Enable := TRUE,
    Reset := "I0.0",
    EmergencyStop := "I0.1",
    SystemEnable := TRUE
);

// Read outputs from function block instance
"Q0.0" := #MotorControl.Ready;
"Q0.1" := #MotorControl.Error;
"MW10" := #MotorControl.ActiveMotors;
"MD12" := #MotorControl.TotalFlow;
```

### Step 8: OPC UA Server Configuration
1. Go to **Technology → OPC UA**
2. Enable OPC UA server
3. Import **A1.xml** node set
4. Configure OPC UA variables mapping to `DB_HGU_Execution`

## 📊 Data Flow

```
UI (WPF) ←→ OPC UA ←→ DB_HGU_Execution ←→ OB_HGU_Motor_Control ←→ DB_HGU_Motors ←→ G120C Drives
```

## 🔧 Motor Control Logic

### Control Word Generation
- **STW1.0** (ON/OFF1): Motor enable AND NOT emergency stop
- **STW1.1** (OFF2): Always TRUE (no coast stop)
- **STW1.2** (OFF3): Always TRUE (no quick stop)
- **STW1.3** (Enable operation): Motor enable
- **STW1.4-6** (Ramp control): Always TRUE
- **STW1.7** (Fault acknowledge): Pulse for fault reset
- **STW1.10** (Control by PLC): Always TRUE
- **STW1.11** (Reversing): Always FALSE (forward only)

### Setpoint Scaling
- UI Target RPM → G120C Setpoint: `NSOLL_A = (Target_RPM * 16384) / 3000`
- G120C Actual → UI RPM: `Actual_RPM = (NIST_A * 3000) / 16384`

### Status Processing
- **Fault Present** (ZSW1.3) → STATUS_EXECUTION = 3 (Error)
- **Alarm Present** (ZSW1.7) → STATUS_EXECUTION = 3 (Error)
- **Operation Enabled** (ZSW1.2) + RPM > 50 → STATUS_EXECUTION = 2 (Running)
- **Ready to Operate** (ZSW1.1) → STATUS_EXECUTION = 1 (Ready)
- **Default** → STATUS_EXECUTION = 0 (Offline)

## 🛠️ Variables Mapping

### From UI to PLC
```
execution_variables.txt → DB_HGU_Execution → OB_HGU_Motor_Control → DB_HGU_Motors → G120C
```

### From PLC to UI
```
G120C → DB_HGU_Motors → OB_HGU_Motor_Control → DB_HGU_Execution → OPC UA → UI
```

## ⚠️ Safety Features

1. **Emergency Stop**: Immediately stops all motors
2. **Individual Enable**: Each motor can be enabled/disabled independently
3. **Fault Monitoring**: Automatic fault detection and status reporting
4. **System Interlocks**: System-level safety logic

## 📈 Performance

- **Cycle Time**: 100ms (configurable)
- **Response Time**: <200ms from UI command to motor response
- **Data Update Rate**: 10Hz (100ms cycle)

## 🔍 Troubleshooting

### Common Issues
1. **Motor not responding**: Check PROFINET connection and IP address
2. **Status always offline**: Verify hardware configuration and telegram settings
3. **Setpoint not working**: Check scaling factors and enable bits
4. **Faults not clearing**: Verify fault acknowledge logic

### Debug Variables
- `DB_HGU_Motors.PROFINET_MOTOR_X_OK` - Communication status
- `DB_HGU_Motors.MOTOR_X.ZSW1` - Raw status word
- `DB_HGU_Motors.MOTOR_X.STW1` - Raw control word

## 📝 Maintenance

### Regular Checks
1. Monitor communication status
2. Check motor runtime hours
3. Verify safety functions
4. Update maintenance counters

### Periodic Tasks
1. Backup PLC program
2. Update drive firmware
3. Check network performance
4. Verify safety systems

---

**Generated**: 2025-01-14  
**Version**: 1.0  
**Author**: TUSAŞ HGU Automation Team