# 🎯 Motors Page Implementation Summary

## Current Status
✅ SystemOverviewPanel - Interactive InfluxDB-style chart completed
🔄 Motors Page - Redesign ready to start

## Motors Page Design (Final Spec)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ 🎛️ Motors Overview                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │ M1  │ │ M2  │ │ M3  │ │ M4  │ │ M5  │ │ M6  │ │ M7  │   │ ← Compact cards
│ │ 🟢  │ │ 🟢  │ │ 🔴  │ │🟡   │ │ 🟢  │ │ 🟢  │ │ 🟢  │   │   (click to select)
│ │45bar│ │52bar│ │ OFF │ │48bar│ │40bar│ │50bar│ │47bar│   │
│ │15L/m│ │18L/m│ │  -  │ │16L/m│ │12L/m│ │17L/m│ │14L/m│   │
│ └─────┘ └─────┘ └─────┘ └──▼──┘ └─────┘ └─────┘ └─────┘   │
├─────────────────────────────────────────────────────────────┤
│ Motor 4 - Pump & Motor Details      ◄────────────────►      │
│                                                              │
│ ┌────────────────── PUMP DATA ──────────────────┐          │
│ │                                                │          │
│ │ Pressure    48.5 bar    Set: 50.0 [✏️]        │          │ ← Inline edit icon
│ │ Flow        16.2 L/min  Set: 18.0 [✏️]        │          │
│ │                                                │          │
│ │ Suction Filter: 🟢 Normal  Line Filter: 🟡 75%│          │ ← LED indicators
│ │ Valve Status:   🟢 Open    (Manual Control)   │          │ ← 🟢 Open / 🔴 Closed
│ │                                                │          │
│ │ Motor Enable: [ON] [OFF] ← Current: ON        │          │ ← Separate buttons
│ │                                                │          │
│ │ ┌─── Trends (Last 30min) ─── [☑️P ☑️F] ───┐  │          │ ← Metric toggles
│ │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │          │
│ │ │ ━━ Pressure  ━━ Flow                   │  │          │
│ │ └────────────────────────────────────────┘  │          │
│ └────────────────────────────────────────────────┘          │
│                         ● ○                                  │
└─────────────────────────────────────────────────────────────┘

Swipe RIGHT →

┌─────────────────────────────────────────────────────────────┐
│ Motor 4 - Pump & Motor Details      ◄────────────────►      │
│                                                              │
│ ┌────────────────── MOTOR DATA ──────────────────┐         │
│ │                                                 │         │
│ │ Current      12.5 A      Limit: 15.0 [✏️]      │         │ ← Inline edit icon
│ │ RPM          1450 rpm    Set: 1500 [✏️]        │         │
│ │ Temperature  45°C        Limit: 60 [✏️]        │         │
│ │                                                 │         │
│ │ Leak Test:   [Start] [Stop]    Status: ✓ OK   │         │
│ │ Motor Enable: [ON] [OFF] ← Current: ON         │         │ ← Same control
│ │                                                 │         │
│ │ ┌─ Trends (30min) ─ [☑️C ☑️R ☑️T] ──────────┐│         │ ← Toggle C/R/T
│ │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ││         │
│ │ │ ━━ Current  ━━ RPM  ━━ Temperature       ││         │
│ │ └──────────────────────────────────────────── ┘│         │
│ └─────────────────────────────────────────────────┘         │
│                         ○ ●                                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Implementation Details

### 1. MotorCard Component (Compact)
```typescript
interface MotorCardProps {
  motorId: number;
  status: 'active' | 'stopped' | 'warning';
  pressure: number;
  flow: number;
  isSelected: boolean;
  onClick: () => void;
}

// Display: Status icon (🟢/🔴/🟡) + Pressure + Flow
// Click → Updates selectedMotorId → Detail view changes
```

### 2. Filter LED Indicators (3-State)
```typescript
// OPC Variables:
// - MOTOR_X_SUCTION_FILTER_EXECUTION (0/1/2/3)
// - MOTOR_X_LINE_FILTER_EXECUTION (0/1/2/3)

// States:
// 0: ERROR (should not happen) - 🔴 Red
// 1: Normal - 🟢 Green
// 2: 75% Warning - 🟡 Yellow
// 3: 100% Error - 🔴 Red

const FilterLED = ({ status }: { status: number }) => {
  const getColor = () => {
    switch(status) {
      case 1: return '#00ff00'; // Green - Normal
      case 2: return '#ffaa00'; // Yellow - 75% Warning
      case 3: return '#ff0000'; // Red - 100% Error
      default: return '#666666'; // Gray - Unknown/Error
    }
  };
};
```

### 3. Valve Status LED (2-State)
```typescript
// OPC Variable: PUMP_1_MANUAL_VALVE_STATUS (USINT)
// 0: Closed (🔴 Red) - Yağ emişi yapılamıyor
// 1: Open/Normal (🟢 Green)

const ValveLED = ({ status }: { status: number }) => {
  const isOpen = status === 1;
  return (
    <div className="valve-led">
      <div
        className="led-indicator"
        style={{ backgroundColor: isOpen ? '#00ff00' : '#ff0000' }}
      />
      <span>{isOpen ? 'Open' : 'Closed'}</span>
    </div>
  );
};
```

