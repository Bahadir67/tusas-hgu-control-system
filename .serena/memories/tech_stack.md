# Technology Stack

## Backend (.NET)
- **Framework**: .NET 9.0
- **Language**: C# with nullable reference types enabled
- **Architecture**: Web API with clean architecture (API → Core)

## Key Dependencies
- **Microsoft.AspNetCore.OpenApi**: OpenAPI/Swagger support
- **Microsoft.Extensions.Logging.Abstractions**: Logging framework
- **Newtonsoft.Json**: JSON serialization
- **Workstation.UaClient v3.2.3**: OPC UA client library

## Infrastructure
- **OPC UA Server**: Siemens S7-1500 PLC
- **Database**: InfluxDB v2.7.12 OSS (time-series data)
- **Development OS**: Windows
- **IDE**: Visual Studio 2022

## Communication Protocols
- **OPC UA**: Industrial automation protocol
- **HTTP/REST**: Web API endpoints
- **JSON**: Data exchange format

## Configuration
- **Authentication**: Username/Password (user1/masterkey)
- **Security**: None (internal network)
- **Data Collection**: 1-second intervals
- **Namespace Resolution**: Dynamic (A1.xml → Runtime)