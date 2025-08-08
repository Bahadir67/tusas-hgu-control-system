# TUSAŞ HGU OPC UA Architecture

## Single Collection Architecture

### Core Components
- **WorkstationOpcUaClient**: Tek OPC UA client (OpcService kaldırıldı)
- **OpcVariableCollection**: Tüm değişkenlerin single source of truth'u
- **A1XmlParser**: 136 motor değişkenini A1.xml'den yükler

### Data Flow

#### Initialization
1. A1.xml parse edilir → OpcVariableCollection oluşturulur (136 değişken)
2. OPC bağlantısı kurulur (user1/masterkey authentication)
3. Namespace resolution: A1.xml ns=2 → Runtime ns=4 otomatik güncellenir
4. Timer başlatılır (1 saniye interval)

#### Read Operations
- **Endpoint**: GET /api/opc/read/{displayName}
- **Flow**: DisplayName → Collection'dan variable.Value döner
- **OPC'ye gitmez**, her saniye güncellenen collection'dan okur
- Örnek: "MOTOR_1_TARGET_EXECUTION" → collection'daki son değer

#### Write Operations  
- **Endpoint**: POST /api/opc/write
- **Flow**: DisplayName → Collection'dan NodeId bulunur → OPC'ye yazılır
- Örnek: "MOTOR_1_TARGET_EXECUTION" → ns=4;i=5 → OPC Write

#### Bulk Update (Timer - 1 saniye)
1. Collection'daki tüm değişkenler için bulk read request
2. OPC'den gelen değerler collection'a güncellenir
3. InfluxDB'ye sensor verileri yazılır (opsiyonel)

### Key Features
- Single OPC client (no duplicate clients)
- No redundant NodeMetadata structure  
- Efficient reads from memory (not OPC)
- Type conversion: REAL→float, BOOL→bool
- JSON deserialization fix for API requests
- Authentication: user1/masterkey

### API Endpoints
- GET /api/opc/status - Connection status
- POST /api/opc/connect - Connect to OPC
- GET /api/opc/metadata - All variables info
- GET /api/opc/sensors/latest - Latest sensor data
- GET /api/opc/read/{displayName} - Read from collection
- POST /api/opc/write - Write to OPC