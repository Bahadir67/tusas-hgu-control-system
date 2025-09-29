# TUSAŞ HGU SCADA Layout Analysis - 1366x768 Optimization

## Screen Real Estate Analysis

### Total Available Space: 1366x768px

**Space Deductions:**
- Windows form header: 30px
- Windows taskbar: 40px
- Browser chrome (top): 60px
- Browser chrome (sides): 20px total
- Scroll bars (if any): 17px

**Effective Viewport: 1366x598px**

### Critical Layout Zones

#### Zone 1: Header Section (Recommended: 60px height)
- Navigation dots: 40px height
- Padding/margins: 20px total
- Status indicators: Integrated into header

#### Zone 2: Main Content Area (538px height available)
- SystemOverviewPanel: Optimized dimensions
- TankCoolingPanel: Optimized dimensions
- Inter-panel spacing: 12px

#### Zone 3: Footer/Status Bar (Optional: 0-30px)
- Connection status
- Timestamp
- System alerts

## Layout Strategy Options

### Option A: Side-by-Side Layout (Recommended)
```
┌─────────────────────────────────────────────────────────────┐
│ Header (1366x60px) - Navigation + Status                   │
├─────────────────────────────────────────────────────────────┤
│ SystemOverview    │ Gap │ TankCooling                      │
│ (683x538px)       │12px │ (671x538px)                      │
│                   │     │                                  │
└─────────────────────────────────────────────────────────────┘
```

### Option B: Stacked Layout (Alternative)
```
┌─────────────────────────────────────────────────────────────┐
│ Header (1366x60px)                                         │
├─────────────────────────────────────────────────────────────┤
│ SystemOverviewPanel (1366x269px)                          │
├─────────────────────────────────────────────────────────────┤
│ TankCoolingPanel (1366x269px)                             │
└─────────────────────────────────────────────────────────────┘
```

## Panel Dimension Specifications

### SystemOverviewPanel - Side Layout (683x538px)
- Motor grid: 4x2 layout (each motor: 160x120px)
- Motor spacing: 8px between items
- Panel padding: 16px
- Pump enable switch: 120x44px (bottom section)

### TankCoolingPanel - Side Layout (671x538px)
- Cooling controls: Vertical stack
- Temperature displays: 140x80px each
- Control buttons: 150x44px minimum
- Panel padding: 16px

### Typography Scale (Space-Optimized)
- Panel titles: 18px bold
- Main values: 24px bold
- Labels: 14px regular
- Status text: 12px regular
- Units: 11px regular

## Touch Target Compliance
- Minimum button size: 44x44px
- Recommended spacing: 8px minimum
- Critical controls: 56x44px minimum
- Emergency stops: 80x44px minimum