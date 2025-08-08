# TUSAŞ HGU Dashboard UI Design

## System Architecture
- **6x 75kW Electric Motors** working together to produce single flow output
- **System-Level Metrics**: Total pressure, flow rate, leak rate
- **Operator Controls**: Setpoint inputs with real-time feedback
- **Status Monitoring**: Ready(🔵), Running(🟢), Warning(🟡), Error(🔴)

## Component Layout

### 1. System Overview Panel (Top)
```
[System Total Pressure: 125.5 bar] [Total Flow Rate: 450 L/min] [Leak Rate: 0.02%]
```
- Variables: `SYSTEM_TOTAL_PRESSURE`, `SYSTEM_TOTAL_FLOW`, `SYSTEM_LEAK_RATE`
- Real-time display with trend indicators

### 2. Motor Control Grid (6x2 Layout)
```
[MOTOR 1] [MOTOR 2] [MOTOR 3]
[MOTOR 4] [MOTOR 5] [MOTOR 6]
```

Each motor panel includes:
- **Status Indicator**: Color-coded motor state
- **Pressure Gauge**: Current pressure with setpoint line
- **Setpoint Input**: Adjustable pressure target
- **Leak Test Button**: Manual leak test execution

### 3. Motor Panel Details
```javascript
Motor Panel Components:
- ReadOnly: MOTOR_X_PRESSURE_VALUE (real-time pressure)
- ReadOnly: MOTOR_X_STATUS (current state)  
- ReadWrite: MOTOR_X_PRESSURE_SETPOINT (operator input)
- ReadWrite: MOTOR_X_LEAK_EXECUTION (test trigger)
```

## Variable Mapping

### Read Variables (Display Only)
```
MOTOR_1_PRESSURE_VALUE → Pressure gauge
MOTOR_2_PRESSURE_VALUE → Pressure gauge
MOTOR_3_PRESSURE_VALUE → Pressure gauge
MOTOR_4_PRESSURE_VALUE → Pressure gauge
MOTOR_5_PRESSURE_VALUE → Pressure gauge
MOTOR_6_PRESSURE_VALUE → Pressure gauge

MOTOR_1_STATUS → Status indicator
MOTOR_2_STATUS → Status indicator
MOTOR_3_STATUS → Status indicator
MOTOR_4_STATUS → Status indicator
MOTOR_5_STATUS → Status indicator
MOTOR_6_STATUS → Status indicator

SYSTEM_TOTAL_PRESSURE → System overview
SYSTEM_TOTAL_FLOW → System overview
SYSTEM_LEAK_RATE → System overview
```

### Write Variables (Operator Controls)
```
MOTOR_1_PRESSURE_SETPOINT ← Setpoint input
MOTOR_2_PRESSURE_SETPOINT ← Setpoint input
MOTOR_3_PRESSURE_SETPOINT ← Setpoint input
MOTOR_4_PRESSURE_SETPOINT ← Setpoint input
MOTOR_5_PRESSURE_SETPOINT ← Setpoint input
MOTOR_6_PRESSURE_SETPOINT ← Setpoint input

MOTOR_1_LEAK_EXECUTION ← Test button
MOTOR_2_LEAK_EXECUTION ← Test button
MOTOR_3_LEAK_EXECUTION ← Test button
MOTOR_4_LEAK_EXECUTION ← Test button
MOTOR_5_LEAK_EXECUTION ← Test button
MOTOR_6_LEAK_EXECUTION ← Test button
```

## API Integration Strategy

### Batch API for Performance
```javascript
// Single API call for all variables
GET /api/opc/batch?variables=MOTOR_1_PRESSURE_VALUE,MOTOR_1_STATUS,MOTOR_2_PRESSURE_VALUE,...

Response:
{
  "MOTOR_1_PRESSURE_VALUE": { value: 125.5, timestamp: "2024-01-15T10:30:00Z", dataType: "Float" },
  "MOTOR_1_STATUS": { value: 1, timestamp: "2024-01-15T10:30:00Z", dataType: "Int32" },
  ...
}
```

### Global State Management
```javascript
// Zustand store for all OPC data
const useOpcStore = create((set) => ({
  variables: {},
  updateAll: (batchData) => set({ variables: batchData }),
  updateVariable: (name, data) => set(state => ({
    variables: { ...state.variables, [name]: data }
  }))
}));

// Single timer at App level
useEffect(() => {
  setInterval(async () => {
    const response = await fetch('/api/opc/batch?variables=' + allVariableNames.join(','));
    const data = await response.json();
    store.updateAll(data);
  }, 1000);
}, []);
```

## Component Architecture

### Smart Components
```javascript
// Motor panel component
function MotorPanel({ motorId }) {
  const pressureValue = useOpcStore(state => state.variables[`MOTOR_${motorId}_PRESSURE_VALUE`]);
  const motorStatus = useOpcStore(state => state.variables[`MOTOR_${motorId}_STATUS`]);
  
  const handleSetpointChange = async (newValue) => {
    await fetch('/api/opc/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: `MOTOR_${motorId}_PRESSURE_SETPOINT`,
        value: newValue
      })
    });
  };
  
  return (
    <div className="motor-panel">
      <StatusIndicator status={motorStatus?.value} />
      <PressureGauge value={pressureValue?.value} />
      <SetpointInput onSubmit={handleSetpointChange} />
      <LeakTestButton motorId={motorId} />
    </div>
  );
}
```

### Performance Optimization
- **50 HTTP requests/second → 1 HTTP request/second**
- **50 component timers → 1 global timer**
- **Batch API eliminates network congestion**
- **Global store prevents redundant re-renders**

## UI Design Principles
- **Industrial Theme**: Dark background, bright gauges
- **Real-time Updates**: 1-second refresh rate
- **Operator-Friendly**: Large controls, clear status indicators
- **Responsive Layout**: Adapts to different screen sizes
- **Error Handling**: Graceful degradation when OPC connection fails

## Next Steps
1. Tauri kurulumu ve proje yapısı
2. React components oluştur (MotorPanel, SystemOverview, etc.)
3. Batch API endpoint implement et
4. Global state management (Zustand) entegre et
5. Industrial UI styling ve responsive design