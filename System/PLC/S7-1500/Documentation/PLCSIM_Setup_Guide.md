# SIMATIC S7-PLCSIM Advanced V7 Kurulum Rehberi
# TUSAŞ HGU Otomasyon Sistemi

Bu rehber, SIMATIC S7-PLCSIM Advanced V7'nin TUSAŞ HGU projesi için kurulumunu ve konfigürasyonunu açıklar.

## 1. PLCSIM Advanced Kurulumu

### Sistem Gereksinimleri
- Windows 10/11 (64-bit)
- RAM: Minimum 8 GB, Önerilen 16 GB
- Disk: 10 GB boş alan
- CPU: Intel i5 veya AMD Ryzen 5 equivalent
- TIA Portal V17/V18 kurulu olmalı

### Kurulum Adımları
1. **ISO Mount**: `SIMATIC_S7-PLCSIM_Advanced_V7.iso` dosyasını mount edin
2. **Setup Çalıştır**: `setup.exe` olarak yönetici yetkisiyle çalıştırın
3. **Lisans**: Trial lisans veya tam lisans seçin
4. **Install Path**: Varsayılan `C:\Program Files\Siemens\Automation\S7-PLCSIM Advanced` kabul edin
5. **Components**: Tüm bileşenleri seçin (Instance Manager, Runtime, Communications)

### Kurulum Sonrası Kontrol
```powershell
# PLCSIM servisleri kontrol et
Get-Service | Where-Object {$_.Name -like "*PLCSIM*"}

# PLCSIM Instance Manager başlat
& "C:\Program Files\Siemens\Automation\S7-PLCSIM Advanced\bin\Siemens.Simatic.Simulation.InstanceManager.exe"
```

## 2. Virtual PLC Instance Oluşturma

### Instance Manager'da Yeni Instance
1. **Instance Manager** açın
2. **Create new instance** tıklayın
3. **Instance Name**: `HGU_S7-1500`
4. **CPU Type**: CPU 1515-2 PN/DP seçin
5. **Interface**: PLCSIM Virtual Ethernet Adapter seçin
6. **IP Address**: `192.168.100.10` (HGU network planına uygun)
7. **Subnet Mask**: `255.255.255.0`

### Instance Başlatma
```cmd
# Instance'ı başlat
"C:\Program Files\Siemens\Automation\S7-PLCSIM Advanced\bin\Siemens.Simatic.Simulation.Runtime.exe" /instance:"HGU_S7-1500"
```

### IP Konfigürasyonu Doğrulama
```cmd
# Virtual PLC IP'sini ping et
ping 192.168.100.10

# Network bağlantısını kontrol et
netstat -an | findstr 192.168.100.10
```

## 3. TIA Portal Entegrasyonu

### Proje Açma ve Bağlantı
1. **TIA Portal** açın
2. **Hgu_controller.ap17** projesini açın
3. **Project tree**'de PLC'yi seçin
4. **Properties** → **Protection & Security** → **Connection mechanisms**
5. **Permit access with PUT/GET** aktif edin
6. **OPC UA Server** → **Enable OPC UA Server** işaretleyin

### OPC UA Server Konfigürasyonu
```xml
<!-- OPC UA Server Settings -->
<OPCUAServer>
    <Enabled>true</Enabled>
    <Port>4840</Port>
    <SecurityPolicy>None</SecurityPolicy>
    <Authentication>Anonymous</Authentication>
    <Endpoint>opc.tcp://192.168.100.10:4840</Endpoint>
</OPCUAServer>
```

### Connection Ayarları
1. **Online → Access point** → **PN/IE_1**
2. **Interface/Subnet**: PG/PC Interface seçin
3. **IP Address**: `192.168.100.10`
4. **Subnet mask**: `255.255.255.0`

## 4. SCL Kod Import İşlemi

### UDT Import
1. **Project tree** → **Data types** → **Add new data type**
2. **Name**: `UDT_HGU_SensorData`
3. **Language**: SCL seçin
4. Development klasöründeki `UDT_HGU_SensorData.scl` kodunu yapıştırın

### Data Block Oluşturma
1. **Project tree** → **Program blocks** → **Add new block**
2. **Type**: Data block (DB)
3. **Name**: `DB_HGU_SensorData`
4. **Type**: `UDT_HGU_SensorData` seçin

### Function Block Import
1. **Project tree** → **Program blocks** → **Add new block**
2. **Type**: Function block (FB)
3. **Name**: `FB_HGU_Controller`
4. **Language**: SCL seçin
5. Development klasöründeki `FB_HGU_Controller.scl` kodunu yapıştırın

### OB Main Güncelleme
1. **Main [OB1]** bloğunu açın
2. `CALL DB_HGU_SensorData` ekleyin
3. `CALL FB_HGU_Controller` ekleyin

## 5. OPC UA Node Mapping

