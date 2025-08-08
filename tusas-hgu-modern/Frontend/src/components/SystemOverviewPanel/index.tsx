import React from 'react';
import { useOpcStore } from '../../store/opcStore';
import './SystemOverviewPanel.css';

interface SystemOverviewPanelProps {
  onClick?: () => void;
  alarms?: Array<{ id: number; message: string; type: string }>;
}

const SystemOverviewPanel: React.FC<SystemOverviewPanelProps> = ({ onClick, alarms = [] }) => {
  const system = useOpcStore((state) => state.system);
  
  // Mock system data - replace with actual OPC data
  const systemData = {
    totalFlowExecution: system?.totalFlow || 425.8,
    pressureExecution: system?.totalPressure || 127.3,
    statusExecution: 2, // 0=Test, 1=Ready, 2=Active, 3=Warning, 4=Error
    totalFlowSetpoint: 450.0,
    pressureSetpoint: 125.0,
    efficiency: 94.2,
    activePumps: 5,
    totalPower: 412.5
  };

  const getSystemStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Test Mode', class: 'status-test', color: '#8b5cf6', icon: '🧪' };
      case 1: return { text: 'Ready', class: 'status-ready', color: '#3b82f6', icon: '⚡' };
      case 2: return { text: 'Active', class: 'status-active', color: '#22c55e', icon: '▶️' };
      case 3: return { text: 'Warning', class: 'status-warning', color: '#f59e0b', icon: '⚠️' };
      case 4: return { text: 'Error', class: 'status-error', color: '#ef4444', icon: '❌' };
      default: return { text: 'Unknown', class: 'status-ready', color: '#6b7280', icon: '❓' };
    }
  };

  const statusInfo = getSystemStatusInfo(systemData.statusExecution);

  const getValueColor = (current: number, setpoint: number, tolerance: number = 0.05) => {
    const diff = Math.abs(current - setpoint) / setpoint;
    if (diff > tolerance * 2) return '#ef4444'; // Critical
    if (diff > tolerance) return '#f59e0b';     // Warning
    return '#22c55e';                          // Normal
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return '#22c55e';  // Excellent
    if (efficiency >= 90) return '#84cc16';  // Good
    if (efficiency >= 85) return '#f59e0b';  // Warning
    return '#ef4444';                       // Poor
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={`system-overview-panel ${statusInfo.class}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="System overview details"
      aria-pressed="false"
    >
      {/* Status LED Strip */}
      <div 
        className="system-status-strip" 
        style={{ backgroundColor: statusInfo.color }}
      />

      {/* Header */}
      <div className="system-header">
        <div className="system-title">
          <span className="system-icon">{statusInfo.icon}</span>
          <span className="system-text">SYSTEM OVERVIEW</span>
        </div>
        <div 
          className={`system-status-badge ${statusInfo.class}`}
          style={{ 
            backgroundColor: `${statusInfo.color}20`,
            borderColor: `${statusInfo.color}60`
          }}
        >
          <span className="status-dot" style={{ backgroundColor: statusInfo.color }} />
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="main-metrics">
        <div className="metric-primary">
          <div className="metric-header">
            <span className="metric-icon">💧</span>
            <span className="metric-label">TOTAL FLOW</span>
          </div>
          <div className="metric-display">
            <div 
              className="metric-value" 
              style={{ color: getValueColor(systemData.totalFlowExecution, systemData.totalFlowSetpoint) }}
            >
              {systemData.totalFlowExecution.toFixed(1)}
            </div>
            <div className="metric-unit">L/min</div>
          </div>
          <div className="metric-setpoint">
            Target: {systemData.totalFlowSetpoint.toFixed(1)} L/min
          </div>
        </div>

        <div className="metric-separator" />

        <div className="metric-primary">
          <div className="metric-header">
            <span className="metric-icon">⚡</span>
            <span className="metric-label">PRESSURE</span>
          </div>
          <div className="metric-display">
            <div 
              className="metric-value" 
              style={{ color: getValueColor(systemData.pressureExecution, systemData.pressureSetpoint) }}
            >
              {systemData.pressureExecution.toFixed(1)}
            </div>
            <div className="metric-unit">bar</div>
          </div>
          <div className="metric-setpoint">
            Target: {systemData.pressureSetpoint.toFixed(1)} bar
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="secondary-metrics">
        <div className="secondary-metric">
          <div className="secondary-label">Efficiency</div>
          <div 
            className="secondary-value"
            style={{ color: getEfficiencyColor(systemData.efficiency) }}
          >
            {systemData.efficiency.toFixed(1)}%
          </div>
        </div>

        <div className="secondary-metric">
          <div className="secondary-label">Active Pumps</div>
          <div className="secondary-value" style={{ color: '#06b6d4' }}>
            {systemData.activePumps}/6
          </div>
        </div>

        <div className="secondary-metric">
          <div className="secondary-label">Total Power</div>
          <div className="secondary-value" style={{ color: '#8b5cf6' }}>
            {systemData.totalPower.toFixed(1)}kW
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="performance-indicators">
        <div className="performance-bar">
          <div className="performance-label">Flow Performance</div>
          <div className="progress-container">
            <div 
              className="progress-bar flow-progress"
              style={{ 
                width: `${Math.min((systemData.totalFlowExecution / systemData.totalFlowSetpoint) * 100, 100)}%`,
                backgroundColor: getValueColor(systemData.totalFlowExecution, systemData.totalFlowSetpoint)
              }}
            />
          </div>
          <div className="progress-percentage">
            {((systemData.totalFlowExecution / systemData.totalFlowSetpoint) * 100).toFixed(0)}%
          </div>
        </div>

        <div className="performance-bar">
          <div className="performance-label">Pressure Performance</div>
          <div className="progress-container">
            <div 
              className="progress-bar pressure-progress"
              style={{ 
                width: `${Math.min((systemData.pressureExecution / systemData.pressureSetpoint) * 100, 100)}%`,
                backgroundColor: getValueColor(systemData.pressureExecution, systemData.pressureSetpoint)
              }}
            />
          </div>
          <div className="progress-percentage">
            {((systemData.pressureExecution / systemData.pressureSetpoint) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Monitoring & Alarms Section */}
      <div className="monitoring-section">
        <div className="monitoring-header">
          <span className="monitoring-icon">🔔</span>
          <span className="monitoring-title">ALARMS</span>
          {alarms.length > 0 && (
            <span className="alarm-count">{alarms.length}</span>
          )}
        </div>
        
        {alarms.length > 0 ? (
          <div className="alarms-list">
            {alarms.slice(-2).map(alarm => (
              <div key={alarm.id} className={`alarm-item ${alarm.type}`}>
                <span className="alarm-dot" />
                <span className="alarm-msg">{alarm.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-alarms">All systems normal</div>
        )}
        
        {/* Emergency Status */}
        <div className="emergency-status-compact">
          <span className="emergency-icon">🛡️</span>
          <span className="emergency-text">Emergency: </span>
          <span className="emergency-state normal">NORMAL</span>
        </div>
      </div>

      {/* Tap to Expand Hint */}
      <div className="expand-hint">
        <span>Tap for detailed system settings</span>
        <span className="expand-icon">📊</span>
      </div>
    </div>
  );
};

export default SystemOverviewPanel;