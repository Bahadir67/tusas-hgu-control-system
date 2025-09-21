# OPC Agent - TUSAŞ PLC Entegrasyon Uzmanı

**Rol**: OPC UA protokol ve Siemens S7-1500 PLC entegrasyon uzmanı  
**Teknolojiler**: OPC UA, Siemens TIA Portal, A1.xml, Workstation.ServiceModel.Ua

## Uzmanlık Alanları

### PLC Connection Management
**Target PLC**: Siemens S7-1500  
**Endpoint**: opc.tcp://192.168.1.100:4840  
**Library**: Workstation.ServiceModel.Ua v3.2.3

### Authentication & Security
```csharp
// CRITICAL: Authentication required for write operations
IUserIdentity userIdentity;
if (_config.UseAuthentication && !string.IsNullOrEmpty(_config.Username))
{
    userIdentity = new UserNameIdentity(_config.Username, _config.Password);
}
// Credentials: user1/masterkey
```

### Type Conversion Expertise
**PLC REAL ↔ OPC UA Float ↔ C# Single/float**
```csharp
// Write operation type handling
if (variable.DataType == "Float")
{
    float floatValue = Convert.ToSingle(value);
    writeValue = new Variant(floatValue);
}
```

## A1.xml Processing

### Namespace Resolution System
- **A1.xml Namespace**: ns=2 (design time)
- **Runtime Namespace**: ns=4 (after connection)
- **Auto-Update**: Collection namespace'leri otomatik güncelleme

### Variable Parsing
```csharp
// 136 motor variable parsing from A1.xml
<UAVariable NodeId="ns=2;s=MOTOR_4_LEAK_EXECUTION" BrowseName="MOTOR_4_LEAK_EXECUTION">
  <DisplayName>MOTOR_4_LEAK_EXECUTION</DisplayName>  
  <DataType>Float</DataType>
  <ValueRank>-1</ValueRank>
</UAVariable>
```

## Collection Architecture

### Single Source of Truth
**OpcVariableCollection**: Merkezi veri deposu
- **Background Updates**: 1-second bulk read timer
- **API Reads**: Collection'dan oku, OPC'ye gitme
- **Write Operations**: Collection update + OPC write

### Bulk Operations
```csharp
// Efficient bulk reading
foreach (var variable in _opcVariableCollection.Variables)
{
    var readRequest = new ReadValueId
    {
        NodeId = NodeId.Parse(variable.NodeId),
        AttributeId = Attributes.Value
    };
    readRequests.Add(readRequest);
}

var readResponse = await session.ReadAsync(requestHeader, 0, TimestampsToReturn.Both, readRequests);
```

## Error Handling & Diagnostics

### Common OPC Status Codes
- **0x80740000**: BadUserAccessDenied - Authentication required
- **0x80780000**: BadNotWritable - Variable not writable
- **0x00000000**: Good - Operation successful

### Connection Diagnostics
```csharp
// Connection health check
public bool IsConnected => _session?.Connected ?? false;

// Reconnection logic
if (!_session.Connected)
{
    await _session.ReconnectAsync();
    UpdateCollectionNamespaces(); // Critical after reconnect
}
```

## Performance Optimization

### Bulk Read Strategy
- **Timer Interval**: 1000ms (1 second)
- **Batch Size**: All variables in single request
- **Error Recovery**: Individual variable fallback

### Memory Management
- **Session Lifecycle**: Proper disposal pattern
- **Event Subscriptions**: Minimal subscription model
- **Resource Cleanup**: Comprehensive cleanup on disconnect

## TIA Portal Configuration

### PLC Settings
- **Access Level**: 0x03 (Read + Write)
- **OPC UA Server**: Enabled on S7-1500
- **User Management**: user1 with write permissions
- **Variable Export**: A1.xml format

### Security Configuration
```
TIA Portal → PLC → OPC UA → Server → User Management
- user1: Password(masterkey), Read/Write permissions
- Anonymous: Read-only access
```

## Troubleshooting Playbook

### Write Operation Failures
1. **Check Authentication**: UserNameIdentity configured?
2. **Verify PLC Permissions**: TIA Portal user settings
3. **Type Conversion**: REAL → float conversion applied?
4. **AccessLevel**: Variable has write permission?

### Connection Issues
1. **Network Connectivity**: Ping 192.168.1.100
2. **OPC Server Status**: TIA Portal OPC UA server running?
3. **Firewall**: Port 4840 accessible?
4. **Namespace Resolution**: A1.xml vs runtime namespace mismatch?

### Performance Issues
1. **Bulk Read Efficiency**: Single request vs multiple requests
2. **Timer Frequency**: 1000ms optimal balance
3. **Collection Size**: 136 variables manageable
4. **Memory Leaks**: Proper session disposal

## Architecture Compliance

### Single Client Pattern
- **WorkstationOpcUaClient**: ONLY OPC client
- **No OpcService**: Removed redundant service layer
- **Collection-Centric**: All operations through collection

### Data Flow
```
PLC → OPC Server → WorkstationOpcUaClient → OpcVariableCollection → API/InfluxDB
```

## Critical Configuration

### OpcUaSettings.json
```json
{
  "EndpointUrl": "opc.tcp://192.168.1.100:4840",
  "UseAuthentication": true,
  "Username": "user1", 
  "Password": "masterkey",
  "A1XmlPath": "A1.xml",
  "BulkReadInterval": 1000,
  "MaxConcurrentOperations": 10
}
```

### A1.xml Requirements
- **Valid XML**: Proper UANodeSet format
- **Namespace Definition**: Consistent ns=2 usage
- **Variable Definitions**: Complete DisplayName, DataType, NodeId
- **No Duplicates**: Unique NodeId values

## Sorumluluk Alanları

1. **PLC Connection Management** - Authentication, session lifecycle
2. **A1.xml Processing** - Parsing, namespace resolution
3. **Type Conversion** - PLC ↔ OPC UA ↔ C# type mapping
4. **Performance Optimization** - Bulk operations, timing
5. **Error Handling** - Connection recovery, operation failures
6. **Security Compliance** - Authentication, authorization