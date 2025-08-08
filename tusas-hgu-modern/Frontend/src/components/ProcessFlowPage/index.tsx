import React, { useState, useEffect, useCallback } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import './ProcessFlowPage.css';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  componentType: string;
  motorId?: number;
}

interface TrendPoint {
  timestamp: number;
  value: number;
}

interface AlarmData {
  id: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  acknowledged: boolean;
}

const ProcessFlowPage: React.FC = () => {
  const { motors, system, isConnected, setConnection } = useOpcStore();
  const [animationSpeed, setAnimationSpeed] = useState(2);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [alarmAcknowledged, setAlarmAcknowledged] = useState<Set<string>>(new Set());
  const [systemMode, setSystemMode] = useState<'AUTO' | 'MANUAL' | 'MAINTENANCE'>('AUTO');
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({});
  const [alarms, setAlarms] = useState<AlarmData[]>([]);
  const [emergencyActive, setEmergencyActive] = useState(false);

  // Enhanced system calculations with error handling
  const activeMotorCount = Object.values(motors).filter(m => m.enabled && m.status === 1).length;
  const totalFlow = system?.totalFlow || Object.values(motors).reduce((sum, m) => sum + (m.enabled ? m.flow : 0), 0);
  const totalPressure = system?.totalPressure || Math.max(...Object.values(motors).map(m => m.pressure), 0);
  const tankLevel = system?.tankLevel || 75;
  const oilTemp = system?.oilTemperature || 55;
  const systemEfficiency = activeMotorCount > 0 ? (totalFlow / (activeMotorCount * 75)) * 100 : 0;

  // Enhanced system health analysis
  const systemHealth = {
    overall: (() => {
      if (emergencyActive) return 'emergency';
      if (totalPressure < 80 || oilTemp > 70 || tankLevel < 15 || totalFlow < 200) return 'error';
      if (totalPressure < 100 || oilTemp > 60 || tankLevel < 30 || totalFlow < 350) return 'warning';
      return 'good';
    })(),
    score: Math.min(100, Math.max(0, 
      (totalPressure / 150) * 25 + 
      (Math.max(0, 100 - oilTemp) / 100) * 25 +
      (tankLevel / 100) * 25 + 
      (totalFlow / 500) * 25
    ))
  };

  // Real-time alarm generation with enhanced logic
  useEffect(() => {
    const newAlarms: AlarmData[] = [];
    
    if (emergencyActive) {
      newAlarms.push({
        id: 'emergency-active',
        message: 'EMERGENCY STOP ACTIVATED',
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: false
      });
    }

    if (totalPressure < 70) {
      newAlarms.push({
        id: 'critical-pressure',
        message: `CRITICAL: System Pressure Low (${totalPressure.toFixed(1)} bar)`,
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('critical-pressure')
      });
    } else if (totalPressure < 100) {
      newAlarms.push({
        id: 'low-pressure',
        message: `WARNING: System Pressure Low (${totalPressure.toFixed(1)} bar)`,
        severity: 'high',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('low-pressure')
      });
    }

    if (oilTemp > 75) {
      newAlarms.push({
        id: 'critical-temp',
        message: `CRITICAL: Oil Temperature High (${oilTemp.toFixed(1)}°C)`,
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('critical-temp')
      });
    } else if (oilTemp > 65) {
      newAlarms.push({
        id: 'high-temp',
        message: `WARNING: Oil Temperature High (${oilTemp.toFixed(1)}°C)`,
        severity: 'medium',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('high-temp')
      });
    }

    if (tankLevel < 10) {
      newAlarms.push({
        id: 'critical-level',
        message: `CRITICAL: Oil Level Very Low (${tankLevel.toFixed(1)}%)`,
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('critical-level')
      });
    } else if (tankLevel < 25) {
      newAlarms.push({
        id: 'low-level',
        message: `WARNING: Oil Level Low (${tankLevel.toFixed(1)}%)`,
        severity: 'medium',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('low-level')
      });
    }

    if (totalFlow < 200 && activeMotorCount > 0) {
      newAlarms.push({
        id: 'critical-flow',
        message: `CRITICAL: System Flow Very Low (${totalFlow.toFixed(1)} L/min)`,
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('critical-flow')
      });
    } else if (totalFlow < 350 && activeMotorCount > 0) {
      newAlarms.push({
        id: 'low-flow',
        message: `WARNING: System Flow Low (${totalFlow.toFixed(1)} L/min)`,
        severity: 'high',
        timestamp: new Date(),
        acknowledged: alarmAcknowledged.has('low-flow')
      });
    }

    // Motor-specific alarms
    Object.entries(motors).forEach(([id, motor]) => {
      if (motor.status === 3) { // Error state
        newAlarms.push({
          id: `motor-${id}-error`,
          message: `MOTOR ${id}: System Error`,
          severity: 'high',
          timestamp: new Date(),
          acknowledged: alarmAcknowledged.has(`motor-${id}-error`)
        });
      } else if (motor.status === 2) { // Warning state
        newAlarms.push({
          id: `motor-${id}-warning`,
          message: `MOTOR ${id}: System Warning`,
          severity: 'medium',
          timestamp: new Date(),
          acknowledged: alarmAcknowledged.has(`motor-${id}-warning`)
        });
      }

      if (motor.temperature > 80) {
        newAlarms.push({
          id: `motor-${id}-temp`,
          message: `MOTOR ${id}: High Temperature (${motor.temperature.toFixed(1)}°C)`,
          severity: 'medium',
          timestamp: new Date(),
          acknowledged: alarmAcknowledged.has(`motor-${id}-temp`)
        });
      }

      if (motor.lineFilter === 0 || motor.suctionFilter === 0) {
        newAlarms.push({
          id: `motor-${id}-filter`,
          message: `MOTOR ${id}: Filter Error - Replace Required`,
          severity: 'high',
          timestamp: new Date(),
          acknowledged: alarmAcknowledged.has(`motor-${id}-filter`)
        });
      }
    });

    setAlarms(newAlarms);
  }, [motors, system, totalPressure, oilTemp, tankLevel, totalFlow, activeMotorCount, emergencyActive, alarmAcknowledged]);

  // Enhanced flow animation speed calculation
  useEffect(() => {
    const speed = Math.max(0.5, Math.min(5, 5 - (totalFlow / 150)));
    setAnimationSpeed(speed);

    // Update trend data with enhanced sampling
    const now = Date.now();
    setTrends(prev => {
      const newTrends = { ...prev };
      const maxPoints = 100;
      
      ['pressure', 'flow', 'temperature', 'efficiency', 'tankLevel'].forEach(key => {
        if (!newTrends[key]) newTrends[key] = [];
      });
      
      newTrends.pressure.push({ timestamp: now, value: totalPressure });
      newTrends.flow.push({ timestamp: now, value: totalFlow });
      newTrends.temperature.push({ timestamp: now, value: oilTemp });
      newTrends.efficiency.push({ timestamp: now, value: systemEfficiency });
      newTrends.tankLevel.push({ timestamp: now, value: tankLevel });
      
      // Maintain rolling window
      Object.keys(newTrends).forEach(key => {
        if (newTrends[key].length > maxPoints) {
          newTrends[key] = newTrends[key].slice(-maxPoints);
        }
      });
      
      return newTrends;
    });
  }, [totalFlow, totalPressure, oilTemp, systemEfficiency, tankLevel]);

  // Enhanced component interaction handlers
  const handleComponentClick = useCallback((componentId: string) => {
    setSelectedComponent(componentId);
    if (['emergency', 'system-control', 'alarms'].includes(componentId) || componentId.startsWith('motor-')) {
      setControlPanelOpen(true);
    }
  }, []);

  const handleMotorToggle = useCallback(async (motorId: number) => {
    const currentMotor = motors[motorId];
    if (currentMotor && systemMode === 'MANUAL' && !emergencyActive) {
      try {
        await opcApi.writeVariable(`MOTOR_${motorId}_ENABLE_EXECUTION`, !currentMotor.enabled);
      } catch (error) {
        console.error('Failed to toggle motor:', error);
      }
    }
  }, [motors, systemMode, emergencyActive]);

  const handleSetpointChange = useCallback(async (motorId: number, type: 'pressure' | 'flow', value: number) => {
    if (systemMode === 'MANUAL' && !emergencyActive) {
      try {
        const variable = type === 'pressure' 
          ? `MOTOR_${motorId}_PRESSURE_SETPOINT` 
          : `MOTOR_${motorId}_FLOW_SETPOINT`;
        await opcApi.writeVariable(variable, value);
      } catch (error) {
        console.error('Failed to set setpoint:', error);
      }
    }
  }, [systemMode, emergencyActive]);

  const handleEmergencyStop = useCallback(async () => {
    try {
      setEmergencyActive(true);
      // Stop all motors
      for (let i = 1; i <= 7; i++) {
        await opcApi.writeVariable(`MOTOR_${i}_ENABLE_EXECUTION`, false);
      }
      await opcApi.writeVariable('SYSTEM_EMERGENCY_STOP', true);
      setSystemMode('MANUAL');
    } catch (error) {
      console.error('Emergency stop failed:', error);
    }
  }, []);

  const handleEmergencyReset = useCallback(async () => {
    try {
      await opcApi.writeVariable('SYSTEM_EMERGENCY_STOP', false);
      setEmergencyActive(false);
    } catch (error) {
      console.error('Emergency reset failed:', error);
    }
  }, []);

  const acknowledgeAlarm = useCallback((alarmId: string) => {
    setAlarmAcknowledged(prev => new Set(prev).add(alarmId));
  }, []);

  const acknowledgeAllAlarms = useCallback(() => {
    setAlarmAcknowledged(new Set(alarms.map(a => a.id)));
  }, [alarms]);

  // Enhanced trend sparkline component
  const renderTrendSparkline = useCallback((data: TrendPoint[], color: string, width = 60, height = 20) => {
    if (!data || data.length < 2) return null;
    
    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;
    
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minValue) / valueRange) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="trend-sparkline">
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.9"
        />
        <polyline
          points={`${points} ${width},${height} 0,${height}`}
          fill={`url(#gradient-${color.replace('#', '')})`}
          stroke="none"
          opacity="0.3"
        />
      </svg>
    );
  }, []);

  // Enhanced Control Panel Component
  const ControlPanel: React.FC<ControlPanelProps> = ({ isOpen, onClose, componentType, motorId }) => {
    if (!isOpen) return null;

    return (
      <div className="control-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="control-panel">
          <div className="control-panel-header">
            <h3 className="control-panel-title">
              {componentType === 'emergency' ? '🚨 EMERGENCY CONTROLS' :
               componentType === 'system-control' ? '⚙️ SYSTEM CONTROLS' :
               componentType === 'alarms' ? '⚠️ ALARM MANAGEMENT' :
               motorId ? `🔧 MOTOR ${motorId} CONTROLS` : '📊 COMPONENT CONTROLS'}
            </h3>
            <button className="control-close-button" onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="control-panel-content">
            {componentType === 'emergency' && (
              <div className="emergency-controls">
                <div className="emergency-status">
                  <div className={`emergency-indicator ${emergencyActive ? 'active' : ''}`}>
                    <span className="emergency-light"></span>
                    <span className="emergency-text">
                      {emergencyActive ? 'EMERGENCY ACTIVE' : 'SYSTEM NORMAL'}
                    </span>
                  </div>
                </div>

                <div className="emergency-buttons">
                  {!emergencyActive ? (
                    <button className="emergency-stop-button" onClick={handleEmergencyStop}>
                      <span className="button-icon">🛑</span>
                      <span className="button-text">EMERGENCY STOP</span>
                      <span className="button-subtitle">Stop All Systems</span>
                    </button>
                  ) : (
                    <button className="emergency-reset-button" onClick={handleEmergencyReset}>
                      <span className="button-icon">🔄</span>
                      <span className="button-text">RESET EMERGENCY</span>
                      <span className="button-subtitle">Acknowledge & Reset</span>
                    </button>
                  )}
                </div>

                <div className="emergency-info">
                  <h4>Emergency Procedures:</h4>
                  <ul>
                    <li>• All motors will stop immediately</li>
                    <li>• System enters manual mode</li>
                    <li>• Pressure relief valves activate</li>
                    <li>• Alarms will be triggered</li>
                  </ul>
                </div>
              </div>
            )}

            {componentType === 'system-control' && (
              <div className="system-controls">
                <div className="system-mode-panel">
                  <h4>Operating Mode</h4>
                  <div className="mode-controls">
                    {(['AUTO', 'MANUAL', 'MAINTENANCE'] as const).map(mode => (
                      <button 
                        key={mode}
                        className={`mode-button ${systemMode === mode ? 'active' : ''} ${emergencyActive ? 'disabled' : ''}`}
                        onClick={() => !emergencyActive && setSystemMode(mode)}
                        disabled={emergencyActive}
                      >
                        <span className="mode-icon">
                          {mode === 'AUTO' ? '🔄' : mode === 'MANUAL' ? '👤' : '🔧'}
                        </span>
                        <span className="mode-label">{mode}</span>
                        <span className="mode-description">
                          {mode === 'AUTO' ? 'Automatic Operation' : 
                           mode === 'MANUAL' ? 'Manual Control' : 'Maintenance Mode'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="system-status-grid">
                  <div className="status-card">
                    <h4>System Health</h4>
                    <div className={`health-indicator ${systemHealth.overall}`}>
                      <div className="health-circle">
                        <span className="health-percentage">{systemHealth.score.toFixed(0)}%</span>
                      </div>
                      <span className="health-label">{systemHealth.overall.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="status-card">
                    <h4>Active Alarms</h4>
                    <div className="alarm-count-display">
                      <span className={`alarm-count ${alarms.length > 0 ? 'has-alarms' : ''}`}>
                        {alarms.length}
                      </span>
                      <button 
                        className="acknowledge-all-button"
                        onClick={acknowledgeAllAlarms}
                        disabled={alarms.length === 0}
                      >
                        ACK ALL
                      </button>
                    </div>
                  </div>

                  <div className="status-card">
                    <h4>System Efficiency</h4>
                    <div className="efficiency-display">
                      <span className="efficiency-value">{systemEfficiency.toFixed(1)}%</span>
                      {renderTrendSparkline(trends.efficiency, '#06b6d4', 80, 25)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {componentType === 'alarms' && (
              <div className="alarm-management">
                <div className="alarm-summary">
                  <div className="alarm-stats">
                    <div className="alarm-stat critical">
                      <span className="stat-count">{alarms.filter(a => a.severity === 'critical').length}</span>
                      <span className="stat-label">Critical</span>
                    </div>
                    <div className="alarm-stat high">
                      <span className="stat-count">{alarms.filter(a => a.severity === 'high').length}</span>
                      <span className="stat-label">High</span>
                    </div>
                    <div className="alarm-stat medium">
                      <span className="stat-count">{alarms.filter(a => a.severity === 'medium').length}</span>
                      <span className="stat-label">Medium</span>
                    </div>
                  </div>
                </div>

                <div className="alarm-list">
                  {alarms.length === 0 ? (
                    <div className="no-alarms">
                      <span className="no-alarms-icon">✅</span>
                      <span className="no-alarms-text">No Active Alarms</span>
                    </div>
                  ) : (
                    alarms.map(alarm => (
                      <div key={alarm.id} className={`alarm-item ${alarm.severity} ${alarm.acknowledged ? 'acknowledged' : ''}`}>
                        <div className="alarm-severity-indicator">
                          <div className={`severity-dot ${alarm.severity}`}></div>
                        </div>
                        <div className="alarm-content">
                          <div className="alarm-message">{alarm.message}</div>
                          <div className="alarm-timestamp">
                            {alarm.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        <button 
                          className={`alarm-ack-button ${alarm.acknowledged ? 'acknowledged' : ''}`}
                          onClick={() => acknowledgeAlarm(alarm.id)}
                          disabled={alarm.acknowledged}
                        >
                          {alarm.acknowledged ? '✓' : 'ACK'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {motorId && (
              <div className="motor-controls">
                <div className="motor-header">
                  <h4>Motor {motorId} {motorId === 7 ? '(Fixed Pump)' : ''}</h4>
                  <div className={`motor-status-badge ${motors[motorId]?.status === 1 ? 'running' : 
                                                       motors[motorId]?.status === 2 ? 'warning' : 
                                                       motors[motorId]?.status === 3 ? 'error' : 'ready'}`}>
                    {motors[motorId]?.status === 1 ? 'RUNNING' : 
                     motors[motorId]?.status === 2 ? 'WARNING' : 
                     motors[motorId]?.status === 3 ? 'ERROR' : 'READY'}
                  </div>
                </div>

                <div className="motor-control-grid">
                  <div className="motor-enable-control">
                    <label className="control-label">Motor Enable</label>
                    <div 
                      className={`motor-toggle ${motors[motorId]?.enabled ? 'enabled' : ''} ${systemMode !== 'MANUAL' || emergencyActive ? 'disabled' : ''}`}
                      onClick={() => systemMode === 'MANUAL' && !emergencyActive && handleMotorToggle(motorId)}
                    >
                      <div className="motor-toggle-slider"></div>
                      <span className="toggle-label">
                        {motors[motorId]?.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  <div className="setpoint-controls">
                    <div className="setpoint-control">
                      <label className="control-label">Pressure Setpoint (bar)</label>
                      <div className="setpoint-input-group">
                        <input
                          type="number"
                          className="setpoint-input"
                          value={motors[motorId]?.pressureSetpoint || 125}
                          onChange={(e) => handleSetpointChange(motorId, 'pressure', parseFloat(e.target.value))}
                          disabled={systemMode !== 'MANUAL' || emergencyActive}
                          min="50"
                          max="200"
                          step="5"
                        />
                        <div className="setpoint-buttons">
                          <button 
                            className="setpoint-adjust-button"
                            onClick={() => handleSetpointChange(motorId, 'pressure', (motors[motorId]?.pressureSetpoint || 125) + 5)}
                            disabled={systemMode !== 'MANUAL' || emergencyActive}
                          >+</button>
                          <button 
                            className="setpoint-adjust-button"
                            onClick={() => handleSetpointChange(motorId, 'pressure', (motors[motorId]?.pressureSetpoint || 125) - 5)}
                            disabled={systemMode !== 'MANUAL' || emergencyActive}
                          >-</button>
                        </div>
                      </div>
                    </div>

                    <div className="setpoint-control">
                      <label className="control-label">Flow Setpoint (L/min)</label>
                      <div className="setpoint-input-group">
                        <input
                          type="number"
                          className="setpoint-input"
                          value={motors[motorId]?.flowSetpoint || 75}
                          onChange={(e) => handleSetpointChange(motorId, 'flow', parseFloat(e.target.value))}
                          disabled={systemMode !== 'MANUAL' || emergencyActive}
                          min="10"
                          max="100"
                          step="1"
                        />
                        <div className="setpoint-buttons">
                          <button 
                            className="setpoint-adjust-button"
                            onClick={() => handleSetpointChange(motorId, 'flow', (motors[motorId]?.flowSetpoint || 75) + 1)}
                            disabled={systemMode !== 'MANUAL' || emergencyActive}
                          >+</button>
                          <button 
                            className="setpoint-adjust-button"
                            onClick={() => handleSetpointChange(motorId, 'flow', (motors[motorId]?.flowSetpoint || 75) - 1)}
                            disabled={systemMode !== 'MANUAL' || emergencyActive}
                          >-</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="motor-measurements">
                    <div className="measurement-grid">
                      <div className="measurement-item">
                        <span className="measurement-label">Current Pressure</span>
                        <span className="measurement-value">{motors[motorId]?.pressure?.toFixed(1) || '0.0'} bar</span>
                        {renderTrendSparkline(trends[`motor-${motorId}-pressure`] || [], '#ef4444', 60, 15)}
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-label">Flow Rate</span>
                        <span className="measurement-value">{motors[motorId]?.flow?.toFixed(1) || '0.0'} L/min</span>
                        {renderTrendSparkline(trends[`motor-${motorId}-flow`] || [], '#06b6d4', 60, 15)}
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-label">RPM</span>
                        <span className="measurement-value">{motors[motorId]?.rpm?.toFixed(0) || '0'}</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-label">Current</span>
                        <span className="measurement-value">{motors[motorId]?.current?.toFixed(1) || '0.0'} A</span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-label">Temperature</span>
                        <span className={`measurement-value ${motors[motorId]?.temperature > 70 ? 'high-temp' : ''}`}>
                          {motors[motorId]?.temperature?.toFixed(1) || '0.0'}°C
                        </span>
                      </div>
                      <div className="measurement-item">
                        <span className="measurement-label">Power</span>
                        <span className="measurement-value">
                          {((motors[motorId]?.current || 0) * 400 * 1.732 * 0.85 / 1000).toFixed(1)} kW
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="motor-actions">
                    <button 
                      className="action-button leak-test"
                      onClick={() => opcApi.writeVariable(`MOTOR_${motorId}_LEAK_EXECUTION`, 1)}
                      disabled={systemMode === 'AUTO' || !motors[motorId]?.enabled || emergencyActive}
                    >
                      🔍 Start Leak Test
                    </button>
                    
                    <button 
                      className="action-button valve-control"
                      onClick={() => opcApi.writeVariable(`MOTOR_${motorId}_VALVE_EXECUTION`, !motors[motorId]?.valve)}
                      disabled={systemMode !== 'MANUAL' || emergencyActive}
                    >
                      {motors[motorId]?.valve ? '🔒 Close Valve' : '🔓 Open Valve'}
                    </button>
                  </div>

                  <div className="filter-status">
                    <div className="filter-item">
                      <span className="filter-label">Line Filter</span>
                      <div className={`filter-status-indicator ${
                        motors[motorId]?.lineFilter === 0 ? 'error' : 
                        motors[motorId]?.lineFilter === 1 ? 'warning' : 'normal'
                      }`}>
                        {motors[motorId]?.lineFilter === 0 ? 'ERROR' : 
                         motors[motorId]?.lineFilter === 1 ? 'REPLACE' : 'OK'}
                      </div>
                    </div>
                    <div className="filter-item">
                      <span className="filter-label">Suction Filter</span>
                      <div className={`filter-status-indicator ${
                        motors[motorId]?.suctionFilter === 0 ? 'error' : 
                        motors[motorId]?.suctionFilter === 1 ? 'warning' : 'normal'
                      }`}>
                        {motors[motorId]?.suctionFilter === 0 ? 'ERROR' : 
                         motors[motorId]?.suctionFilter === 1 ? 'REPLACE' : 'OK'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="process-flow-page">
      {/* Enhanced Header with System Status */}
      <div className="flow-header">
        <div className="header-title-section">
          <div className="system-title">
            <h1>TUSAŞ HGU HYDRAULIC CONTROL SYSTEM</h1>
            <div className="system-subtitle">Process Flow Visualization • SCADA v2.1</div>
          </div>
          <div className="connection-status">
            <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="connection-dot"></div>
              <span className="connection-text">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          <button 
            className={`system-mode-indicator ${systemMode.toLowerCase()}`}
            onClick={() => handleComponentClick('system-control')}
          >
            <span className="mode-icon">
              {systemMode === 'AUTO' ? '🔄' : systemMode === 'MANUAL' ? '👤' : '🔧'}
            </span>
            <span className="mode-text">{systemMode}</span>
          </button>

          <button 
            className={`alarm-indicator ${alarms.length > 0 ? 'has-alarms' : ''}`}
            onClick={() => handleComponentClick('alarms')}
          >
            <span className="alarm-icon">⚠️</span>
            <span className="alarm-count">{alarms.length}</span>
            <span className="alarm-text">ALARMS</span>
          </button>

          <button 
            className={`emergency-indicator ${emergencyActive ? 'active' : ''}`}
            onClick={() => handleComponentClick('emergency')}
          >
            <span className="emergency-icon">🚨</span>
            <span className="emergency-text">{emergencyActive ? 'E-STOP' : 'EMERGENCY'}</span>
          </button>
        </div>
      </div>

      {/* Critical Alarm Banner */}
      {alarms.some(a => a.severity === 'critical' && !a.acknowledged) && (
        <div className="critical-alarm-banner">
          <div className="banner-content">
            <span className="banner-icon">🚨</span>
            <span className="banner-text">
              CRITICAL ALARM ACTIVE - IMMEDIATE ATTENTION REQUIRED
            </span>
            <button 
              className="banner-button"
              onClick={() => handleComponentClick('alarms')}
            >
              VIEW ALARMS
            </button>
          </div>
        </div>
      )}

      {/* System Indicators Panel */}
      <div className="system-indicators">
        <div className="indicator-group">
          <div className="indicator" onClick={() => handleComponentClick('system-control')}>
            <div className="indicator-header">
              <span className="indicator-icon">⚙️</span>
              <span className="indicator-title">System Health</span>
            </div>
            <div className={`indicator-value ${systemHealth.overall}`}>
              {systemHealth.score.toFixed(0)}%
            </div>
            <div className={`indicator-status ${systemHealth.overall}`}>
              {systemHealth.overall.toUpperCase()}
            </div>
          </div>

          <div className="indicator">
            <div className="indicator-header">
              <span className="indicator-icon">🔧</span>
              <span className="indicator-title">Active Motors</span>
            </div>
            <div className="indicator-value">{activeMotorCount}/7</div>
            <div className="indicator-status">MOTORS</div>
          </div>

          <div className="indicator">
            <div className="indicator-header">
              <span className="indicator-icon">💧</span>
              <span className="indicator-title">Total Flow</span>
            </div>
            <div className="indicator-value">{totalFlow.toFixed(0)}</div>
            <div className="indicator-unit">L/min</div>
            {renderTrendSparkline(trends.flow, '#06b6d4', 80, 20)}
          </div>

          <div className="indicator">
            <div className="indicator-header">
              <span className="indicator-icon">📊</span>
              <span className="indicator-title">Pressure</span>
            </div>
            <div className={`indicator-value ${totalPressure < 100 ? 'warning' : ''}`}>
              {totalPressure.toFixed(0)}
            </div>
            <div className="indicator-unit">bar</div>
            {renderTrendSparkline(trends.pressure, '#ef4444', 80, 20)}
          </div>

          <div className="indicator">
            <div className="indicator-header">
              <span className="indicator-icon">🌡️</span>
              <span className="indicator-title">Oil Temp</span>
            </div>
            <div className={`indicator-value ${oilTemp > 65 ? 'warning' : ''}`}>
              {oilTemp.toFixed(0)}
            </div>
            <div className="indicator-unit">°C</div>
            {renderTrendSparkline(trends.temperature, '#f59e0b', 80, 20)}
          </div>

          <div className="indicator">
            <div className="indicator-header">
              <span className="indicator-icon">🪣</span>
              <span className="indicator-title">Tank Level</span>
            </div>
            <div className={`indicator-value ${tankLevel < 25 ? 'warning' : ''}`}>
              {tankLevel.toFixed(0)}
            </div>
            <div className="indicator-unit">%</div>
            {renderTrendSparkline(trends.tankLevel, '#22c55e', 80, 20)}
          </div>
        </div>
      </div>

      {/* Main Process Flow Diagram */}
      <div className="flow-diagram-container">
        <svg className="flow-diagram" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
          {/* Enhanced Definitions and Patterns */}
          <defs>
            {/* Grid patterns */}
            <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(96, 160, 255, 0.08)" strokeWidth="1"/>
            </pattern>
            <pattern id="minorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(96, 160, 255, 0.03)" strokeWidth="0.5"/>
            </pattern>

            {/* Enhanced flow animations */}
            <linearGradient id="flowActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
              <stop offset="30%" stopColor="rgba(6, 182, 212, 0.9)" />
              <stop offset="70%" stopColor="rgba(6, 182, 212, 0.9)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
            </linearGradient>

            <linearGradient id="pressureActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0)" />
              <stop offset="30%" stopColor="rgba(239, 68, 68, 0.9)" />
              <stop offset="70%" stopColor="rgba(239, 68, 68, 0.9)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
            </linearGradient>

            {/* Status-based gradients */}
            <linearGradient id="tankGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={tankLevel > 50 ? "#22c55e" : tankLevel > 25 ? "#f59e0b" : "#ef4444"} />
              <stop offset="100%" stopColor={tankLevel > 50 ? "#16a34a" : tankLevel > 25 ? "#d97706" : "#dc2626"} />
            </linearGradient>

            <linearGradient id="pressureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={totalPressure > 120 ? "#22c55e" : totalPressure > 80 ? "#f59e0b" : "#ef4444"} />
              <stop offset="100%" stopColor={totalPressure > 120 ? "#16a34a" : totalPressure > 80 ? "#d97706" : "#dc2626"} />
            </linearGradient>

            {/* Enhanced arrow markers */}
            <marker id="flowArrow" markerWidth="16" markerHeight="10" refX="15" refY="5" orient="auto">
              <polygon points="0 0, 16 5, 0 10" fill="#06b6d4" stroke="#0891b2" strokeWidth="1"/>
              <polygon points="2 2, 14 5, 2 8" fill="#67e8f9" opacity="0.7"/>
            </marker>

            <marker id="pressureArrow" markerWidth="16" markerHeight="10" refX="15" refY="5" orient="auto">
              <polygon points="0 0, 16 5, 0 10" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
              <polygon points="2 2, 14 5, 2 8" fill="#fca5a5" opacity="0.7"/>
            </marker>

            {/* Enhanced glow filters */}
            <filter id="statusGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feMorphology operator="dilate" radius="2"/>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="errorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feMorphology operator="dilate" radius="3"/>
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feColorMatrix values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="criticalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feMorphology operator="dilate" radius="4"/>
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feColorMatrix values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
              <animate attributeName="stdDeviation" values="8;12;8" dur="1s" repeatCount="indefinite" />
            </filter>
          </defs>

          {/* Background grids */}
          <rect width="1600" height="900" fill="url(#minorGrid)" />
          <rect width="1600" height="900" fill="url(#majorGrid)" />

          {/* Enhanced Main Oil Tank */}
          <g className="oil-tank-system" onClick={() => handleComponentClick('tank')}>
            {/* Tank structure with enhanced styling */}
            <rect x="80" y="300" width="220" height="350" 
                  fill="rgba(13, 18, 22, 0.9)" 
                  stroke={tankLevel < 15 ? "#ef4444" : tankLevel < 30 ? "#f59e0b" : "rgba(96, 160, 255, 0.6)"} 
                  strokeWidth={tankLevel < 15 ? "4" : tankLevel < 30 ? "3" : "2"} 
                  rx="15"
                  filter={tankLevel < 15 ? "url(#criticalGlow)" : tankLevel < 30 ? "url(#errorGlow)" : "url(#statusGlow)"} />
            
            {/* Enhanced oil level with animation */}
            <rect x="90" y={640 - (tankLevel * 3.2)} width="200" height={tankLevel * 3.2} 
                  fill="url(#tankGradient)"
                  opacity="0.8"
                  className="oil-level">
              <animate attributeName="opacity" values="0.8;0.9;0.8" dur="3s" repeatCount="indefinite" />
            </rect>
            
            {/* Oil surface with realistic animation */}
            <ellipse cx="190" cy={640 - (tankLevel * 3.2)} rx="100" ry="6"
                     fill={tankLevel > 50 ? "rgba(34, 197, 94, 0.6)" : tankLevel > 25 ? "rgba(245, 158, 11, 0.6)" : "rgba(239, 68, 68, 0.6)"}>
              <animate attributeName="ry" values="6;8;6" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.8;0.6" dur="2s" repeatCount="indefinite" />
            </ellipse>
            
            {/* Tank labels and real-time data */}
            <text x="190" y="280" className="component-label-large">MAIN HYDRAULIC TANK</text>
            <text x="190" y="295" className="component-subtitle">1000L Capacity • ISO VG 46</text>
            
            {/* Multi-line data display */}
            <text x="190" y={450 - (tankLevel * 0.5)} className="tank-level-value">{tankLevel.toFixed(1)}%</text>
            <text x="190" y={470 - (tankLevel * 0.5)} className="tank-level-liters">{(tankLevel * 10).toFixed(0)}L</text>
            
            {/* Temperature display with status coloring */}
            <text x="190" y={520} className={`tank-temp-value ${oilTemp > 70 ? 'critical' : oilTemp > 60 ? 'warning' : 'normal'}`}>
              {oilTemp.toFixed(1)}°C
            </text>
            <text x="190" y="540" className="component-unit">Oil Temperature</text>
            
            {/* Enhanced level sensors */}
            <g className="level-sensors">
              {/* High level sensor */}
              <circle cx="280" cy="380" r="8" 
                      fill={tankLevel > 80 ? "#22c55e" : "#64748b"} 
                      className="level-sensor high">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="295" y="385" className="sensor-label">H</text>
              
              {/* Normal level sensor */}
              <circle cx="280" cy="480" r="8" 
                      fill={tankLevel > 50 ? "#22c55e" : "#64748b"} 
                      className="level-sensor normal">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <text x="295" y="485" className="sensor-label">N</text>
              
              {/* Low level sensor */}
              <circle cx="280" cy="580" r="8" 
                      fill={tankLevel > 25 ? "#22c55e" : "#f59e0b"} 
                      className="level-sensor low">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <text x="295" y="585" className="sensor-label">L</text>
              
              {/* Critical level sensor */}
              <circle cx="280" cy="620" r="8" 
                      fill={tankLevel > 15 ? "#22c55e" : "#ef4444"} 
                      className="level-sensor critical"
                      filter={tankLevel < 15 ? "url(#criticalGlow)" : "none"}>
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
              <text x="295" y="625" className="sensor-label">C</text>
            </g>

            {/* Tank accessories */}
            <g className="tank-accessories">
              {/* Breather cap */}
              <rect x="180" y="280" width="20" height="15" fill="#64748b" rx="2" />
              <line x1="190" y1="280" x2="190" y2="270" stroke="#64748b" strokeWidth="2" />
              
              {/* Drain valve */}
              <circle cx="190" cy="670" r="10" fill="#64748b" />
              <text x="205" y="675" className="component-label">DRAIN</text>
            </g>
          </g>

          {/* Enhanced Motor/Pump Units with Professional Styling */}
          {[1, 2, 3, 4, 5, 6, 7].map((motorId, index) => {
            const yPos = 180 + (index * 90);
            const motor = motors[motorId];
            const isActive = motor?.enabled && motor?.status === 1;
            const isSpecial = motorId === 7;
            const hasError = motor?.status === 3;
            const hasWarning = motor?.status === 2;
            const hasCriticalTemp = motor?.temperature > 80;
            const hasFilterIssue = motor?.lineFilter === 0 || motor?.suctionFilter === 0;
            
            return (
              <g key={`motor-${motorId}`} className="motor-assembly">
                {/* Enhanced Motor Housing */}
                <rect x="420" y={yPos - 35} width="140" height="70" 
                      fill={hasError ? "rgba(239, 68, 68, 0.2)" : 
                            hasWarning || hasCriticalTemp ? "rgba(245, 158, 11, 0.2)" :
                            isActive ? "rgba(34, 197, 94, 0.2)" : "rgba(71, 85, 105, 0.3)"}
                      stroke={hasError ? "#ef4444" : 
                             hasWarning || hasCriticalTemp ? "#f59e0b" :
                             isActive ? "#22c55e" : "#64748b"}
                      strokeWidth={hasError ? "4" : hasWarning || hasCriticalTemp ? "3" : "2"}
                      rx="10"
                      filter={hasError ? "url(#criticalGlow)" : 
                             hasWarning || hasCriticalTemp ? "url(#errorGlow)" :
                             isActive ? "url(#statusGlow)" : "none"} />
                
                {/* Motor nameplate */}
                <rect x="430" y={yPos - 25} width="120" height="50" 
                      fill="rgba(13, 18, 22, 0.9)" 
                      stroke="rgba(96, 160, 255, 0.3)" 
                      strokeWidth="1" 
                      rx="5" />
                
                {/* Enhanced Motor Icon */}
                <circle cx="490" cy={yPos} r="28"
                        fill={hasError ? "rgba(239, 68, 68, 0.4)" :
                              hasWarning || hasCriticalTemp ? "rgba(245, 158, 11, 0.4)" :
                              isActive ? "rgba(34, 197, 94, 0.4)" : "rgba(71, 85, 105, 0.3)"}
                        stroke={hasError ? "#ef4444" : 
                               hasWarning || hasCriticalTemp ? "#f59e0b" :
                               isActive ? "#22c55e" : "#64748b"}
                        strokeWidth="3" />
                
                {/* Motor rotor with enhanced animation */}
                <circle cx="490" cy={yPos} r="16"
                        fill={hasError ? "#ef4444" : 
                              hasWarning || hasCriticalTemp ? "#f59e0b" :
                              isActive ? "#22c55e" : "#64748b"}
                        className={isActive ? "motor-rotor spinning-fast" : "motor-rotor"} />
                
                {/* Motor stator windings */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <line key={i}
                        x1={490} y1={yPos}
                        x2={490 + 18 * Math.cos(angle * Math.PI / 180)}
                        y2={yPos + 18 * Math.sin(angle * Math.PI / 180)}
                        stroke={hasError ? "#ef4444" : 
                               hasWarning || hasCriticalTemp ? "#f59e0b" :
                               isActive ? "#22c55e" : "#64748b"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={isActive ? "motor-winding spinning-fast" : "motor-winding"} />
                ))}
                
                {/* Motor Labels and Data */}
                <text x="490" y={yPos - 50} className="motor-title">
                  {isSpecial ? "FIXED DISPLACEMENT PUMP" : `VARIABLE MOTOR ${motorId}`}
                </text>
                <text x="490" y={yPos - 35} className="motor-spec">75kW • 3-Phase • 400V</text>
                
                {/* Real-time measurements */}
                <text x="430" y={yPos + 5} className="motor-data-label">P:</text>
                <text x="445" y={yPos + 5} className="motor-data-value">{motor?.pressure?.toFixed(0) || '0'}</text>
                <text x="470" y={yPos + 5} className="motor-data-unit">bar</text>
                
                <text x="430" y={yPos + 18} className="motor-data-label">F:</text>
                <text x="445" y={yPos + 18} className="motor-data-value">{motor?.flow?.toFixed(0) || '0'}</text>
                <text x="470" y={yPos + 18} className="motor-data-unit">L/m</text>
                
                <text x="510" y={yPos + 5} className="motor-data-label">RPM:</text>
                <text x="535" y={yPos + 5} className="motor-data-value">{motor?.rpm?.toFixed(0) || '0'}</text>
                
                <text x="510" y={yPos + 18} className="motor-data-label">T:</text>
                <text x="525" y={yPos + 18} className={`motor-data-value ${hasCriticalTemp ? 'critical' : ''}`}>
                  {motor?.temperature?.toFixed(0) || '0'}°C
                </text>
                
                {/* Status indicators */}
                <g className="motor-status-indicators">
                  {/* Main status indicator */}
                  <circle cx="570" cy={yPos - 20} r="6" 
                          fill={hasError ? "#ef4444" : 
                                hasWarning ? "#f59e0b" : 
                                isActive ? "#22c55e" : "#64748b"}
                          className="status-led"
                          filter={hasError ? "url(#criticalGlow)" : "none"}>
                    <animate attributeName="opacity" 
                             values={hasError ? "0.3;1;0.3" : hasWarning ? "0.5;1;0.5" : "1"} 
                             dur={hasError ? "0.5s" : hasWarning ? "1s" : "2s"} 
                             repeatCount="indefinite" />
                  </circle>
                  
                  {/* Filter status indicators */}
                  {hasFilterIssue && (
                    <circle cx="570" cy={yPos} r="4" fill="#f59e0b" className="filter-warning">
                      <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  {/* Temperature warning */}
                  {hasCriticalTemp && (
                    <circle cx="570" cy={yPos + 15} r="4" fill="#ef4444" className="temp-critical">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
                
                {/* Enhanced Control Buttons (Touch-friendly) */}
                <g className="motor-controls" onClick={() => handleComponentClick(`motor-${motorId}`)}>
                  <rect x="430" y={yPos + 30} width="120" height="35"
                        fill="rgba(13, 18, 22, 0.9)"
                        stroke="rgba(96, 160, 255, 0.4)"
                        strokeWidth="2"
                        rx="8"
                        className="control-panel-button" />
                  
                  <text x="490" y={yPos + 45} className="control-button-text">MOTOR CONTROLS</text>
                  <text x="490" y={yPos + 55} className="control-button-subtitle">
                    {systemMode} MODE • {isActive ? 'RUNNING' : 'STOPPED'}
                  </text>
                </g>
                
                {/* Clickable area */}
                <rect x="420" y={yPos - 35} width="140" height="70" 
                      fill="transparent" 
                      className="motor-click-area"
                      onClick={() => handleComponentClick(`motor-${motorId}`)} />
              </g>
            );
          })}

          {/* Enhanced Hydraulic Lines with Improved Animations */}
          {[1, 2, 3, 4, 5, 6, 7].map((motorId, index) => {
            const yPos = 180 + (index * 90);
            const isActive = motors[motorId]?.enabled && motors[motorId]?.status === 1;
            const flowRate = motors[motorId]?.flow || 0;
            const pressure = motors[motorId]?.pressure || 0;
            
            return (
              <g key={`lines-${motorId}`}>
                {/* Enhanced Suction Line */}
                <path d={`M 300 500 L 360 500 L 360 ${yPos} L 420 ${yPos}`}
                      fill="none"
                      stroke={isActive ? "rgba(6, 182, 212, 0.9)" : "rgba(96, 160, 255, 0.4)"}
                      strokeWidth={isActive ? "6" : "4"}
                      strokeDasharray={isActive ? "none" : "12,6"}
                      className="suction-line"
                      markerEnd={isActive ? "url(#flowArrow)" : "none"} />
                
                {/* Suction flow animation with variable speed */}
                {isActive && (
                  <>
                    {[0, 0.3, 0.6].map((delay, i) => (
                      <circle key={i} r="4" fill="rgba(6, 182, 212, 0.8)" opacity="0.9">
                        <animateMotion 
                          dur={`${Math.max(1, animationSpeed * (100 / Math.max(flowRate, 1)))}s`}
                          repeatCount="indefinite"
                          begin={`${delay * animationSpeed}s`}
                          path={`M 300 500 L 360 500 L 360 ${yPos} L 420 ${yPos}`} />
                      </circle>
                    ))}
                  </>
                )}

                {/* Enhanced Pressure Line with Advanced Visualization */}
                <path d={`M 560 ${yPos} L 640 ${yPos} L 640 ${280 + (index * 25)} L 720 ${280 + (index * 25)}`}
                      fill="none"
                      stroke={isActive ? `rgba(${pressure > 150 ? '239, 68, 68' : '34, 197, 94'}, 0.9)` : "rgba(239, 68, 68, 0.4)"}
                      strokeWidth={isActive ? Math.max(4, Math.min(8, pressure / 25)) : "4"}
                      strokeDasharray={isActive ? "none" : "12,6"}
                      className="pressure-line"
                      markerEnd={isActive ? "url(#pressureArrow)" : "none"} />
                
                {/* Pressure flow animation with pressure-based effects */}
                {isActive && (
                  <>
                    {[0, 0.4, 0.8].map((delay, i) => (
                      <circle key={i} 
                              r={Math.max(3, Math.min(6, pressure / 30))} 
                              fill={pressure > 150 ? "rgba(239, 68, 68, 0.9)" : "rgba(34, 197, 94, 0.9)"} 
                              opacity="0.8">
                        <animateMotion 
                          dur={`${Math.max(0.8, animationSpeed * (120 / Math.max(pressure, 1)))}s`}
                          repeatCount="indefinite"
                          begin={`${delay * animationSpeed * 0.7}s`}
                          path={`M 560 ${yPos} L 640 ${yPos} L 640 ${280 + (index * 25)} L 720 ${280 + (index * 25)}`} />
                      </circle>
                    ))}
                  </>
                )}
                
                {/* Pressure Measurement Point */}
                <circle cx={600} cy={yPos} r="8" 
                        fill="rgba(245, 158, 11, 0.3)" 
                        stroke="#f59e0b" 
                        strokeWidth="2" 
                        className="pressure-sensor-point" />
                
                <text x="615" y={yPos + 4} className="sensor-reading">
                  {pressure.toFixed(0)}
                </text>
                <path d={`M 560 ${yPos} L 620 ${yPos} L 620 ${280 + (index * 25)} L 700 ${280 + (index * 25)}`}
                      fill="none"
                      stroke={isActive ? "rgba(239, 68, 68, 0.9)" : "rgba(239, 68, 68, 0.4)"}
                      strokeWidth={isActive ? "8" : "4"}
                      strokeDasharray={isActive ? "none" : "12,6"}
                      className="pressure-line"
                      markerEnd={isActive ? "url(#pressureArrow)" : "none"} />
                
                {/* Pressure flow animation with variable speed */}
                {isActive && (
                  <>
                    {[0, 0.25, 0.5].map((delay, i) => (
                      <circle key={i} r="5" fill="rgba(239, 68, 68, 0.9)" opacity="0.8">
                        <animateMotion 
                          dur={`${Math.max(0.8, animationSpeed * (150 / Math.max(pressure, 1)) * 0.8)}s`}
                          repeatCount="indefinite"
                          begin={`${delay * animationSpeed * 0.8}s`}
                          path={`M 560 ${yPos} L 620 ${yPos} L 620 ${280 + (index * 25)} L 700 ${280 + (index * 25)}`} />
                      </circle>
                    ))}
                  </>
                )}

                {/* Flow rate labels */}
                {isActive && (
                  <>
                    <text x="380" y={yPos - 10} className="flow-label">
                      {flowRate.toFixed(0)} L/min
                    </text>
                    <text x="640" y={280 + (index * 25) - 10} className="pressure-label">
                      {pressure.toFixed(0)} bar
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Enhanced Main Pressure Manifold */}
          <g className="pressure-manifold-system" onClick={() => handleComponentClick('manifold')}>
            <rect x="700" y="250" width="100" height="400"
                  fill={totalPressure < 80 ? "rgba(239, 68, 68, 0.3)" :
                        totalPressure > 160 ? "rgba(239, 68, 68, 0.3)" :
                        "rgba(239, 68, 68, 0.2)"}
                  stroke={totalPressure < 80 ? "#ef4444" :
                         totalPressure > 160 ? "#ef4444" :
                         "rgba(239, 68, 68, 0.8)"}
                  strokeWidth={totalPressure < 80 || totalPressure > 160 ? "4" : "3"}
                  rx="15"
                  filter={totalPressure < 80 || totalPressure > 160 ? "url(#criticalGlow)" : "url(#statusGlow)"} />
            
            {/* Pressure level visualization */}
            <rect x="715" y={640 - (Math.min(totalPressure, 200) * 1.95)} width="70" height={Math.min(totalPressure, 200) * 1.95}
                  fill="url(#pressureGradient)"
                  opacity="0.7"
                  className="pressure-level">
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
            </rect>
            
            {/* Pressure readings with enhanced styling */}
            <text x="750" y="220" className="component-label-large">MAIN MANIFOLD</text>
            <text x="750" y="235" className="component-subtitle">400L Capacity</text>
            
            <text x="750" y="380" className={`manifold-pressure-value ${
              totalPressure < 80 || totalPressure > 160 ? 'critical' : 
              totalPressure < 100 ? 'warning' : 'normal'
            }`}>
              {totalPressure.toFixed(1)}
            </text>
            <text x="750" y="400" className="component-unit-large">bar</text>
            
            {/* Pressure sensors array */}
            <g className="pressure-sensors">
              <circle cx="770" cy="450" r="10" fill="#ef4444" className="pressure-sensor primary">
                <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="790" y="455" className="sensor-label-enhanced">P1: {totalPressure.toFixed(0)} bar</text>
              
              <circle cx="770" cy="480" r="8" fill="#f59e0b" className="pressure-sensor secondary">
                <animate attributeName="r" values="8;10;8" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <text x="790" y="485" className="sensor-label">P2: BACKUP</text>
            </g>

            {/* Pressure relief valve */}
            <g className="relief-valve">
              <circle cx="750" cy="280" r="12" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
              <path d="M 745 275 L 755 275 M 745 285 L 755 285" stroke="#94a3b8" strokeWidth="2" />
              <text x="770" y="285" className="component-label">RELIEF</text>
            </g>
          </g>

          {/* Enhanced Check Valves with Control Logic */}
          {[1, 2, 3, 4, 5, 6, 7].map((motorId, index) => {
            const yPos = 280 + (index * 25);
            const isActive = motors[motorId]?.enabled && motors[motorId]?.status === 1;
            const valveOpen = motors[motorId]?.valve || false;
            
            return (
              <g key={`valve-${motorId}`} className="check-valve-assembly" onClick={() => handleComponentClick(`valve-${motorId}`)}>
                <circle cx="660" cy={yPos} r="18"
                        fill={isActive ? "rgba(6, 182, 212, 0.5)" : "rgba(71, 85, 105, 0.3)"}
                        stroke={isActive ? "#06b6d4" : "#64748b"}
                        strokeWidth="3"
                        filter={isActive ? "url(#statusGlow)" : "none"} />
                
                {/* Valve disc position */}
                <ellipse cx={valveOpen ? 665 : 655} cy={yPos} rx="8" ry="12"
                         fill={isActive ? "#06b6d4" : "#64748b"}
                         transform={`rotate(${valveOpen ? 15 : -15} ${valveOpen ? 665 : 655} ${yPos})`}>
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                </ellipse>
                
                {/* Flow indicator */}
                {isActive && valveOpen && (
                  <>
                    {[0, 0.4, 0.8].map((delay, i) => (
                      <circle key={i} r="3" fill="#06b6d4" opacity="0.8">
                        <animate attributeName="cx" values="640;680;640" dur="1.5s" begin={`${delay * 1.5}s`} repeatCount="indefinite" />
                        <animate attributeName="cy" values={`${yPos}`} dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    ))}
                  </>
                )}
                
                <text x="685" y={yPos + 5} className="valve-label">V{motorId}</text>
              </g>
            );
          })}

          {/* Enhanced System Output with Flow Distribution */}
          <g className="system-output-assembly" onClick={() => handleComponentClick('output')}>
            <path d="M 800 400 L 980 400 L 980 450 L 1050 450"
                  fill="none"
                  stroke={totalFlow > 400 ? "rgba(34, 197, 94, 0.9)" : 
                         totalFlow > 200 ? "rgba(245, 158, 11, 0.9)" : 
                         "rgba(239, 68, 68, 0.9)"}
                  strokeWidth="8"
                  className="main-output-line"
                  markerEnd="url(#flowArrow)" />
            
            {/* Enhanced flow animation */}
            {totalFlow > 0 && (
              <>
                {[0, 0.3, 0.6].map((delay, i) => (
                  <circle key={i} r="8" 
                          fill={totalFlow > 400 ? "rgba(34, 197, 94, 0.9)" : 
                                totalFlow > 200 ? "rgba(245, 158, 11, 0.9)" : 
                                "rgba(239, 68, 68, 0.9)"}
                          opacity="0.8">
                    <animateMotion 
                      dur={`${Math.max(1, animationSpeed * (500 / Math.max(totalFlow, 1)))}s`} 
                      repeatCount="indefinite"
                      begin={`${delay * 2}s`}
                      path="M 800 400 L 980 400 L 980 450 L 1050 450" />
                  </circle>
                ))}
              </>
            )}
            
            {/* System output data panel */}
            <rect x="1070" y="400" width="160" height="120"
                  fill="rgba(13, 18, 22, 0.95)"
                  stroke="rgba(96, 160, 255, 0.6)"
                  strokeWidth="2"
                  rx="10" />
            
            <text x="1150" y="425" className="component-label-large">SYSTEM OUTPUT</text>
            <text x="1150" y="440" className="component-subtitle">To Hydraulic Actuators</text>
            
            <text x="1150" y="470" className={`output-flow-value ${totalFlow < 300 ? 'critical' : totalFlow < 400 ? 'warning' : 'normal'}`}>
              {totalFlow.toFixed(0)}
            </text>
            <text x="1150" y="490" className="component-unit-large">L/min</text>
            
            <text x="1150" y="510" className="output-pressure-value">
              {totalPressure.toFixed(0)} bar
            </text>
            
            {/* Flow trend display */}
            <g transform="translate(1080, 495)">
              {renderTrendSparkline(trends.flow, '#06b6d4', 120, 20)}
            </g>
          </g>

          {/* Enhanced Emergency Stop (Maximum Visibility) */}
          <g className="emergency-stop-system" onClick={() => handleComponentClick('emergency')}>
            <circle cx="1420" cy="100" r="60"
                    fill={emergencyActive ? "rgba(220, 20, 60, 0.8)" : "rgba(220, 20, 60, 0.4)"}
                    stroke="#dc143c"
                    strokeWidth="6"
                    filter={emergencyActive ? "url(#criticalGlow)" : "url(#errorGlow)"} />
            
            {/* Inner emergency button */}
            <circle cx="1420" cy="100" r="45"
                    fill={emergencyActive ? "#dc143c" : "rgba(220, 20, 60, 0.7)"}
                    stroke="#ffffff"
                    strokeWidth="3" />
            
            <text x="1420" y="85" className="emergency-text-large">E</text>
            <text x="1420" y="105" className="emergency-text-large">STOP</text>
            <text x="1420" y="125" className="emergency-text-small">
              {emergencyActive ? 'ACTIVE' : 'READY'}
            </text>
            
            <text x="1420" y="180" className="component-label-large">EMERGENCY STOP</text>
            
            {/* Pulsing warning rings */}
            <circle cx="1420" cy="100" r="55" fill="none" stroke="#dc143c" strokeWidth="3" opacity="0.6">
              <animate attributeName="r" values="55;70;55" dur={emergencyActive ? "1s" : "3s"} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur={emergencyActive ? "1s" : "3s"} repeatCount="indefinite" />
            </circle>
            
            {emergencyActive && (
              <circle cx="1420" cy="100" r="65" fill="none" stroke="#dc143c" strokeWidth="2" opacity="0.4">
                <animate attributeName="r" values="65;80;65" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.8s" repeatCount="indefinite" />
              </circle>
            )}
          </g>

          {/* Enhanced Sensor Network */}
          <g className="sensor-network">
            {/* Temperature sensors with enhanced data */}
            <g className="temp-sensor-array">
              <circle cx="190" cy="550" r="12" fill="#ef4444" className="temp-sensor primary">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="210" y="555" className="sensor-label-enhanced">T1: {oilTemp.toFixed(1)}°C</text>
              <text x="210" y="570" className="sensor-status">Tank Oil</text>
              
              {oilTemp > 70 && (
                <circle cx="190" cy="550" r="20" fill="none" stroke="#ef4444" strokeWidth="3" className="alarm-ring">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
            </g>

            {/* Flow sensors */}
            <g className="flow-sensor-array">
              <circle cx="900" cy="400" r="12" fill="#06b6d4" className="flow-sensor primary">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <text x="920" y="405" className="sensor-label-enhanced">F1: {totalFlow.toFixed(0)} L/min</text>
              <text x="920" y="420" className="sensor-status">Main Flow</text>
            </g>

            {/* Pressure sensors */}
            <g className="pressure-sensor-array">
              <circle cx="750" cy="450" r="12" fill="#f59e0b" className="pressure-sensor primary">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <text x="680" y="435" className="sensor-label-enhanced">P1: {totalPressure.toFixed(1)} bar</text>
              <text x="680" y="450" className="sensor-status">System Pressure</text>
            </g>
          </g>

          {/* Enhanced System Status Display */}
          <g className="system-status-display">
            <rect x="50" y="50" width="350" height="180"
                  fill="rgba(13, 18, 22, 0.95)"
                  stroke="rgba(96, 160, 255, 0.6)"
                  strokeWidth="2"
                  rx="15" />
            
            <text x="225" y="80" className="status-display-title">HYDRAULIC SYSTEM STATUS</text>
            
            <g className="status-grid">
              <text x="70" y="110" className="status-item-label">Operating Mode:</text>
              <text x="200" y="110" className={`status-item-value mode-${systemMode.toLowerCase()}`}>{systemMode}</text>
              
              <text x="70" y="130" className="status-item-label">System Health:</text>
              <text x="200" y="130" className={`status-item-value health-${systemHealth.overall}`}>
                {systemHealth.overall.toUpperCase()} ({systemHealth.score.toFixed(0)}%)
              </text>
              
              <text x="70" y="150" className="status-item-label">Active Motors:</text>
              <text x="200" y="150" className="status-item-value">{activeMotorCount}/7</text>
              
              <text x="70" y="170" className="status-item-label">System Efficiency:</text>
              <text x="200" y="170" className="status-item-value">{systemEfficiency.toFixed(1)}%</text>
              
              <text x="70" y="190" className="status-item-label">Runtime:</text>
              <text x="200" y="190" className="status-item-value">2,346 hrs</text>
              
              <text x="70" y="210" className="status-item-label">Active Alarms:</text>
              <text x="200" y="210" className={`status-item-value ${alarms.length > 0 ? 'has-alarms' : 'no-alarms'}`}>
                {alarms.length}
              </text>
            </g>
            
            {/* Connection status indicator */}
            <circle cx="370" cy="70" r="8" 
                    fill={isConnected ? "#22c55e" : "#ef4444"} 
                    className="connection-status-led">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* Enhanced Component Details Panel */}
        {selectedComponent && !controlPanelOpen && (
          <div className="component-details-enhanced">
            <div className="details-header">
              <div className="details-title-section">
                <h3>{selectedComponent.toUpperCase()} DETAILS</h3>
                <div className="details-subtitle">Component Information & Status</div>
              </div>
              <button className="details-close-button" onClick={() => setSelectedComponent(null)} aria-label="Close">
                <span>×</span>
              </button>
            </div>
            <div className="details-content-enhanced">
              {selectedComponent === 'tank' && (
                <div className="tank-details">
                  <div className="detail-section">
                    <h4>Tank Specifications</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Capacity:</span>
                        <span className="detail-value">1000 L</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Oil Type:</span>
                        <span className="detail-value">ISO VG 46</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Working Pressure:</span>
                        <span className="detail-value">250 bar max</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="detail-section">
                    <h4>Current Status</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Current Level:</span>
                        <span className={`detail-value ${tankLevel < 20 ? 'critical' : tankLevel < 40 ? 'warning' : 'normal'}`}>
                          {(tankLevel * 10).toFixed(0)} L ({tankLevel.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Oil Temperature:</span>
                        <span className={`detail-value ${oilTemp > 70 ? 'critical' : oilTemp > 60 ? 'warning' : 'normal'}`}>
                          {oilTemp.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Service:</span>
                        <span className="detail-value">145 hrs ago</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Next Service:</span>
                        <span className="detail-value">355 hrs</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedComponent.startsWith('motor-') && (
                <div className="motor-details">
                  <div className="detail-section">
                    <h4>Motor Specifications</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Power Rating:</span>
                        <span className="detail-value">75 kW</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Voltage:</span>
                        <span className="detail-value">400V 3-Phase</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Max RPM:</span>
                        <span className="detail-value">1800 RPM</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Efficiency:</span>
                        <span className="detail-value">94.5%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="detail-section">
                    <h4>Current Measurements</h4>
                    <div className="detail-grid">
                      {(() => {
                        const motorId = parseInt(selectedComponent.split('-')[1]);
                        const motor = motors[motorId];
                        return (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Current Flow:</span>
                              <span className="detail-value">{motor?.flow?.toFixed(1) || '0.0'} L/min</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Operating Pressure:</span>
                              <span className="detail-value">{motor?.pressure?.toFixed(1) || '0.0'} bar</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Current RPM:</span>
                              <span className="detail-value">{motor?.rpm?.toFixed(0) || '0'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Current Draw:</span>
                              <span className="detail-value">{motor?.current?.toFixed(1) || '0.0'} A</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Temperature:</span>
                              <span className={`detail-value ${motor?.temperature > 70 ? 'warning' : 'normal'}`}>
                                {motor?.temperature?.toFixed(1) || '0.0'}°C
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Runtime:</span>
                              <span className="detail-value">{(2346 + motorId * 123).toFixed(0)} hrs</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Bottom Status Bar */}
      <div className="flow-status-bar-enhanced">
        <div className="status-section system-overview">
          <div className="section-title">System Overview</div>
          <div className="status-items">
            <div className="status-item">
              <span className="status-icon">🔧</span>
              <div className="status-content">
                <span className="status-label">Maintenance:</span>
                <span className="status-value good">Scheduled</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-icon">⚡</span>
              <div className="status-content">
                <span className="status-label">Total Power:</span>
                <span className="status-value">{(activeMotorCount * 75).toFixed(0)} kW</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-icon">⏱️</span>
              <div className="status-content">
                <span className="status-label">Runtime:</span>
                <span className="status-value">2,346 hrs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="status-section measurements">
          <div className="section-title">Live Measurements</div>
          <div className="status-items">
            <div className="status-item">
              <span className="status-icon">🌡️</span>
              <div className="status-content">
                <span className="status-label">Oil Temp:</span>
                <span className={`status-value ${oilTemp > 65 ? 'warning' : 'normal'}`}>
                  {oilTemp.toFixed(1)}°C
                </span>
              </div>
              <div className="mini-trend">
                {renderTrendSparkline(trends.temperature, '#ef4444', 50, 15)}
              </div>
            </div>
            <div className="status-item">
              <span className="status-icon">💧</span>
              <div className="status-content">
                <span className="status-label">Viscosity:</span>
                <span className="status-value">46 cSt</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-icon">📏</span>
              <div className="status-content">
                <span className="status-label">Efficiency:</span>
                <span className="status-value">{systemEfficiency.toFixed(1)}%</span>
              </div>
              <div className="mini-trend">
                {renderTrendSparkline(trends.efficiency, '#22c55e', 50, 15)}
              </div>
            </div>
          </div>
        </div>

        <div className="status-section alerts">
          <div className="section-title">System Health</div>
          <div className="status-items">
            <div className="status-item">
              <span className="status-icon">⚠️</span>
              <div className="status-content">
                <span className="status-label">Alarms:</span>
                <span className={`status-value ${alarms.length > 0 ? 'error' : 'good'}`}>
                  {alarms.length}
                </span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-icon">📊</span>
              <div className="status-content">
                <span className="status-label">Health Score:</span>
                <span className={`status-value ${systemHealth.overall === 'good' ? 'good' : 'warning'}`}>
                  {systemHealth.score.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel 
        isOpen={controlPanelOpen}
        onClose={() => setControlPanelOpen(false)}
        componentType={selectedComponent === 'emergency' ? 'emergency' : 
                     selectedComponent === 'system-control' ? 'system-control' :
                     selectedComponent === 'alarms' ? 'alarms' :
                     selectedComponent?.startsWith('motor-') ? 'motor' : 'component'}
        motorId={selectedComponent?.startsWith('motor-') ? 
                 parseInt(selectedComponent.split('-')[1]) : undefined}
      />
    </div>
  );
};

export default ProcessFlowPage;