# TUSAŞ HGU - TIA Portal Hardware Configuration Guide

## 🔧 Hardware Configuration Settings

### PROFINET Network: 192.168.100.0/24

| Device | IP Address | I/O Start Address | Description |
|--------|------------|------------------|-------------|
| S7-1500 CPU | 192.168.100.10 | - | Main PLC |
| G120C Motor 1 | 192.168.100.11 | I256/Q256 | Motor-Pump #1 |
| G120C Motor 2 | 192.168.100.12 | I260/Q260 | Motor-Pump #2 |
| G120C Motor 3 | 192.168.100.13 | I264/Q264 | Motor-Pump #3 |
| G120C Motor 4 | 192.168.100.14 | I268/Q268 | Motor-Pump #4 |
| G120C Motor 5 | 192.168.100.15 | I272/Q272 | Motor-Pump #5 |
| G120C Motor 6 | 192.168.100.16 | I276/Q276 | Motor-Pump #6 |

## 📋 Detailed I/O Mapping

### Motor 1 (G120C_1) - IP: 192.168.100.11
```
Input Address Range: IW256 - IW259
├── IW256: ZSW1 (Status Word 1)
└── IW258: NIST_A (Actual Speed Value)

Output Address Range: QW256 - QW259  
├── QW256: STW1 (Control Word 1)
└── QW258: NSOLL_A (Speed Setpoint)
```

### Motor 2 (G120C_2) - IP: 192.168.100.12
```
Input Address Range: IW260 - IW263
├── IW260: ZSW1 (Status Word 1)
└── IW262: NIST_A (Actual Speed Value)

Output Address Range: QW260 - QW263
├── QW260: STW1 (Control Word 1)
└── QW262: NSOLL_A (Speed Setpoint)
```

### Motor 3 (G120C_3) - IP: 192.168.100.13
```
Input Address Range: IW264 - IW267
├── IW264: ZSW1 (Status Word 1)
└── IW266: NIST_A (Actual Speed Value)

Output Address Range: QW264 - QW267
├── QW264: STW1 (Control Word 1)
└── QW266: NSOLL_A (Speed Setpoint)
```

### Motor 4 (G120C_4) - IP: 192.168.100.14
```
Input Address Range: IW268 - IW271
├── IW268: ZSW1 (Status Word 1)
└── IW270: NIST_A (Actual Speed Value)

Output Address Range: QW268 - QW271
├── QW268: STW1 (Control Word 1)
└── QW270: NSOLL_A (Speed Setpoint)
```

### Motor 5 (G120C_5) - IP: 192.168.100.15
```
Input Address Range: IW272 - IW275
├── IW272: ZSW1 (Status Word 1)
└── IW274: NIST_A (Actual Speed Value)

Output Address Range: QW272 - QW275
├── QW272: STW1 (Control Word 1)
└── QW274: NSOLL_A (Speed Setpoint)
```

### Motor 6 (G120C_6) - IP: 192.168.100.16
```
Input Address Range: IW276 - IW279
├── IW276: ZSW1 (Status Word 1)
└── IW278: NIST_A (Actual Speed Value)

Output Address Range: QW276 - QW279
├── QW276: STW1 (Control Word 1)
└── QW278: NSOLL_A (Speed Setpoint)
```

## ⚙️ TIA Portal Configuration Steps

### 1. Add PROFINET Devices
```
1. Hardware Configuration → Add Device
2. Select: SINAMICS G120C
3. Configure PROFINET Interface:
   - IP Address: As per table above
   - Subnet: 255.255.255.0
   - Gateway: 192.168.100.1
```

### 2. Configure Telegram Type
```
Device Properties → PROFINET Interface:
├── Telegram Type: Standard Telegram 1 (PROFIdrive)
├── Input Words: 2 (Status Word + Actual Value)
└── Output Words: 2 (Control Word + Setpoint)
```

### 3. Set I/O Addresses
```
For each G120C device:
├── Input start address: As per table (I256, I260, etc.)
├── Output start address: As per table (Q256, Q260, etc.)
└── Address allocation: Automatic
```

### 4. PROFINET Network Settings
```
PROFINET Network Configuration:
├── Network Name: "HGU_PROFINET"
├── Update Time: 1ms (for real-time performance)
├── Topology: Line topology
└── Cable: Industrial Ethernet Cat5e/Cat6
```

## 🎯 Code Integration

### Data Block Sync in FB_HGU_Motor_Control_Simple:
```scl
// I/O → Data Block Sync (Reading from drives)
"DB_HGU_Motors".MOTOR_1.ZSW1 := IW256;
"DB_HGU_Motors".MOTOR_1.NIST_A := WORD_TO_INT(IW258);
// ... for all 6 motors

// Data Block → I/O Sync (Writing to drives)  
QW256 := "DB_HGU_Motors".MOTOR_1.STW1;
QW258 := INT_TO_WORD("DB_HGU_Motors".MOTOR_1.NSOLL_A);
// ... for all 6 motors
```

## 🔍 Diagnostic Information

### PROFINET Diagnostics
```
Monitor these in TIA Portal Online:
├── PROFINET Status: Green = Communication OK
├── Device Status: All devices "Run"
├── I/O Status: Input/Output data valid
└── Network Load: <50% for optimal performance
```

### Motor Status Monitoring
```
Watch Table Variables:
├── "DB_HGU_Motors".MOTOR_1.ZSW1 → Raw status word
├── "DB_HGU_Motors".MOTOR_1.NIST_A → Raw actual speed
├── "DB_HGU_Execution".MOTOR_1_STATUS_EXECUTION → Processed status
└── "DB_HGU_Execution".MOTOR_1_RPM_EXECUTION → Processed RPM
```

## 🚨 Troubleshooting

### Common Issues:
1. **Communication Loss**: Check IP addresses and network cables
2. **Address Conflicts**: Verify I/O start addresses don't overlap
3. **Telegram Mismatch**: Ensure G120C is configured for Standard Telegram 1
4. **Update Time**: For critical applications, use 1ms update time

### Debug Variables:
```
Online Monitoring:
├── IWx → Raw input from drive (should change when motor runs)
├── QWx → Raw output to drive (should reflect control commands)
├── "DB_HGU_Motors".MOTOR_x.ZSW1.%X1 → Ready to operate bit
└── "DB_HGU_Motors".MOTOR_x.ZSW1.%X3 → Fault present bit
```

---
**Generated**: 2025-01-14  
**Version**: 1.0  
**For**: TUSAŞ HGU Motor Control System