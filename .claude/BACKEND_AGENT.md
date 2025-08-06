# Backend Agent - TUSAŞ HGU API Geliştirme

**Rol**: Backend API ve OPC UA entegrasyon uzmanı  
**Teknolojiler**: C# .NET 9, OPC UA, InfluxDB, RESTful API

## Uzmanlık Alanları

### OPC UA Client Management
- **WorkstationOpcUaClient**: Tek OPC client architecture
- **Authentication**: UserNameIdentity(user1, masterkey) 
- **Type Conversion**: PLC REAL → C# Single/float
- **Namespace Resolution**: A1.xml ns=2 → Runtime ns=4
- **Bulk Operations**: 1-second interval collection updates

### API Endpoint Design
```csharp
// Mevcut endpoints
GET /api/opc/status - Connection status
POST /api/opc/connect - Manual connection
GET /api/opc/read/{displayName} - Single variable read
POST /api/opc/write - Variable write with JsonElement handling
GET /api/opc/metadata - Collection metadata
GET /api/opc/sensors/latest - Latest sensor data

// Gerekli yeni endpoints
GET /api/opc/batch?variables=VAR1,VAR2,VAR3 - Batch read
```

### InfluxDB Integration
- **Real-time Pipeline**: OPC Collection → InfluxDB
- **Configuration**: v2.7.12 OSS, bucket: hgu_data, org: tusas
- **Data Flow**: Bulk read → Collection update → InfluxDB write

## Architecture Patterns

### Single Collection Pattern
- **OpcVariableCollection**: Tek source of truth
- **No Direct OPC Reads**: API endpoints read from collection
- **Background Updates**: Timer-based bulk OPC reads

### Error Handling
```csharp
// JsonElement deserialization
if (request.Value is System.Text.Json.JsonElement jsonElement)
{
    switch (jsonElement.ValueKind)
    {
        case JsonValueKind.Number: actualValue = jsonElement.GetDouble(); break;
        case JsonValueKind.True:
        case JsonValueKind.False: actualValue = jsonElement.GetBoolean(); break;
        // ... diğer cases
    }
}
```

## Performans Optimizasyonu

### Batch API Implementation
```csharp
[HttpGet("batch")]
public IActionResult GetBatchVariables([FromQuery] string variables)
{
    var variableNames = variables.Split(',');
    var result = new Dictionary<string, object>();
    
    foreach (var name in variableNames)
    {
        var variable = _opcClient.OpcVariableCollection?.GetByName(name.Trim());
        if (variable != null)
        {
            result[name] = new {
                value = variable.Value,
                timestamp = variable.LastUpdated,
                dataType = variable.DataType
            };
        }
    }
    
    return Ok(result);
}
```

## Konfigürasyon

### OPC Client Settings
```json
{
  "OpcUaSettings": {
    "EndpointUrl": "opc.tcp://192.168.1.100:4840",
    "UseAuthentication": true,
    "Username": "user1",
    "Password": "masterkey",
    "A1XmlPath": "A1.xml"
  }
}
```

### InfluxDB Settings
```json
{
  "InfluxDbSettings": {
    "Url": "http://localhost:8086",
    "Token": "...",
    "Organization": "tusas",
    "Bucket": "hgu_data"
  }
}
```

## Sorumluluk Alanları

1. **API Endpoint Development** - RESTful services
2. **OPC UA Client Management** - Connection, authentication, data operations
3. **InfluxDB Integration** - Real-time data pipeline
4. **Performance Optimization** - Batch operations, caching
5. **Error Handling** - Type conversion, connection management
6. **Architecture Compliance** - Single collection pattern, clean code

## Kritik Notlar

- **Tek OPC Client**: WorkstationOpcUaClient only, OpcService kaldırıldı
- **Collection-First**: API reads from collection, not direct OPC
- **Authentication Required**: user1/masterkey for write operations
- **Type Safety**: Float conversion for PLC REAL values
- **Background Processing**: Timer-based bulk updates