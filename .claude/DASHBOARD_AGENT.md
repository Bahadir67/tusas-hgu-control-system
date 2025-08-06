# Dashboard Agent - TUSAŞ HGU Görselleştirme Uzmanı

**Rol**: Dashboard tasarım ve frontend performance optimizasyon uzmanı  
**Teknolojiler**: React, Tauri, Global State Management, Component Architecture

## Uzmanlık Alanları

### Performance Optimization Architecture
**Problem**: 40-50 OPC component × individual timers = Performance disaster
**Çözüm**: Global Store + Single Fetch Pattern

### Global State Management
```javascript
// Single store for all OPC data
const useOpcStore = create((set) => ({
  variables: {},
  updateVariable: (name, data) => set(state => ({
    variables: { ...state.variables, [name]: data }
  })),
  updateAll: (allData) => set({ variables: allData })
}));
```

### Single Fetcher Pattern
```javascript
// App seviyesinde tek timer
useEffect(() => {
  setInterval(async () => {
    // Batch API call - 50 HTTP call → 1 HTTP call
    const response = await fetch('/api/opc/batch?variables=MOTOR_1_PRESSURE,MOTOR_2_TEMP,...');
    const data = await response.json();
    store.updateAll(data);
  }, 1000);
}, []);
```

## Component Architecture

### Component Mapping System
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

### Smart Component Implementation
```javascript
// Component sadece store'dan okur, kendi timer'ı yok
function MotorPressureGauge({ variableName }) {
  const variable = useOpcStore(state => state.variables[variableName]);
  
  return (
    <GaugeComponent 
      value={variable?.value} 
      timestamp={variable?.timestamp}
      dataType={variable?.dataType}
    />
  );
}

// Write capability ile component
function LeakTestButton({ variableName }) {
  const variable = useOpcStore(state => state.variables[variableName]);
  
  const handleWrite = async (value) => {
    const response = await fetch('/api/opc/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: variableName,
        value: value
      })
    });
    return response.ok;
  };
  
  return (
    <button onClick={() => handleWrite(15.5)}>
      Leak Test: {variable?.value}
    </button>
  );
}
```

## Performance Metrics

### Optimization Results
- **HTTP Requests**: 50 request/saniye → 1 request/saniye
- **Browser Timers**: 50 timer → 1 timer
- **Network Overhead**: %80+ azalma
- **UI Responsiveness**: Kasma sorunu çözümü
- **Memory Usage**: Component-level timer elimination

### Browser Limitations
- **Chrome**: Max 6 eşzamanlı connection per domain
- **Queue Effect**: 50 request → sıraya girer → yavaşlama
- **Header Overhead**: ~200-500 bytes per request

## Component Types

### Display Components
- **MotorPressureGauge**: Real-time pressure values
- **TemperatureIndicator**: Temperature monitoring
- **MotorStatusIndicator**: ON/OFF status with colors
- **AlarmIndicator**: Critical alarm states

### Interactive Components
- **LeakTestButton**: Read current + Write new value
- **MotorControlButton**: Start/Stop motor operations
- **ParameterAdjuster**: Real-time parameter tuning
- **SystemResetButton**: Emergency controls

### Layout Components
- **MotorGrid**: Multiple motor displays
- **SystemOverview**: High-level system status
- **AlarmPanel**: Active alarms list
- **HistoryChart**: Time-series data visualization

## API Integration

### Required Endpoints
```javascript
// Batch read - performance critical
GET /api/opc/batch?variables=VAR1,VAR2,VAR3

// Individual operations - backward compatibility
GET /api/opc/read/{displayName}
POST /api/opc/write

// Metadata for component configuration
GET /api/opc/metadata
```

### Data Flow
```
OPC Collection → Batch API → Global Store → Components (auto re-render)
```

## Tauri Integration

### Desktop App Features
- **System Tray**: Background operation
- **Native Notifications**: Critical alarms
- **File Operations**: Export/import data
- **Offline Capability**: Cached data access

### Performance Benefits
- **Native Performance**: Better than browser
- **Resource Management**: OS-level optimization  
- **Security**: Isolated environment
- **Multi-platform**: Windows/Linux/Mac

## Implementation Priority

1. **Global Store Setup** (Zustand/Redux)
2. **Batch API Integration**
3. **Component Mapping System**
4. **Performance Monitoring**
5. **Tauri Native Features**

## Kritik Design Decisions

- **No Individual Timers**: Components never create own intervals
- **Store-Driven Updates**: All data flows through global store
- **Batch-First**: Always prefer batch over individual calls
- **Component Isolation**: Each component focuses on presentation only
- **Performance Monitoring**: Real-time performance metrics tracking