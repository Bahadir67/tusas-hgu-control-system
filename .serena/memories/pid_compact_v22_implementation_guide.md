# PID_Compact V2.2 Implementation Guide for TUSAŞ HGU

## Overview
Expert guidance for implementing Siemens PID_Compact V2.2 controllers in TIA Portal V13 SP1+ for the TUSAŞ HGU hydraulic system.

## Key Technical Requirements for HGU System

### Pressure Control Loop Architecture:
```
PID_Compact → Pump Variable Displacement → Hydraulic System → Pressure Sensor → PID_Compact
```

### Critical Parameters for Hydraulic Systems:
- **Kp**: Proportional gain (typically 0.5-2.0 for hydraulic pressure)
- **TI**: Integral action time (5-20s for hydraulic systems)
- **TD**: Derivative action time (0.5-2.0s for pressure damping)
- **Cycle Time**: 100-300ms for hydraulic pressure control

### HGU-Specific Implementation:

#### 1. Cyclic Interrupt OB Setup:
- Use OB30 with 200ms cycle time for pressure control
- Consistent sampling for 6 parallel PID controllers
- Each pump has dedicated PID_Compact instance

#### 2. PID_Compact Configuration:
```scl
// In OB30 (200ms cycle)
"PID_Pump_1"(
    Setpoint := "DB_HGU_Execution".MOTOR_1_PUMP_PRESSURE_SETPOINT,
    Input := "DB_HGU_Execution".MOTOR_1_PUMP_PRESSURE_EXECUTION,
    Input_PER := 0,
    ManualEnable := NOT "DB_HGU_Execution".MOTOR_1_ENABLED_EXECUTION,
    ManualValue := 0.0,
    Reset := "DB_HGU_Execution".MOTOR_1_RESET_EXECUTION,
    ModeActivate := FALSE,
    Output => "DB_HGU_Execution".MOTOR_1_VALVE_EXECUTION
);
```

#### 3. Load Sensing Integration:
- PID setpoints automatically updated by Load Sensing logic
- Individual pump adjustments allowed between system updates
- Rising trigger on system setpoint changes

#### 4. Hydraulic System Characteristics:
- **Fast Response**: Variable displacement pumps respond quickly
- **Pressure Coupling**: Check valve isolation between pumps
- **Load Sensitivity**: Pressure requirements vary with hydraulic load

#### 5. Initial Parameter Recommendations:
```scl
// For 75kW variable displacement pumps
Kp := 1.2;      // Moderate gain for stability
TI := 8.0;      // 8 second integral time
TD := 1.0;      // 1 second derivative for dampening
```

#### 6. Error Handling:
- Monitor PID State and ErrorBits
- Pressure sensor fault detection
- Pump enable/disable logic integration
- Emergency stop handling

#### 7. TIA Portal V17 Compatibility:
- Use PID_Compact FB1130 technology object
- Instance DBs for each pump controller
- No FB instance arrays (V17 restriction compliance)

## Implementation Steps for HGU:
1. Create OB30 with 200ms cycle
2. Add 6 PID_Compact instances (one per pump)
3. Configure pressure scaling (0-400 bar range)
4. Connect to Load Sensing setpoint coordination
5. Implement pump enable/disable logic
6. Add error monitoring and diagnostics
7. Perform pretuning for each pump
8. Fine-tune based on system response

## Benefits for HGU System:
- Professional PID control replaces simple proportional
- Auto-tuning capabilities for optimal performance
- Integrated diagnostics and monitoring
- TIA Portal V17 compatible implementation
- Load Sensing coordination maintained