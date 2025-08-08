# Dashboard Architecture - Component-based OPC Data Binding

## Frontend Architecture Design

### Problem
Dashboard'da 40-50 OPC component render edilecek. Her component'in kendi timer'ı ile API çağrısı yapması performance sorununa neden olur:
- 50 component × 1 saniye interval = 50 HTTP request/saniye
- Browser connection limit (Chrome: 6 eşzamanlı)
- Network overhead artışı
- UI kasılması

### Solution: Global Data Store + Single Fetch Pattern

#### 1. Global Store Architecture
```javascript
// Redux/Zustand/Context ile global store
const useOpcStore = create((set) => ({
  variables: {},
  updateVariable: (name, data) => set(state => ({
    variables: { ...state.variables, [name]: data }
  })),
  updateAll: (allData) => set({ variables: allData })
}));
```

#### 2. Single Data Fetcher (App Level)
```javascript
// App.js - Tek timer tüm uygulama için
useEffect(() => {
  setInterval(async () => {
    // Batch API call - tüm gerekli değişkenler tek seferde
    const allVariables = await fetchAllDashboardVariables();
    store.updateAll(allVariables);
  }, 1000); // Sadece 1 timer, 1 HTTP request
}, []);
```

#### 3. Component Implementation
```javascript
// Component sadece store'dan okur, kendi timer'ı yok
function MotorPressureGauge({ variableName }) {
  const variable = useOpcStore(state => state.variables[variableName]);
  return <GaugeComponent value={variable?.value} timestamp={variable?.timestamp} />;
}

function LeakTestButton({ variableName }) {
  const { variable, writeValue } = useOpcVariable(variableName);
  return (
    <button onClick={() => writeValue(15.5)}>
      Leak Test: {variable?.value}
    </button>
  );
}
```

### API Requirements

#### Existing Endpoints
- **Read**: `GET /api/opc/read/{displayName}`
- **Write**: `POST /api/opc/write` - Body: `{ "displayName": "...", "value": "..." }`

#### New Batch Endpoint Needed
```
GET /api/opc/batch?variables=MOTOR_1_PRESSURE,MOTOR_2_TEMP,MOTOR_3_STATUS
Response: {
  "MOTOR_1_PRESSURE": { "value": 12.5, "timestamp": "...", "dataType": "..." },
  "MOTOR_2_TEMP": { "value": 45.2, "timestamp": "...", "dataType": "..." },
  "MOTOR_3_STATUS": { "value": true, "timestamp": "...", "dataType": "..." }
}
```

### Component Mapping Configuration
```json
{
  "MotorPressureGauge": {
    "readVariable": "MOTOR_4_PRESSURE_VALUE",
    "writeVariable": null,
    "updateInterval": 1000
  },
  "LeakTestButton": {
    "readVariable": "MOTOR_4_LEAK_EXECUTION", 
    "writeVariable": "MOTOR_4_LEAK_EXECUTION",
    "updateInterval": 500
  },
  "MotorStatusIndicator": {
    "readVariable": ["MOTOR_4_STATUS", "MOTOR_4_TEMPERATURE"],
    "writeVariable": null,
    "updateInterval": 2000
  }
}
```

### Performance Benefits
- **50 HTTP call/saniye → 1 HTTP call/saniye**
- **50 timer → 1 timer**
- **Network overhead azaltma**
- **Browser kasılma sorunu çözümü**
- **Centralized data management**

### Implementation Priority
1. Batch API endpoint ekle (/api/opc/batch)
2. Global store setup (Zustand/Redux)
3. Single fetcher implementation
4. Component mapping system
5. Individual component implementations

Bu yaklaşım approved - Frontend development bu pattern ile devam edecek.