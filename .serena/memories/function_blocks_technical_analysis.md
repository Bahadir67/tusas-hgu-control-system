# Function Blocks Technical Analysis

## 1. FB_HGU_Load_Balance_LS (Load Sensing Pump Controller)

### **Purpose**: Intelligent LS pump selection with efficiency optimization
**Version**: 2.0 | **Lines**: 505 | **Complexity**: Very High

### **Core Algorithm**: 
- **Multi-criteria Motor Selection**: Runtime hours + efficiency scoring
- **Dynamic Load Balancing**: 6-motor system with 500-1400 RPM range
- **LS Pump Technology**: Danfoss ER-R-100B-LS with 100cc displacement
- **State Machine**: 6-state (Idle→Analysis→Selection→Distribution→Setpoints→Commands)

### **Key Technical Features**:
- **Load Factor Calculation**: `System_Load_Factor = Required_Flow / (Max_Flow_Per_Pump * 6)`
- **Optimal Motor Count Logic**: Based on load percentage thresholds
- **Selection Scoring**: `Score = (1-runtime)*(1-eff_weight) + norm_eff*eff_weight`
- **Bubble Sort Algorithm**: Motor ranking by selection score
- **RPM Calculation**: `RPM = (Flow_Target / Displacement) * 1000`
- **LS Delta Pressure**: 20 bar constant

### **Interface Analysis**:
- **Inputs (64)**: System control, motor status, runtime hours, efficiency feedback
- **Outputs (47)**: Start commands, RPM/pressure setpoints, system status
- **Internal Arrays**: Motor_Selection_Score[1..6], Load_Distribution[1..6]

---

## 2. FB_CAN_Danfoss_Valves (Proportional Valve Controller)

### **Purpose**: CAN Bus communication for Danfoss MC050-120 valve controller  
**Version**: 1.0 | **Lines**: 443 | **Complexity**: High

### **Core Algorithm**:
- **PID Control**: P + I + D terms with windup protection
- **CAN Frame Protocol**: 8-byte data frames via TCP/IP-CAN converter
- **Position Feedback**: 16-bit position counts scaled to 0-100%
- **State Machine**: 8-state control cycle

### **Key Technical Features**:
- **Control Output Scaling**: `temp_position_word = REAL_TO_UINT(Control * 655.35)`
- **PID Implementation**: `Output = P_error + I_sum + D_diff`
- **Integral Windup Protection**: `I_sum = LIMIT(-100, I_sum, 100)`
- **Position Scaling**: `Position = Raw_Counts / 655.35`
- **Current Feedback**: 0-20mA range scaled to engineering units

### **Interface Analysis**:
- **Inputs (7)**: Enable, valve index, position setpoint, control mode
- **Outputs (18)**: Control status, actual position, current feedback
- **Database Integration**: DANFOSS_VALVES[1..4] calibration parameters

---

## 3. FB_HGU_Scaling (Universal Analog Scaling)

### **Purpose**: Converts raw analog values to engineering units with calibration
**Version**: 1.0 | **Lines**: 232 | **Complexity**: Medium

### **Core Algorithm**:
- **4-20mA Scaling**: Raw ADC (6554-32767) to engineering units
- **Dual Calibration**: Accredited + Local drift corrections
- **Quality Assessment**: Range validation with tolerance checking
- **Low-pass Filtering**: First-order filter with time constant

### **Key Technical Features**:
- **Linear Scaling**: `Scaled = ((Raw-Min_Raw)/(Max_Raw-Min_Raw)) * Range + Min_Scaled`
- **Calibration**: `Final = (Scaled + Combined_Offset) * Combined_Gain`
- **Range Checking**: Under-range (<4mA), Over-range (>20mA) detection
- **Filter**: `Output = Output + factor * (Input - Output)`
- **Quality Logic**: Consecutive bad readings trigger error state

### **Interface Analysis**:
- **Inputs (11)**: Raw value, scaling parameters, calibration factors
- **Outputs (6)**: Scaled value, status, quality flags
- **Status Codes**: 0=OK, 1=Warning, 2=Error, 3=Disabled

---

## Technical Comparison Matrix

| Function Block | State Machine | PID Control | CAN Communication | Database Access | Complexity |
|---|---|---|---|---|---|
| FB_HGU_Load_Balance_LS | 6-state | No | No | Yes | Very High |
| FB_CAN_Danfoss_Valves | 8-state | Yes (P+I+D) | Yes | Yes | High |
| FB_HGU_Scaling | Linear | No | No | No | Medium |

## Common Design Patterns

### **TIA Portal Compatibility**:
- All use proper CASE syntax (no BEGIN/END blocks)
- RD_LOC_T with status handling: `temp_status := RD_LOC_T(OUT => current_time)`
- Time data type usage without TIME_TO_REAL function
- Database access pattern: `"DB_HGU_Calibration".TABLE[index].PARAMETER`

### **Error Handling Standard**:
- Consecutive error counters with thresholds
- Retry logic with maximum attempts
- Status classification: 0=OK, 1=Warning, 2=Error, 3=Offline/Disabled
- Communication timeout handling

### **State Machine Architecture**:
- Timer-based state progression
- Previous state tracking for change detection
- Error states with automatic recovery
- Return to idle pattern

## Integration Points

### **Motor Control System**:
- FB_HGU_Load_Balance_LS provides start commands and setpoints
- G120C PROFINET drives receive RPM commands
- FB_Pump_Efficiency provides efficiency feedback

### **Valve Control System**:
- FB_CAN_Danfoss_Valves controls MC050-120 proportional valves
- CAN-Ethernet conversion for TCP/IP communication
- Position feedback for closed-loop control

### **Sensor Processing**:
- FB_HGU_Scaling processes all 4-20mA analog inputs
- Pressure, temperature, flow sensor scaling
- Quality assessment for SCADA reliability