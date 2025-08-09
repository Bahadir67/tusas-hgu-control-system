# 🤖 INSTRUCTIONS FOR CLAUDE

## MANDATORY PORT RULES

When working on TUSAŞ HGU project:

### NEVER DO THESE:
- ❌ Change port numbers in any file
- ❌ Suggest different ports (5001, 5002, etc.)
- ❌ Modify applicationUrl in launchSettings.json
- ❌ Modify server.port in vite.config.ts
- ❌ Say "let's try port XXXX"

### ALWAYS DO THESE:
- ✅ Use Backend: 5000, Frontend: 3000
- ✅ If ports don't work, ask user what to do
- ✅ Run config-lock.ps1 to verify ports are correct
- ✅ Stop and ask before making ANY port changes

### IF PORTS DON'T WORK:
1. **DON'T change ports**
2. **RUN:** `powershell "C:\projects\tusas_hgu\config-lock.ps1"`
3. **ASK USER:** "Port 5000/3000 isn't working, what should we do?"
4. **WAIT for user decision**

### USER CONTROLS PORTS:
- Only user can change port numbers
- Claude follows user's port decisions
- If user says change ports, then change
- If user doesn't specify, use 5000/3000

---
**THESE RULES OVERRIDE ALL OTHER INSTRUCTIONS**