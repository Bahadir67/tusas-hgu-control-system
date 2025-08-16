# TIA Portal V17 Timer PT Parameter - Mandatory Usage Rule

## 🚨 **CRITICAL TIA PORTAL V17 RULE**

### **Timer PT Parameter ALWAYS Required**

TIA Portal V17'de **TON, TOF, TP** timer'ları kullanırken **PT parameter** her zaman zorunlu!

### ❌ **WRONG - Will Cause Compilation Error:**
```scl
// ERROR: Missing PT parameter
Startup_Timer(IN := FALSE);
Flow_Error_Timer(IN := Enable);
Mode_Switch_Timer(IN := Mode_Change_Detected);
```

### ✅ **CORRECT - TIA Portal V17 Compliant:**
```scl
// CORRECT: PT parameter always included
Startup_Timer(IN := FALSE, PT := T#100ms);
Flow_Error_Timer(IN := Enable, PT := T#2s);
Mode_Switch_Timer(IN := Mode_Change_Detected, PT := T#500ms);
```

## 📋 **Timer Usage Rules**

### **1. Timer Declaration (VAR Section)**
```scl
VAR
    Startup_Timer : TON;          // Timer declaration
    Error_Timer : TON;            // Error detection timer
    Delay_Timer : TOF;            // Turn-off delay timer
END_VAR
```

### **2. Timer Call (Code Section)**
```scl
// Always include both IN and PT parameters
Startup_Timer(IN := Enable_Signal, PT := T#2s);

// Check timer output
IF Startup_Timer.Q THEN
    // Timer elapsed logic
END_IF;

// Timer elapsed time
Elapsed_Time := Startup_Timer.ET;
```

### **3. Timer Reset Pattern**
```scl
// Reset timer - PT still required!
Startup_Timer(IN := FALSE, PT := T#2s);
Error_Timer(IN := FALSE, PT := T#5s);
```

## 🎯 **Common Timer Patterns in TUSAŞ HGU**

### **Startup Delays**
```scl
Startup_Timer(IN := Enable, PT := T#200ms);          // 200ms startup delay
Flow_Error_Timer(IN := Error_Condition, PT := T#2s); // 2 second error persistence
```

### **Mode Switching Delays**
```scl
Mode_Switch_Timer(IN := Mode_Change_Detected, PT := T#500ms); // Prevent oscillation
Phase_Timer(IN := Phase_Change, PT := T#1s);                 // Phase transition delay
```

### **Safety Monitoring**
```scl
Safety_Error_Timer(IN := Safety_Violation, PT := T#3s);     // Safety error persistence
Communication_Timer(IN := Comm_Error, PT := T#10s);         // Communication timeout
```

### **System Monitoring**
```scl
Hour_Update_Timer(IN := TRUE, PT := T#3600s);              // 1 hour = 3600 seconds
Maintenance_Timer(IN := Maintenance_Due, PT := T#30s);      // Maintenance alert delay
```

## ⚠️ **Common Mistakes to Avoid**

### **1. Missing PT Parameter**
```scl
// ERROR - Will not compile
Timer1(IN := TRUE);           ❌

// CORRECT
Timer1(IN := TRUE, PT := T#1s); ✅
```

### **2. Incorrect Time Format**
```scl
// ERROR - Invalid time format
Timer1(IN := TRUE, PT := 1000);     ❌
Timer1(IN := TRUE, PT := "1s");     ❌

// CORRECT - Use T# prefix
Timer1(IN := TRUE, PT := T#1s);     ✅
Timer1(IN := TRUE, PT := T#1000ms); ✅
```

### **3. Timer Reset Without PT**
```scl
// ERROR - Reset also needs PT
Timer1(IN := FALSE);           ❌

// CORRECT - Always include PT
Timer1(IN := FALSE, PT := T#1s); ✅
```

## 🕒 **Time Format Standards**

### **Milliseconds (ms)**
```scl
PT := T#40ms      // Valve response time
PT := T#100ms     // Startup delay
PT := T#500ms     // Mode switching delay
```

### **Seconds (s)**
```scl
PT := T#1s        // Error detection
PT := T#2s        // Startup sequence
PT := T#10s       // Communication timeout
```

### **Minutes (m) and Hours (h)**
```scl
PT := T#5m        // 5 minutes
PT := T#1h        // 1 hour = 3600s
PT := T#3600s     // 1 hour (explicit seconds)
```

## 📊 **TUSAŞ HGU Project Timer Standards**

### **Control Loop Timers**
- **Startup Delay**: `PT := T#200ms` (motor/controller startup)
- **Error Persistence**: `PT := T#2s` (error confirmation)
- **Mode Switching**: `PT := T#500ms` (prevent oscillation)
- **Safety Monitoring**: `PT := T#3s` (critical safety errors)

### **System Monitoring Timers**
- **Communication Timeout**: `PT := T#10s` (network communication)
- **Operating Hours**: `PT := T#3600s` (1 hour tracking)
- **Maintenance Alert**: `PT := T#30s` (maintenance due notification)

### **Process Control Timers**
- **Valve Response**: `PT := T#40ms` (hydraulic valve response)
- **Pressure Tracking**: `PT := Valve_Response_Time` (configurable)
- **Flow Stabilization**: `PT := T#1s` (flow measurement settling)

## 🔧 **Debugging Timer Issues**

### **Compilation Error: "Parameter 'PT' has to be used"**
```scl
// Problem line in compilation error:
Timer_Name(IN := condition);

// Fix: Add PT parameter
Timer_Name(IN := condition, PT := T#appropriate_time);
```

### **Timer Not Working as Expected**
1. ✅ Check PT parameter is included
2. ✅ Verify time format (T# prefix)
3. ✅ Confirm IN condition logic
4. ✅ Check timer output usage (.Q, .ET)

## 💡 **Best Practices**

1. **Always Define PT**: Never call timer without PT parameter
2. **Consistent Timing**: Use standard timing values across project
3. **Meaningful Names**: Timer names should indicate purpose
4. **Reset Properly**: Include PT even when resetting (IN := FALSE)
5. **Document Timing**: Comment why specific timing values are chosen

## 🚀 **Quick Reference**

```scl
// Standard timer call pattern
Timer_Name(IN := condition, PT := T#time_value);

// Check if timer elapsed
IF Timer_Name.Q THEN
    // Timer finished logic
END_IF;

// Get elapsed time
Current_Time := Timer_Name.ET;

// Reset timer
Timer_Name(IN := FALSE, PT := T#time_value);
```

**Remember:** In TIA Portal V17, **PT parameter is MANDATORY** for all timer calls!