### Server Interface Konfigürasyonu
1. **Device configuration** → **OPC UA Server**
2. **Server interfaces** → **Add interface**
3. **Name**: `HGU_Interface`
4. **Methods**: Read, Write, Subscribe aktif

### Variable Export
1. **PLC tags** → `DB_HGU_SensorData` seçin
2. **OPC UA** → **Add to server interface**
3. **Node name**: `HGU_Main.SensorData`
4. **Access level**: Read + Write
5. **Namespace**: `http://tusas.com/hgu/`

### Node ID Yapısı
```
ns=2;s="HGU_Main"."SensorData"."Pressure_Supply"
ns=2;s="HGU_Main"."SensorData"."Temperature_Oil_Tank"
ns=2;s="HGU_Main"."SensorData"."Pump_Status"
... (28 adet sensor node)
```

## 6. Compile ve Download

### Proje Derleme
1. **Project** → **Compile** → **All**
2. Hataları düzeltin
3. **Compile successful** mesajını bekleyin

### PLC'ye Download
1. **Online** → **Download to device**
2. **PG/PC interface** seçin
3. **Start search** → `192.168.100.10` bulunmalı
4. **Download** tıklayın
5. **Load** → **Finish**

### PLC'yi RUN Moduna Alma
1. **Online & diagnostics** açın
2. **Switch to RUN** tıklayın
3. **Confirm** → **OK**

## 7. OPC UA Test

### OPC UA Client Test
```python
# test_plcsim_opcua.py
import asyncio
from asyncua import Client

async def test_plcsim():
    client = Client("opc.tcp://192.168.100.10:4840")
    await client.connect()
    
    # HGU_Main node'unu bul
    root = client.get_root_node()
    hgu_node = await root.get_child(["0:Objects", "2:HGU_Main"])
    
    # Sensor verilerini oku
    sensor_data = await hgu_node.get_child(["2:SensorData"])
    pressure = await sensor_data.get_child(["2:Pressure_Supply"])
    
    value = await pressure.read_value()
    print(f"Pressure Supply: {value} bar")
    
    await client.disconnect()

asyncio.run(test_plcsim())
```

### C++ Client Konfigürasyonu
```json
{
  "opcua": {
    "endpoint": "opc.tcp://192.168.100.10:4840",
    "namespace": 2,
    "root_node": "HGU_Main.SensorData",
    "security_mode": "None"
  }
}
```

## 8. Troubleshooting

### Yaygın Sorunlar

**Problem**: PLCSIM instance başlamıyor
**Çözüm**: 
```cmd
# Windows servisleri kontrol et
net start "S7-PLCSIM Advanced Runtime"
net start "S7-PLCSIM Advanced Instance Manager"
```

**Problem**: OPC UA bağlantısı başarısız
**Çözüm**:
```cmd
# Port 4840 kontrol et
netstat -an | findstr 4840

# Windows Firewall exception ekle
netsh advfirewall firewall add rule name="PLCSIM OPC UA" dir=in action=allow protocol=TCP localport=4840
```

**Problem**: TIA Portal PLCSIM'i bulamıyor
**Çözüm**:
1. PG/PC Interface Settings açın
2. "S7-PLCSIM Advanced" adapter'ı ekleyin
3. IP range: 192.168.100.0/24 ekleyin

## 9. Performance Monitoring

### PLCSIM Performance
```powershell
# CPU kullanımı izle
Get-Counter "\Process(Siemens.Simatic.Simulation.Runtime)\% Processor Time"

# Memory kullanımı izle
Get-Counter "\Process(Siemens.Simatic.Simulation.Runtime)\Working Set"
```

### Network Monitoring
```cmd
# OPC UA trafiği izle
netstat -an | findstr 4840

# Packet monitoring
wireshark -i "PLCSIM Virtual Ethernet Adapter" -f "port 4840"
```

## 10. Production Deployment Hazırlığı

### Service Installation
```cmd
# PLCSIM'i Windows service olarak kaydet
sc create "TUSAS_HGU_PLCSIM" binPath="C:\Program Files\Siemens\Automation\S7-PLCSIM Advanced\bin\Siemens.Simatic.Simulation.Runtime.exe /instance:HGU_S7-1500 /service"
sc config "TUSAS_HGU_PLCSIM" start=auto
sc start "TUSAS_HGU_PLCSIM"
```

### Backup ve Recovery
```powershell
# Instance backup
Copy-Item "C:\ProgramData\Siemens\Automation\S7-PLCSIM Advanced\Instances\HGU_S7-1500" -Destination "C:\Backup\PLCSIM\" -Recurse

# Otomatik backup script
$BackupPath = "C:\Backup\PLCSIM\$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
Copy-Item "C:\ProgramData\Siemens\Automation\S7-PLCSIM Advanced\Instances\HGU_S7-1500" -Destination $BackupPath -Recurse
```

---

**Yazar**: TUSAŞ HGU Otomasyon Ekibi  
**Tarih**: 04.07.2025  
**Versiyon**: 1.0  
**İletişim**: bahadir@tusas.com