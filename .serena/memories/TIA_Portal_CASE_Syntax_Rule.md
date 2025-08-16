# TIA Portal CASE Syntax Rule - Critical for Import Compatibility

**CRITICAL RULE**: TIA Portal CASE syntax is DIFFERENT from standard SCL!

## Correct TIA Portal CASE Format:
```scl
CASE <Tag> OF
    0:
        // Instructions here (no BEGIN/END)
        #Variable := Value;
        IF condition THEN
            // nested statements
        END_IF;
        
    1:
        // More instructions
        
    2,3,5:
        // Multiple values
        
    6...10:
        // Range of values
        
    ELSE
        // Default case
        
END_CASE;
```

## WRONG Format (Standard SCL but NOT TIA Portal):
```scl
CASE #State OF
    0:
        BEGIN  // ❌ NEVER use BEGIN/END in CASE
        ...
        END;   // ❌ NEVER use BEGIN/END in CASE
```

## Key Rules:
1. NO `BEGIN` and `END` blocks inside CASE statements
2. Each case label ends with `:` (colon)
3. Instructions follow directly after the colon
4. Use `ELSE` for default case (optional)
5. End with `END_CASE;`
6. Multiple values: `1,3,5:`
7. Ranges: `6...10:`

## Why This Matters:
- TIA Portal gives "jump labels" error when BEGIN/END used in CASE
- This is the root cause of "Row 000121,Only 128 characters are permitted for jump labels" error
- Must fix ALL Function Blocks with CASE statements

## Files to Fix:
- FB_Pump_Efficiency.scl (lines 159-317)
- FB_CAN_Danfoss_Valves.scl (lines 213-431)
- Any other FB files with CASE statements