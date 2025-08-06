# TUSAŞ HGU Control System - Project Overview

## Purpose
Industrial automation system for TUSAŞ (Turkish Aerospace Industries) HGU (Hydraulic Ground Unit) control and monitoring. The system provides real-time OPC UA communication with Siemens S7-1500 PLC and data collection to InfluxDB.

## Project Structure
```
C:\projects\tusas_hgu\
├── tusas-hgu-modern\
│   ├── backend\
│   │   ├── TUSAS.HGU.API\          # RESTful Web API
│   │   ├── TUSAS.HGU.Core\         # Core services library  
│   │   └── TUSAS.HGU.Modern.sln    # Solution file
│   └── test-ui.html                # Basic test interface
└── .serena\                        # Serena configuration
```

## Key Features
- OPC UA client with authentication (user1/masterkey)
- Real-time data collection (1-second interval)
- InfluxDB integration for time-series data storage
- RESTful API endpoints for OPC operations
- A1.xml configuration parsing for 136 motor variables
- Automatic namespace resolution (ns=2 → ns=4)
- Single collection architecture for data management

## Target Hardware
- Siemens S7-1500 PLC at opc.tcp://192.168.100.10:4840
- InfluxDB v2.7.12 OSS at localhost:8086
- Windows development environment