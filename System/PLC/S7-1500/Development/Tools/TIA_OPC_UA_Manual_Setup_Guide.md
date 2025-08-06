# TIA Portal V17 - OPC UA Server Manual Setup Guide

## 🔧 Adım 1: OPC UA Server Aktifleştirme

1. **TIA Portal V17** açın
2. **Project View** → **Device configuration** → **PLC_1** seçin
3. **Properties** → **OPC UA** sekmesine git
4. **✅ Activate OPC UA server** işaretleyin
5. **Port:** 4840 (varsayılan)
6. **Security:** SignAndEncrypt
7. **Authentication:** Anonymous + Username/Password

## 📊 Adım 2: Server Interface Oluşturma

### **Yöntem A: XML Import (Önerilen)**
```
OPC UA → Server interfaces → Right-click → Import → Select "TIA_OPC_UA_Server_Interface.xml"
```

### **Yöntem B: Excel Import** 
```
OPC UA → Server interfaces → Right-click → Import from Excel → Select "TIA_OPC_UA_Import_Template.xlsx"
```

### **Yöntem C: Manuel Tanımlama**
```
OPC UA → Server interfaces → Right-click → Add interface → "HGU_Interface"
```

## 🎯 Adım 3: Manuel Variable Ekleme (Yöntem C için)

### **Motor 1 Variables:**
| Name | Data Type | Access Level | Address |
|------|-----------|--------------|---------|
| MOTOR_1_RPM_EXECUTION | Real | Read | "DB_HGU_Execution".MOTOR_1_RPM_EXECUTION |
| MOTOR_1_CURRENT_EXECUTION | Real | Read | "DB_HGU_Execution".MOTOR_1_CURRENT_EXECUTION |
| MOTOR_1_TARGET_EXECUTION | Real | ReadWrite | "DB_HGU_Execution".MOTOR_1_TARGET_EXECUTION |
| MOTOR_1_FLOW_EXECUTION | Real | Read | "DB_HGU_Execution".MOTOR_1_FLOW_EXECUTION |
| MOTOR_1_PRESSURE_EXECUTION | Real | Read | "DB_HGU_Execution".MOTOR_1_PRESSURE_EXECUTION |
| MOTOR_1_ENABLE_EXECUTION | Bool | ReadWrite | "DB_HGU_Execution".MOTOR_1_ENABLE_EXECUTION |
| MOTOR_1_STATUS_EXECUTION | USInt | Read | "DB_HGU_Execution".MOTOR_1_STATUS_EXECUTION |

### **System Variables:**
| Name | Data Type | Access Level | Address |
|------|-----------|--------------|---------|
| SYSTEM_STATUS_EXECUTION | USInt | Read | "DB_HGU_Execution".SYSTEM_STATUS_EXECUTION |
| SYSTEM_TOTAL_FLOW_EXECUTION | Real | Read | "DB_HGU_Execution".SYSTEM_TOTAL_FLOW_EXECUTION |
| SYSTEM_PRESSURE_EXECUTION | Real | Read | "DB_HGU_Execution".SYSTEM_PRESSURE_EXECUTION |
| SYSTEM_TANK_LEVEL_EXECUTION | Real | Read | "DB_HGU_Execution".SYSTEM_TANK_LEVEL_EXECUTION |
| SYSTEM_CONTROL_MODE_EXECUTION | USInt | ReadWrite | "DB_HGU_Execution".SYSTEM_CONTROL_MODE_EXECUTION |
| SYSTEM_EMERGENCY_STOP_EXECUTION | Bool | ReadWrite | "DB_HGU_Execution".SYSTEM_EMERGENCY_STOP_EXECUTION |

### **Cooling Variables:**
| Name | Data Type | Access Level | Address |
|------|-----------|--------------|---------|
| COOLING_SYSTEM_STATUS_EXECUTION | USInt | Read | "DB_HGU_Execution".COOLING_SYSTEM_STATUS_EXECUTION |
| COOLING_AQUA_SENSOR_EXECUTION | Real | Read | "DB_HGU_Execution".COOLING_AQUA_SENSOR_EXECUTION |
| COOLING_OIL_LEVEL_PERCENT_EXECUTION | Real | Read | "DB_HGU_Execution".COOLING_OIL_LEVEL_PERCENT_EXECUTION |
| COOLING_OIL_TEMPERATURE_EXECUTION | Real | Read | "DB_HGU_Execution".COOLING_OIL_TEMPERATURE_EXECUTION |

### **Alarm Variables:**
| Name | Data Type | Access Level | Address |
|------|-----------|--------------|---------|
| ALARM_HIGH_PRESSURE | Bool | Read | "DB_HGU_Execution".ALARM_HIGH_PRESSURE |
| ALARM_LOW_PRESSURE | Bool | Read | "DB_HGU_Execution".ALARM_LOW_PRESSURE |
| ALARM_HIGH_TEMPERATURE | Bool | Read | "DB_HGU_Execution".ALARM_HIGH_TEMPERATURE |
| ALARM_LOW_TANK_LEVEL | Bool | Read | "DB_HGU_Execution".ALARM_LOW_TANK_LEVEL |

## 🚀 Adım 4: Compile & Download

1. **Compile** PLC program
2. **Download** to PLC
3. **Start** PLC
4. **Test** OPC UA connection: `opc.tcp://192.168.100.10:4840`

## 🔍 Adım 5: Test & Verification

### **UaExpert Test:**
1. **Add Server** → `opc.tcp://192.168.100.10:4840`
2. **Browse** → HGU_Interface folder
3. **Verify** all variables are visible
4. **Test** read/write operations

### **Python Test:**
```python
from asyncua import Client
import asyncio

async def test_opcua():
    client = Client("opc.tcp://192.168.100.10:4840")
    await client.connect()
    
    # Read motor 1 RPM
    node = await client.get_node("ns=2;s=MOTOR_1_RPM_EXECUTION")
    rpm = await node.read_value()
    print(f"Motor 1 RPM: {rpm}")
    
    # Write motor 1 target
    target_node = await client.get_node("ns=2;s=MOTOR_1_TARGET_EXECUTION")
    await target_node.write_value(1500.0)
    
    await client.disconnect()

asyncio.run(test_opcua())
```

## 📋 Troubleshooting

### **Common Issues:**
1. **Port 4840 blocked** → Check Windows Firewall
2. **Authentication failed** → Verify username/password
3. **Variables not found** → Check DB_HGU_Execution exists
4. **Security error** → Set security mode to "None" for testing

### **Debug Steps:**
1. **TIA Portal** → Diagnostics → OPC UA Server status
2. **Windows Event Viewer** → Applications and Services Logs → Siemens
3. **UaExpert** → View → Log Window

## 🎯 Success Criteria

✅ **OPC UA Server active** on port 4840  
✅ **118 variables** visible in UaExpert  
✅ **Read operations** working for all RD variables  
✅ **Write operations** working for all RW variables  
✅ **Python client** can connect and read/write  
✅ **WPF Application** can connect and display data  

---
*TIA Portal V17 OPC UA Server Setup Complete*