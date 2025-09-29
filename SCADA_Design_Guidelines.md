# SCADA Design Guidelines - 1366x768 Optimization

## Typography Scale (Space-Optimized)

### Primary Text Hierarchy
- **Panel Titles**: 13px bold (reduced from 15px)
- **Main Values**: 22px bold (reduced from 26px)
- **Secondary Values**: 14px bold (reduced from 16px)
- **Labels**: 10px regular (reduced from 12px)
- **Status Text**: 9px regular (reduced from 11px)
- **Units**: 8px regular (reduced from 10px)

### Industrial SCADA Color Palette
```css
/* Status Colors */
--status-running: #22c55e    /* Green - System Active */
--status-warning: #f59e0b    /* Amber - Warning State */
--status-error: #ef4444     /* Red - Error/Critical */
--status-offline: #6b7280   /* Gray - Offline/Disabled */

/* Background Colors */
--bg-primary: rgba(13, 18, 22, 0.95)     /* Dark industrial */
--bg-secondary: rgba(22, 32, 38, 0.85)   /* Panel backgrounds */
--bg-accent: rgba(26, 34, 44, 0.8)       /* Metric containers */

/* Text Colors */
--text-primary: #ffffff      /* Main text */
--text-secondary: #a8b2c0    /* Labels and secondary text */
--text-muted: rgba(168, 178, 192, 0.7)   /* Hints and units */

/* Border Colors */
--border-primary: rgba(96, 160, 255, 0.3)  /* Panel borders */
--border-accent: rgba(96, 160, 255, 0.1)   /* Internal borders */
```

## Space Efficiency Guidelines

### Touch Target Compliance (Industrial Requirements)
- **Minimum touch target**: 44px x 44px
- **Recommended touch target**: 56px x 44px
- **Critical controls**: 80px x 44px
- **Emergency stops**: Minimum 100px x 60px

### Spacing Standards
- **Panel padding**: 12px (optimized from 14px)
- **Inter-element gaps**: 8px (optimized from 10px)
- **Section spacing**: 10px (optimized from 12px)
- **Border radius**: 6-8px (reduced from 10-12px)

### Content Density
- **Information hierarchy**: Critical > Important > Supporting
- **Visual grouping**: Related data within 8px proximity
- **Breathing room**: 12px minimum between major sections
- **Alignment**: Grid-based layout with 4px base unit

## Panel Layout Specifications

### SystemOverviewPanel (683x526px)
```
┌─ Header (683x40px) ────────────────────────────────┐
│ 🔧 SYSTEM OVERVIEW              [●] ACTIVE       │
├─ Main Metrics (683x180px) ─────────────────────────┤
│ ┌─ Pressure ─┐ │ ┌─ Flow ─────┐ │ ┌─ Temp ─────┐ │
│ │   245.7    │ │ │   125.3    │ │ │   42.8     │ │
│ │    bar     │ │ │   L/min    │ │ │    °C      │ │
│ └────────────┘ │ └────────────┘ │ └────────────┘ │
├─ Secondary Metrics (683x80px) ──────────────────────┤
│ Active: 4  │ Efficiency: 85%  │ Power: 2.4kW    │
├─ Performance Bars (683x120px) ──────────────────────┤
│ Pressure: ████████░░ 80%                          │
│ Flow:     ██████░░░░ 60%                          │
│ Temp:     █████░░░░░ 50%                          │
├─ Pump Enable Section (683x86px) ────────────────────┤
│ ⚡ SYSTEM CONTROL    [●──○] ENABLED              │
└─ Expand Hint (683x20px) ───────────────────────────┘
```

### TankCoolingPanel (671x526px)
```
┌─ Header (671x40px) ────────────────────────────────┐
│ ❄️ TANK & COOLING               [●] NORMAL       │
├─ Tank Section (671x200px) ─────────────────────────┤
│ 🛢️ HYDRAULIC TANK                                │
│ ┌─Tank Visual─┐ │ Temp: ████░░░░ 45.2°C          │
│ │    ████     │ │ Water: ██░░░░░░ 0.15%          │
│ │    ████     │ │                                │
│ │ 75%████     │ │                                │
│ └─────────────┘ │                                │
├─ Cooling Section (671x200px) ──────────────────────┤
│ ❄️ COOLING SYSTEM                                 │
│ Water Temp: ███░░░░░ 18.5°C                      │
│ Flow Rate:  ████████ 145.2 L/min                 │
│ 🔵 Cooling Pump ON                               │
├─ Temperature Range (671x60px) ──────────────────────┤
│ Operating Range: 30°C ──●── 60°C                 │
└─ Expand Hint (671x26px) ───────────────────────────┘
```

## Performance Optimization

### Critical Requirements
- **No vertical scrolling** on 1366x768 displays
- **Sub-1000ms** rendering for all components
- **60fps** smooth animations and transitions
- **Maximum 2MB** total bundle size

### Mobile/Touch Adaptations
- **Larger touch targets** on touch devices
- **Simplified layouts** for smaller screens
- **Swipe gestures** for navigation
- **High contrast mode** support

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color contrast**: Minimum 4.5:1 for normal text
- **Focus indicators**: 2px visible outline on all interactive elements
- **Keyboard navigation**: Full keyboard accessibility
- **Screen readers**: Proper ARIA labels and roles

### Industrial Environment Considerations
- **High ambient light**: High contrast color schemes
- **Gloved operation**: Large touch targets (56px minimum)
- **Quick recognition**: Consistent iconography and colors
- **Emergency situations**: Critical information prominently displayed

## Alternative Layout Options

### Option B: Stacked Layout (for wider information)
```
┌─────────────────────────────────────────────────────┐
│ Header (1366x60px)                                 │
├─────────────────────────────────────────────────────┤
│ SystemOverviewPanel (1366x233px)                   │
├─────────────────────────────────────────────────────┤
│ TankCoolingPanel (1366x233px)                      │
└─────────────────────────────────────────────────────┘
```

**Pros**: More horizontal space for additional metrics
**Cons**: Less vertical space per panel, may feel cramped

### Option C: Asymmetric Layout (70/30 split)
```
┌─────────────────────────────────────────────────────┐
│ Header (1366x60px)                                 │
├─────────────────────────────────────────────────────┤
│ SystemOverview │ │ Tank &                          │
│ (956x538px)    │ │ Cooling                         │
│                │ │ (398x538px)                     │
│                │ │                                 │
└─────────────────────────────────────────────────────┘
```

**Pros**: More space for primary system data
**Cons**: Less space for cooling system details

## Implementation Recommendations

### Priority 1: Space Optimization
1. ✅ **Header height reduction**: 100px → 60px
2. ✅ **Typography scaling**: Reduced font sizes across the board
3. ✅ **Padding optimization**: 14px → 12px panel padding
4. ✅ **Fixed panel dimensions**: 683x526 and 671x526 pixels

### Priority 2: Content Efficiency
1. **Information hierarchy**: Most critical data prominently displayed
2. **Progressive disclosure**: Detailed views accessible via modals
3. **Visual grouping**: Related metrics grouped together
4. **Status indication**: Clear visual status at all hierarchy levels

### Priority 3: Performance
1. **No scrolling**: All content fits within viewport
2. **Touch optimization**: 44px minimum touch targets
3. **High contrast**: Industrial visibility standards
4. **Responsive behavior**: Graceful degradation on smaller screens

This design ensures professional SCADA interface standards while maximizing information density within the 1366x768 constraint.