### 4. Setpoint Edit Popup (Mini Modal 100x50px)
```typescript
// Trigger: Click ✏️ icon next to setpoint value
// Behavior:
// 1. User clicks ✏️
// 2. Mini popup opens with input + Apply button
// 3. User edits value → Click Apply
// 4. OPC write to PLC
// 5. OPC collection auto-updates (1-second interval)
// 6. Component re-renders with new value from OPC
// 7. User sees value changed = Verification PLC received it

const SetpointEditPopup = ({
  currentValue,
  onSave,
  onClose,
  unit,
  label
}: SetpointEditPopupProps) => {
  const [editValue, setEditValue] = useState(currentValue);

  const handleApply = async () => {
    await onSave(editValue); // OPC write
    onClose();
  };

  return (
    <div className="setpoint-popup">  {/* 100x50px */}
      <div className="popup-content">
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
        />
        <span>{unit}</span>
        <button onClick={handleApply}>Apply</button>
      </div>
    </div>
  );
};
```

### 5. Motor Enable Control (Separate Buttons)
```typescript
// OPC Variable: MOTOR_X_ENABLE_EXECUTION
// Write: 1 = ON, 0 = OFF

const MotorEnableControl = ({ motorId, currentStatus }: ControlProps) => {
  const [isEnabled, setIsEnabled] = useState(currentStatus);

  const handleEnable = async (enable: boolean) => {
    const value = enable ? 1 : 0;
    await opcApi.writeVariable(`MOTOR_${motorId}_ENABLE_EXECUTION`, value);
    // Wait for OPC collection update to verify
  };

  return (
    <div className="motor-enable-control">
      <span>Motor Enable:</span>
      <div className="button-group">
        <button
          className={isEnabled ? 'active on-button' : 'on-button'}
          onClick={() => handleEnable(true)}
        >
          ON
        </button>
        <button
          className={!isEnabled ? 'active off-button' : 'off-button'}
          onClick={() => handleEnable(false)}
        >
          OFF
        </button>
      </div>
      <span className="status-label">Current: {isEnabled ? 'ON' : 'OFF'}</span>
    </div>
  );
};
```

### 6. Combined Charts with Metric Toggles
```typescript
// Chart 1 (Pump): Pressure + Flow
// Chart 2 (Motor): Current + RPM + Temperature

const ChartWithToggles = ({ motorId, metrics }: ChartProps) => {
  const [visibleMetrics, setVisibleMetrics] = useState({
    pressure: true,
    flow: true,
    current: true,
    rpm: true,
    temperature: true
  });

  return (
    <div className="chart-container">
      {/* Checkbox toggles */}
      <div className="metric-toggles">
        <label>
          <input
            type="checkbox"
            checked={visibleMetrics.current}
            onChange={() => toggleMetric('current')}
          />
          Current (A)
        </label>
        {/* ... more toggles */}
      </div>

      {/* Recharts with conditional rendering */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          {visibleMetrics.current && (
            <>
              <YAxis yAxisId="current" stroke="#ff9800" />
              <Line yAxisId="current" dataKey="current" stroke="#ff9800" />
            </>
          )}
          {/* ... conditional rendering for other metrics */}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 7. RPM Normalization for Multi-Axis Chart
```typescript
// Problem: RPM (0-1500) vs Current (0-15A) vs Temp (0-60°C)
// Solution: Normalize RPM to 0-100 scale

const normalizeRPM = (rpm: number) => (rpm / 1500) * 100;

const chartData = influxData.map(point => ({
  ...point,
  rpmNormalized: normalizeRPM(point.rpm)
}));
```

### 8. Data Fetching (InfluxDB motor-series API)
```typescript
// Endpoint: POST /api/influx/motor-series
// Request:
{
  motors: [4],
  metrics: ['pressure', 'flow', 'current', 'rpm', 'temperature'],
  range: '30m',
  maxPoints: 180  // 30min / 10sec = 180 points
}

// Response:
{
  MotorSeries: [
    { timestamp, motorId, pressure, flow, current, rpm, temperature }
  ]
}

// Refresh interval: 30 seconds
```

### 9. Swipeable Container
```typescript
// Library: react-swipeable or framer-motion
// Gesture: Touch + Mouse drag support
// Charts: [Pump Data] [Motor Data]
// Indicator: ● ○ (dots showing current position)

