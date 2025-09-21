# TUSAŞ HGU Otomasyon - Claude Code Konfigürasyonu

TUSAŞ HGU (Hydraulic Ground Unit) Control System projesi için SuperClaude agent konfigürasyonları.

## Proje Bilgileri

**Proje Adı**: TUSAŞ HGU Control System  
**Teknoloji**: C# .NET 9, OPC UA, InfluxDB v2.7.12, Tauri Frontend  
**Amaç**: Siemens S7-1500 PLC ile OPC UA protokolü üzerinden hydraulic ground unit otomasyonu  

## Agent Konfigürasyonları

@BACKEND_AGENT.md - Backend ve API geliştirme agent'ı  
@FRONTEND_AGENT.md - Tauri frontend geliştirme agent'ı  
@OPC_AGENT.md - OPC UA ve PLC entegrasyon uzmanı  
@DASHBOARD_AGENT.md - Dashboard ve visualisation uzmanı  

## Proje Durumu

**Tamamlanan Bileşenler:**
- ✅ OPC UA Client (WorkstationOpcUaClient) - Authentication: user1/masterkey
- ✅ InfluxDB v2.7.12 OSS entegrasyonu - Real-time data pipeline
- ✅ RESTful API (.NET 9) - Read/Write endpoints
- ✅ A1.xml parsing - 136 motor variables
- ✅ Namespace resolution system (A1.xml ns=2 → Runtime ns=4)
- ✅ Single collection architecture (OpcVariableCollection)
- ✅ Bulk read operations (1-second intervals)
- ✅ Git repository initialization
- ✅ Maintenance Management System - Complete CRUD operations
- ✅ Frontend Maintenance Components - History display, logging modal
- ✅ PLC System Coordinator - SYSTEM_ENABLE implementation
- ✅ Authentication System - JWT-based security

**Devam Eden Görevler:**
- 📋 Dashboard performance optimizations
- 📋 Tauri desktop app implementation
- 📋 System monitoring & alerting

## Kritik Teknik Detaylar

**OPC UA Configuration:**
- Server: opc.tcp://192.168.1.100:4840
- Authentication: UserNameIdentity(user1, masterkey)
- Type conversion: PLC REAL → C# Single/float
- Library: Workstation.ServiceModel.Ua v3.2.3

**Performance Optimizations:**
- Dashboard: Global store + single fetch pattern (50 HTTP/s → 1 HTTP/s)
- Component-based OPC data binding
- Batch API for multiple variable reads

**Database:**
- InfluxDB v2.7.12 OSS
- Bucket: hgu_data
- Organization: tusas
- Real-time data collection from OPC collection