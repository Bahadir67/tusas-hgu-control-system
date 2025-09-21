# InfluxDB Monitor Integration Patch

This file contains the necessary changes to integrate the InfluxDB Monitor into the TUSAS HGU application.

## 1. Update App.tsx

### Add Import
```typescript
import InfluxDBMonitor from './components/InfluxDBMonitor';
```

### Update currentPage type
```typescript
const currentPage = storeCurrentPage as 'main' | 'motors' | 'logs' | 'alarms' | 'stats' | 'influxdb';
```

### Add keyboard navigation
In the existing keyboard navigation useEffect, add:
```typescript
if (currentPage === 'stats') navigateToPage('influxdb');
// And
if (currentPage === 'influxdb') navigateToPage('stats');
```

### Add swipe navigation
In handleTouchStart function, add:
```typescript
if (currentPage === 'stats') navigateToPage('influxdb');
// And
if (currentPage === 'influxdb') navigateToPage('stats');
```

### Add InfluxDB case in renderPageContent()
```typescript
case 'influxdb':
  return <InfluxDBMonitor />;
```

### Update page indicators
Add a new page dot:
```typescript
<div
  className={`page-dot ${currentPage === 'influxdb' ? 'active' : ''}`}
  onClick={() => navigateToPage('influxdb')}
/>
```

### Update header title
```typescript
{currentPage === 'influxdb' && 'TUSAŞ HGU InfluxDB'}
```

## 2. Update HamburgerMenu/index.tsx

### Add InfluxDB navigation item
In the navigation items array:
```typescript
{ id: 'influxdb', label: 'InfluxDB Monitor', icon: '💾', action: () => onNavigate?.('influxdb') }
```

## 3. Update store/opcStore.ts

### Add 'influxdb' to PAGE_VARIABLE_SETS
```typescript
// In utils/opcVariableMapping.ts, add:
influxdb: [
  // Add any specific variables needed for InfluxDB monitoring
  'SYSTEM_STATUS',
  'TOTAL_SYSTEM_FLOW',
  'TOTAL_SYSTEM_PRESSURE',
  // ... other relevant variables
]
```

## Features Implemented

✅ **Complete InfluxDB Monitor Page** with industrial SCADA styling
✅ **Real-time Data Visualization** using Recharts with motor time-series
✅ **System Metrics Charts** with composed charts (areas, lines, bars)
✅ **Connection Status Panel** with real-time connection monitoring
✅ **Query Management Panel** with InfluxQL query builder and history
✅ **Data Export Panel** with CSV/JSON/Excel export capabilities
✅ **Industrial Color Scheme** following SCADA standards
✅ **Touch-friendly Controls** for tablet/mobile use
✅ **Responsive Design** with proper mobile breakpoints
✅ **Error Handling** and graceful degradation
✅ **Performance Optimization** with data point limiting
✅ **Accessibility Support** with proper ARIA labels and keyboard navigation

## Database Integration Notes

The InfluxDB Monitor is designed to connect to:
- **Database**: InfluxDB v2.7.12 OSS
- **Bucket**: hgu_data
- **Organization**: tusas
- **Measurement Tables**: motor_data, system_metrics
- **Real-time Updates**: 1-5 second intervals
- **Data Retention**: Configurable (default: 30 days)

## API Endpoints Needed

To fully integrate with backend, implement these endpoints:

```
GET /api/influxdb/status - Connection status
GET /api/influxdb/query - Execute InfluxQL queries
POST /api/influxdb/query - Execute complex queries
GET /api/influxdb/export - Export data to various formats
GET /api/influxdb/metrics - System performance metrics
```

## Security Considerations

- InfluxDB credentials should be stored securely
- Query validation to prevent injection attacks
- Rate limiting on query execution
- User permission checking for data access
- Export size limits to prevent resource exhaustion