const SwipeableContainer = ({ selectedMotorId }: Props) => {
  const [currentChart, setCurrentChart] = useState(0);

  return (
    <Swipeable
      onSwipedLeft={() => setCurrentChart(1)}
      onSwipedRight={() => setCurrentChart(0)}
    >
      {currentChart === 0 ? (
        <PumpDataPanel motorId={selectedMotorId} />
      ) : (
        <MotorDataPanel motorId={selectedMotorId} />
      )}

      <SwipeIndicator current={currentChart} total={2} />
    </Swipeable>
  );
};
```

## Component Structure
```
MotorsPage/
├── MotorCardsGrid                    ← Top section (7 cards)
│   └── MotorCard (x7)
│       ├── Status indicator (🟢/🔴/🟡)
│       ├── Pressure display
│       └── Flow display
│
└── MotorDetailView                   ← Bottom section (always visible)
    ├── selectedMotorId (state)
    ├── SwipeableContainer
    │   ├── PumpDataPanel             ← Chart 1
    │   │   ├── MetricsDisplay
    │   │   │   ├── Pressure (with setpoint edit)
    │   │   │   ├── Flow (with setpoint edit)
    │   │   │   ├── FilterLED (suction - 3-state)
    │   │   │   ├── FilterLED (line - 3-state)
    │   │   │   └── ValveLED (2-state)
    │   │   ├── MotorEnableControl
    │   │   └── CombinedChart (Pressure + Flow)
    │   │       ├── Metric toggles [☑️P ☑️F]
    │   │       └── InfluxDB-style tooltip
    │   │
    │   └── MotorDataPanel            ← Chart 2
    │       ├── MetricsDisplay
    │       │   ├── Current (with limit edit)
    │       │   ├── RPM (with setpoint edit)
    │       │   ├── Temperature (with limit edit)
    │       │   └── Leak Test controls
    │       ├── MotorEnableControl
    │       └── CombinedChart (Current + RPM + Temp)
    │           ├── Metric toggles [☑️C ☑️R ☑️T]
    │           └── RPM normalization
    │
    └── SwipeIndicator (● ○)
```

## OPC Variable Mapping

### Pump Data (Chart 1)
```typescript
{
  pressure: {
    current: `MOTOR_${id}_PRESSURE_EXECUTION`,
    setpoint: `MOTOR_${id}_PRESSURE_SETPOINT`,
  },
  flow: {
    current: `MOTOR_${id}_FLOW_EXECUTION`,
    setpoint: `MOTOR_${id}_FLOW_SETPOINT`,
  },
  suctionFilter: `MOTOR_${id}_SUCTION_FILTER_EXECUTION`,  // 0/1/2/3
  lineFilter: `MOTOR_${id}_LINE_FILTER_EXECUTION`,        // 0/1/2/3
  valve: `PUMP_1_MANUAL_VALVE_STATUS`,                    // 0/1 (USINT)
  enable: `MOTOR_${id}_ENABLE_EXECUTION`                  // 0/1
}
```

### Motor Data (Chart 2)
```typescript
{
  current: {
    value: `MOTOR_${id}_CURRENT_EXECUTION`,
    limit: `MOTOR_${id}_CURRENT_LIMIT`,
  },
  rpm: {
    value: `MOTOR_${id}_RPM_EXECUTION`,
    setpoint: `MOTOR_${id}_RPM_SETPOINT`,
  },
  temperature: {
    value: `MOTOR_${id}_TEMPERATURE_EXECUTION`,
    limit: `MOTOR_${id}_TEMPERATURE_LIMIT`,
  },
  leakTest: {
    start: `MOTOR_${id}_LEAK_START`,
    stop: `MOTOR_${id}_LEAK_STOP`,
    status: `MOTOR_${id}_LEAK_STATUS`,
  },
  enable: `MOTOR_${id}_ENABLE_EXECUTION`  // Same as Chart 1
}
```

## Styling Guidelines
- **Theme:** Match existing SCADA dark theme (SystemOverviewPanel style)
- **Colors:**
  - Status Green: `#00ff00`, `#22c55e`
  - Status Yellow: `#ffaa00`, `#f59e0b`
  - Status Red: `#ff0000`, `#ef4444`
  - Primary Blue: `#60a0ff`, `#3b82f6`
  - Chart Lines: Custom colors per metric
- **Fonts:**
  - Monospace: `'Courier New', 'Consolas', monospace` for values
  - Labels: 9-11px, uppercase, letter-spacing: 0.5px
- **Spacing:** Compact (6-8px gaps)
- **Chart Height:** 250-300px (maximize without scroll)
- **Responsive:** Flexbox layout, dynamic sizing

## Implementation Priority
1. ✅ MotorCard component (compact display)
2. ✅ MotorDetailView layout (selected motor state)
3. ✅ LED indicators (FilterLED + ValveLED)
4. ✅ Setpoint edit popup modal
5. ✅ PumpDataPanel with metrics
6. ✅ MotorDataPanel with metrics
7. ✅ Combined charts (Recharts + toggles)
8. ✅ SwipeableContainer integration
9. ✅ InfluxDB data fetching
10. ✅ Motor Enable controls

## Next Session Action Plan
Start with:
1. Create `MotorsPage/index.tsx` main component
2. Build `MotorCard.tsx` component
3. Implement LED indicator components
4. Create setpoint edit popup
5. Build swipeable chart panels

Ready to code! 🚀
