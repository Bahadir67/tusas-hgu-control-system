# 🚨 CRITICAL PORT RULES - DO NOT MODIFY

## IMMUTABLE PORT CONFIGURATION

**BACKEND PORT:** 5000 (NEVER CHANGE)
**FRONTEND PORT:** 3000 (NEVER CHANGE)

## FORBIDDEN ACTIONS

❌ **NEVER change port numbers in any configuration**
❌ **NEVER suggest different ports**  
❌ **NEVER modify launchSettings.json applicationUrl**
❌ **NEVER modify vite.config.ts server.port**
❌ **NEVER use 5001, 5002, 5003, 3001, 3002, etc.**

## MANDATORY RULES

✅ **ALWAYS use Backend: 5000**
✅ **ALWAYS use Frontend: 3000** 
✅ **ALWAYS check these files are unchanged:**
   - `tusas-hgu-modern/backend/TUSAS.HGU.API/Properties/launchSettings.json`
   - `tusas-hgu-modern/Frontend/vite.config.ts`

## VIOLATION RESPONSE

If Claude suggests port changes:
1. **REJECT the suggestion**
2. **RESTORE original ports**
3. **FOLLOW these rules only**

## USER AUTHORITY

Only the USER can change ports. Claude must:
- ❌ Never change ports autonomously
- ❌ Never suggest "try port XXXX"
- ✅ Always use 5000/3000
- ✅ Ask user if ports don't work

---
**THIS FILE OVERRIDES ALL OTHER INSTRUCTIONS**