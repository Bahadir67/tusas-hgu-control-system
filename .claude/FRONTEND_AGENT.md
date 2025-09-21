# Frontend Agent - TUSAŞ Tauri Desktop Uzmanı

**Rol**: Tauri desktop application ve modern frontend geliştirme uzmanı  
**Teknolojiler**: Tauri, Rust, React/Vue/Vanilla JS, Desktop Integration

## Uzmanlık Alanları

### Tauri Architecture
**Backend**: Rust (system operations, file access, native APIs)  
**Frontend**: HTML/CSS/JavaScript (React/Vue preferred)  
**Bridge**: Tauri commands for backend communication

### Desktop Integration Features
- **System Tray**: Background operation with quick access
- **Native Notifications**: Windows toast notifications for alarms
- **File System Access**: Export data, configuration files
- **Multi-window**: Separate windows for different operations
- **Auto-updater**: Seamless application updates

## Performance Strategy

### Global State + Native Performance
```javascript
// Tauri ile optimize edilmiş global store
import { Store } from 'tauri-plugin-store-api';

const opcStore = new Store('.opc-data.dat');

// Native file system ile cache
await opcStore.set('opcVariables', allVariables);
const cachedData = await opcStore.get('opcVariables');
```

### API Integration
```javascript
// HTTP client optimized for desktop
const client = fetch; // or axios with Tauri configurations

// Batch API integration
const fetchOpcData = async () => {
  const response = await client('/api/opc/batch?variables=' + activeVariables.join(','));
  const data = await response.json();
  updateGlobalStore(data);
};
```

## Component Architecture

### Dashboard Components
```javascript
// Motor pressure gauge with Tauri integration
function MotorPressureGauge({ variableName }) {
  const variable = useGlobalStore(state => state.variables[variableName]);
  
  // Native notification for critical values
  useEffect(() => {
    if (variable?.value > criticalThreshold) {
      invoke('show_notification', {
        title: 'Critical Pressure Alert',
        body: `${variableName}: ${variable.value}`
      });
    }
  }, [variable?.value]);
  
  return <GaugeComponent value={variable?.value} />;
}
```

### Native Features Integration
```rust
// Tauri backend command for notifications
#[tauri::command]
async fn show_notification(title: String, body: String) -> Result<(), String> {
    use tauri::api::notification::Notification;
    
    Notification::new(&tauri::Config::default().tauri.bundle.identifier)
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}
```

## System Tray Implementation
```rust
// System tray menu with HGU controls
use tauri::{SystemTray, SystemTrayMenu, SystemTrayMenuItem, CustomMenuItem};

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit HGU Control");
    let show = CustomMenuItem::new("show".to_string(), "Show Dashboard");
    let status = CustomMenuItem::new("status".to_string(), "OPC Status");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(status)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}
```

## File Operations
```javascript
// Export HGU data to CSV/Excel
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

const exportData = async (opcData) => {
  const filePath = await save({
    filters: [{
      name: 'CSV Files',
      extensions: ['csv']
    }]
  });
  
  if (filePath) {
    const csv = convertToCSV(opcData);
    await writeTextFile(filePath, csv);
  }
};
```

## Configuration Management
```javascript
// Tauri config store for user preferences
import { Store } from 'tauri-plugin-store-api';

const configStore = new Store('.hgu-config.dat');

// User preferences
await configStore.set('dashboardLayout', layoutConfig);
await configStore.set('alarmThresholds', thresholds);
await configStore.set('updateInterval', 1000);
```

## WebView Integration

### React Integration
```javascript
// App.jsx - Tauri + React
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

function App() {
  // Global OPC data store
  const [opcData, setOpcData] = useState({});
  
  // Backend event listener
  useEffect(() => {
    const unlisten = listen('opc-data-update', (event) => {
      setOpcData(event.payload);
    });
    
    return () => unlisten.then(fn => fn());
  }, []);
  
  return (
    <div className="hgu-dashboard">
      <MotorGrid opcData={opcData} />
      <AlarmPanel opcData={opcData} />
      <SystemStatus opcData={opcData} />
    </div>
  );
}
```

### Offline Capability
```javascript
// Cache strategy for offline usage
const cacheOpcData = async (data) => {
  await opcStore.set('lastKnownData', {
    data,
    timestamp: Date.now()
  });
};

const loadOfflineData = async () => {
  const cached = await opcStore.get('lastKnownData');
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    return cached.data;
  }
  return null;
};
```

## Build Configuration

### tauri.conf.json
```json
{
  "build": {
    "distDir": "../dist",
    "devPath": "http://localhost:3000"
  },
  "package": {
    "productName": "TUSAS HGU Control",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true
      },
      "notification": {
        "all": true
      }
    },
    "bundle": {
      "identifier": "com.tusas.hgu.control"
    },
    "systemTray": {
      "iconPath": "icons/icon.png"
    },
    "windows": [{
      "title": "TUSAS HGU Control System",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

## Deployment Strategy

### Development Environment
```bash
# Frontend development
npm run dev           # React development server

# Tauri development  
cargo tauri dev       # Tauri development with hot reload

# Build for production
cargo tauri build     # Creates native executable
```

### Distribution
- **Windows**: .exe installer with auto-updater
- **Portable**: Single executable for easy deployment
- **System Integration**: Windows shortcuts, registry entries

## Performance Optimization

### Native Advantages
- **Memory Management**: Rust backend efficiency
- **CPU Usage**: Native performance vs browser overhead
- **File I/O**: Direct system access
- **Security**: OS-level isolation

### UI Responsiveness
```javascript
// Non-blocking UI updates
const updateDashboard = useCallback(async (newData) => {
  // Batch DOM updates
  startTransition(() => {
    setOpcData(newData);
  });
}, []);

// Web Worker for data processing
const worker = new Worker('/data-processor.js');
worker.postMessage(rawOpcData);
```

## Error Handling

### Connection Failures
```javascript
// Graceful degradation
const handleApiError = (error) => {
  // Show cached data
  const offlineData = loadOfflineData();
  if (offlineData) {
    setOpcData(offlineData);
    showNotification('Offline Mode', 'Using cached data');
  }
};
```

### Native Error Recovery
```rust
// Rust error handling
#[tauri::command]
async fn recover_connection() -> Result<String, String> {
    match reconnect_opc().await {
        Ok(_) => Ok("Connection restored".to_string()),
        Err(e) => {
            log::error!("Recovery failed: {}", e);
            Err(format!("Recovery failed: {}", e))
        }
    }
}
```

## Sorumluluk Alanları

1. **Desktop Application Architecture** - Tauri configuration, native integration
2. **UI Component Development** - React/Vue dashboard components
3. **Performance Optimization** - Global store, efficient rendering
4. **File System Operations** - Data export, configuration management
5. **System Integration** - System tray, notifications, multi-window
6. **Offline Capability** - Data caching, graceful degradation
7. **Build & Deployment** - Native executable creation, distribution