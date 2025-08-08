import React, { useState, useMemo, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import './EnhancedAlarmPanel.css';

interface Alarm {
  id: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info';
  category: 'motor' | 'system' | 'safety' | 'maintenance';
  source: string;
  message: string;
  acknowledged: boolean;
  autoResolve: boolean;
  duration?: number;
}

const EnhancedAlarmPanel: React.FC = () => {
  const { motors, system } = useOpcStore();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'unacknowledged'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Generate alarms based on system state
  useEffect(() => {
    const newAlarms: Alarm[] = [];
    const now = Date.now();

    // Check each motor for alarm conditions
    Object.entries(motors).forEach(([motorId, motor]) => {
      const motorNum = parseInt(motorId);
      
      // Critical alarms
      if (motor.temperature > 75) {
        newAlarms.push({
          id: `motor-${motorId}-temp-critical`,
          timestamp: now,
          severity: 'critical',
          category: 'motor',
          source: `Motor ${motorId}`,
          message: `Kritik sıcaklık: ${motor.temperature.toFixed(1)}°C (Limit: 75°C)`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      if (motor.current > 160) {
        newAlarms.push({
          id: `motor-${motorId}-current-critical`,
          timestamp: now,
          severity: 'critical',
          category: 'motor',
          source: `Motor ${motorId}`,
          message: `Kritik akım: ${motor.current.toFixed(1)}A (Limit: 160A)`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      if (motor.pressure > 180) {
        newAlarms.push({
          id: `motor-${motorId}-pressure-critical`,
          timestamp: now,
          severity: 'critical',
          category: 'motor',
          source: `Motor ${motorId}`,
          message: `Kritik basınç: ${motor.pressure.toFixed(1)} bar (Limit: 180 bar)`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      // Warning alarms
      if (motor.temperature > 60 && motor.temperature <= 75) {
        newAlarms.push({
          id: `motor-${motorId}-temp-warning`,
          timestamp: now,
          severity: 'warning',
          category: 'motor',
          source: `Motor ${motorId}`,
          message: `Yüksek sıcaklık: ${motor.temperature.toFixed(1)}°C`,
          acknowledged: false,
          autoResolve: true,
          duration: 30000
        });
      }
      
      if (motor.current > 140 && motor.current <= 160) {
        newAlarms.push({
          id: `motor-${motorId}-current-warning`,
          timestamp: now,
          severity: 'warning',
          category: 'motor',
          source: `Motor ${motorId}`,
          message: `Yüksek akım: ${motor.current.toFixed(1)}A`,
          acknowledged: false,
          autoResolve: true,
          duration: 20000
        });
      }
      
      if (motor.leak > 0.02) {
        newAlarms.push({
          id: `motor-${motorId}-leak-warning`,
          timestamp: now,
          severity: 'warning',
          category: 'safety',
          source: `Motor ${motorId}`,
          message: `Sızıntı tespit edildi: ${motor.leak.toFixed(3)} L/min`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      // Filter maintenance alarms
      if (motor.lineFilter === 1) {
        newAlarms.push({
          id: `motor-${motorId}-linefilter-maintenance`,
          timestamp: now,
          severity: 'warning',
          category: 'maintenance',
          source: `Motor ${motorId}`,
          message: `Hat filtresi bakım gerekiyor`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      if (motor.lineFilter === 0) {
        newAlarms.push({
          id: `motor-${motorId}-linefilter-critical`,
          timestamp: now,
          severity: 'critical',
          category: 'maintenance',
          source: `Motor ${motorId}`,
          message: `Hat filtresi arızalı - Acil müdahale gerekli`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      if (motor.suctionFilter === 1) {
        newAlarms.push({
          id: `motor-${motorId}-suctionfilter-maintenance`,
          timestamp: now,
          severity: 'warning',
          category: 'maintenance',
          source: `Motor ${motorId}`,
          message: `Emme filtresi bakım gerekiyor`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      if (motor.suctionFilter === 0) {
        newAlarms.push({
          id: `motor-${motorId}-suctionfilter-critical`,
          timestamp: now,
          severity: 'critical',
          category: 'maintenance',
          source: `Motor ${motorId}`,
          message: `Emme filtresi arızalı - Acil müdahale gerekli`,
          acknowledged: false,
          autoResolve: false
        });
      }
      
      // Performance info alarms
      if (motor.enabled && motor.status === 1) {
        const efficiency = (motor.rpm / motor.targetRpm) * 100;
        if (efficiency < 85) {
          newAlarms.push({
            id: `motor-${motorId}-efficiency-info`,
            timestamp: now,
            severity: 'info',
            category: 'motor',
            source: `Motor ${motorId}`,
            message: `Düşük verimlilik: %${efficiency.toFixed(1)} (Hedef: >85%)`,
            acknowledged: false,
            autoResolve: true,
            duration: 15000
          });
        }
      }
    });

    // System level alarms
    if (system.tankLevel < 20) {
      newAlarms.push({
        id: 'system-tank-low-critical',
        timestamp: now,
        severity: 'critical',
        category: 'system',
        source: 'Sistem',
        message: `Kritik tank seviyesi: %${system.tankLevel.toFixed(0)} (Minimum: %20)`,
        acknowledged: false,
        autoResolve: false
      });
    } else if (system.tankLevel < 30) {
      newAlarms.push({
        id: 'system-tank-low-warning',
        timestamp: now,
        severity: 'warning',
        category: 'system',
        source: 'Sistem',
        message: `Düşük tank seviyesi: %${system.tankLevel.toFixed(0)}`,
        acknowledged: false,
        autoResolve: true,
        duration: 10000
      });
    }
    
    if (system.oilTemperature > 70) {
      newAlarms.push({
        id: 'system-oil-temp-critical',
        timestamp: now,
        severity: 'critical',
        category: 'system',
        source: 'Sistem',
        message: `Kritik yağ sıcaklığı: ${system.oilTemperature.toFixed(1)}°C (Limit: 70°C)`,
        acknowledged: false,
        autoResolve: false
      });
    } else if (system.oilTemperature > 60) {
      newAlarms.push({
        id: 'system-oil-temp-warning',
        timestamp: now,
        severity: 'warning',
        category: 'system',
        source: 'Sistem',
        message: `Yüksek yağ sıcaklığı: ${system.oilTemperature.toFixed(1)}°C`,
        acknowledged: false,
        autoResolve: true,
        duration: 25000
      });
    }

    // Update alarms state, keeping acknowledged status
    setAlarms(prevAlarms => {
      const updatedAlarms = [...newAlarms];
      
      // Preserve acknowledged status
      prevAlarms.forEach(prevAlarm => {
        const existingAlarm = updatedAlarms.find(alarm => alarm.id === prevAlarm.id);
        if (existingAlarm && prevAlarm.acknowledged) {
          existingAlarm.acknowledged = true;
        }
      });
      
      // Add unresolved alarms that no longer have conditions
      prevAlarms.forEach(prevAlarm => {
        const stillExists = updatedAlarms.find(alarm => alarm.id === prevAlarm.id);
        if (!stillExists && !prevAlarm.autoResolve && prevAlarm.severity === 'critical') {
          updatedAlarms.push(prevAlarm);
        }
      });
      
      return updatedAlarms;
    });
  }, [motors, system]);

  // Auto-resolve alarms with duration
  useEffect(() => {
    const timer = setInterval(() => {
      setAlarms(prevAlarms => 
        prevAlarms.filter(alarm => {
          if (alarm.autoResolve && alarm.duration) {
            return Date.now() - alarm.timestamp < alarm.duration;
          }
          return true;
        })
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Filtered alarms
  const filteredAlarms = useMemo(() => {
    let filtered = alarms;
    
    switch (filter) {
      case 'critical':
        filtered = alarms.filter(alarm => alarm.severity === 'critical');
        break;
      case 'warning':
        filtered = alarms.filter(alarm => alarm.severity === 'warning');
        break;
      case 'unacknowledged':
        filtered = alarms.filter(alarm => !alarm.acknowledged);
        break;
      default:
        filtered = alarms;
    }
    
    // Sort by severity and timestamp
    return filtered.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });
  }, [alarms, filter]);

  // Alarm statistics
  const stats = useMemo(() => {
    const critical = alarms.filter(alarm => alarm.severity === 'critical').length;
    const warning = alarms.filter(alarm => alarm.severity === 'warning').length;
    const info = alarms.filter(alarm => alarm.severity === 'info').length;
    const unacknowledged = alarms.filter(alarm => !alarm.acknowledged).length;
    
    return { critical, warning, info, unacknowledged, total: alarms.length };
  }, [alarms]);

  const acknowledgeAlarm = (alarmId: string) => {
    setAlarms(prevAlarms =>
      prevAlarms.map(alarm =>
        alarm.id === alarmId ? { ...alarm, acknowledged: true } : alarm
      )
    );
  };

  const acknowledgeAll = () => {
    setAlarms(prevAlarms =>
      prevAlarms.map(alarm => ({ ...alarm, acknowledged: true }))
    );
  };

  const clearResolved = () => {
    setAlarms(prevAlarms =>
      prevAlarms.filter(alarm => alarm.severity === 'critical' || !alarm.acknowledged)
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'motor': return '⚙️';
      case 'system': return '🏭';
      case 'safety': return '⚠️';
      case 'maintenance': return '🔧';
      default: return '📋';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  return (
    <div className={`enhanced-alarm-panel ${expanded ? 'expanded' : ''}`}>
      {/* Alarm Header */}
      <div className="alarm-header">
        <div className="alarm-title">
          <span className="alarm-icon">🚨</span>
          <span>Alarm Yönetimi</span>
          <button 
            className="expand-button"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Küçült" : "Genişlet"}
          >
            {expanded ? "▼" : "▲"}
          </button>
        </div>
        
        <div className="alarm-stats">
          <div className={`stat critical ${stats.critical > 0 ? 'active' : ''}`}>
            <span className="stat-icon">🚨</span>
            <span className="stat-count">{stats.critical}</span>
          </div>
          <div className={`stat warning ${stats.warning > 0 ? 'active' : ''}`}>
            <span className="stat-icon">⚠️</span>
            <span className="stat-count">{stats.warning}</span>
          </div>
          <div className={`stat info ${stats.info > 0 ? 'active' : ''}`}>
            <span className="stat-icon">ℹ️</span>
            <span className="stat-count">{stats.info}</span>
          </div>
          <div className={`stat unacknowledged ${stats.unacknowledged > 0 ? 'active' : ''}`}>
            <span className="stat-icon">🔔</span>
            <span className="stat-count">{stats.unacknowledged}</span>
          </div>
        </div>
        
        <div className="alarm-controls">
          <button
            className={`sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button className="acknowledge-all-btn" onClick={acknowledgeAll}>
            Tümünü Onayla
          </button>
          <button className="clear-resolved-btn" onClick={clearResolved}>
            Çözülenleri Temizle
          </button>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="alarm-filters">
        {['all', 'critical', 'warning', 'unacknowledged'].map(filterType => (
          <button
            key={filterType}
            className={`filter-tab ${filter === filterType ? 'active' : ''}`}
            onClick={() => setFilter(filterType as typeof filter)}
          >
            {filterType === 'all' ? 'Tümü' :
             filterType === 'critical' ? 'Kritik' :
             filterType === 'warning' ? 'Uyarı' : 'Onaylanmamış'}
            <span className="filter-count">
              {filterType === 'all' ? stats.total :
               filterType === 'critical' ? stats.critical :
               filterType === 'warning' ? stats.warning : stats.unacknowledged}
            </span>
          </button>
        ))}
      </div>
      
      {/* Alarm List */}
      <div className={`alarm-list ${expanded ? 'expanded' : ''}`}>
        {filteredAlarms.length === 0 ? (
          <div className="no-alarms">
            <span className="no-alarms-icon">✅</span>
            <span>Aktif alarm bulunmuyor</span>
          </div>
        ) : (
          filteredAlarms.map(alarm => (
            <div
              key={alarm.id}
              className={`alarm-item ${alarm.severity} ${alarm.acknowledged ? 'acknowledged' : 'unacknowledged'}`}
            >
              <div className="alarm-item-header">
                <div className="alarm-icons">
                  <span className="severity-icon">{getSeverityIcon(alarm.severity)}</span>
                  <span className="category-icon">{getCategoryIcon(alarm.category)}</span>
                </div>
                
                <div className="alarm-source">{alarm.source}</div>
                
                <div className="alarm-timestamp">
                  {new Date(alarm.timestamp).toLocaleTimeString('tr-TR')}
                </div>
                
                {!alarm.acknowledged && (
                  <button
                    className="acknowledge-btn"
                    onClick={() => acknowledgeAlarm(alarm.id)}
                    title="Alarmı Onayla"
                  >
                    ✓
                  </button>
                )}
              </div>
              
              <div className="alarm-message">
                {alarm.message}
              </div>
              
              {alarm.autoResolve && alarm.duration && (
                <div className="alarm-countdown">
                  <div 
                    className="countdown-bar"
                    style={{
                      width: `${Math.max(0, 100 - ((Date.now() - alarm.timestamp) / alarm.duration) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedAlarmPanel;