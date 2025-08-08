import React from 'react';
import { useOpcStore } from '../../store/opcStore';
import './CompactMotorPanel.css';

interface CompactMotorPanelProps {
  motorId: number;
  isSpecial?: boolean;
  onClick?: () => void;
}

const CompactMotorPanel: React.FC<CompactMotorPanelProps> = ({ 
  motorId, 
  isSpecial = false, 
  onClick 
}) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  
  if (!motor) {
    return null;
  }

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Ready', class: 'status-ready', color: '#3b82f6' };
      case 1: return { text: 'Running', class: 'status-running', color: '#22c55e' };
      case 2: return { text: 'Warning', class: 'status-warning', color: '#f59e0b' };
      case 3: return { text: 'Error', class: 'status-error', color: '#ef4444' };
      default: return { text: 'Unknown', class: 'status-ready', color: '#6b7280' };
    }
  };

  const statusInfo = getStatusInfo(motor.status);

  const handleClick = () => {
    console.log(`CompactMotorPanel ${motorId} clicked!`);
    if (onClick) {
      console.log(`Calling onClick handler for Motor ${motorId}`);
      onClick();
    } else {
      console.log(`No onClick handler for Motor ${motorId}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleQuickAction = (action: string, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(`Quick action ${action} for Motor ${motorId}`);
    // TODO: Implement actual API calls
  };

  // Generate mock trend data for sparkline
  const generateSparklineData = (baseValue: number, variance: number) => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      points.push(baseValue + (Math.random() - 0.5) * variance);
    }
    return points;
  };

  const pressureSparkline = generateSparklineData(motor.pressure, 5);
  const flowSparkline = generateSparklineData(motor.flow, 8);

  return (
    <div 
      className={`enhanced-motor-panel ${statusInfo.class} ${isSpecial ? 'special' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Motor ${motorId} details - ${statusInfo.text}`}
      aria-pressed="false"
    >
      {/* Status LED Strip */}
      <div 
        className="status-led-strip" 
        style={{ backgroundColor: statusInfo.color }}
      />

      {/* Enhanced Header */}
      <div className="enhanced-header">
        <div className="motor-title">
          <span className="motor-id">MOTOR {motorId}</span>
          {isSpecial && <span className="special-badge">MAIN PUMP</span>}
          <span className="power-rating">{isSpecial ? '90kW' : '75kW'}</span>
        </div>
        <div className="status-section">
          <div 
            className={`status-dot ${statusInfo.class}`}
            style={{ backgroundColor: statusInfo.color }}
            aria-label={statusInfo.text}
          />
          <span className="status-text">{statusInfo.text}</span>
        </div>
      </div>

      {/* Digital Display Section */}
      <div className="digital-displays">
        <div className="digital-row">
          <div className="digital-display">
            <span className="display-label">RPM</span>
            <span className="display-value" style={{ color: statusInfo.color }}>
              {motor.rpm?.toFixed(0) || '0'}
            </span>
          </div>
          <div className="digital-display">
            <span className="display-label">CURRENT</span>
            <span className="display-value" style={{ 
              color: motor.current > 140 ? '#ef4444' : 
                    motor.current > 120 ? '#f59e0b' : '#22c55e' 
            }}>
              {motor.current?.toFixed(0) || '0'}A
            </span>
          </div>
          <div className="digital-display">
            <span className="display-label">POWER</span>
            <span className="display-value" style={{ color: '#8b5cf6' }}>
              {((motor.current || 0) * 380 * 1.732 / 1000).toFixed(1)}kW
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="quick-actions">
        <button 
          className="quick-action-btn start"
          onClick={(e) => handleQuickAction('start', e)}
          disabled={motor.status === 1}
          title="Start Motor"
        >
          ▶ START
        </button>
        <button 
          className="quick-action-btn stop"
          onClick={(e) => handleQuickAction('stop', e)}
          disabled={motor.status === 0}
          title="Stop Motor"
        >
          ⏹ STOP
        </button>
        <button 
          className="quick-action-btn reset"
          onClick={(e) => handleQuickAction('reset', e)}
          title="Reset Alarms"
        >
          🔄 RESET
        </button>
        <button 
          className="quick-action-btn calibrate"
          onClick={(e) => handleQuickAction('calibrate', e)}
          title="Calibrate Sensors"
        >
          ⚙ CAL
        </button>
      </div>

      {/* Status Indicators */}
      <div className="enhanced-indicators">
        <div 
          className={`indicator ${motor.enabled ? 'enabled' : 'disabled'}`}
          title={motor.enabled ? 'Motor Enabled' : 'Motor Disabled'}
        >
          <span className="indicator-icon">{motor.enabled ? '⚡' : '⏸️'}</span>
          <span className="indicator-label">PWR</span>
        </div>
        
        <div 
          className={`indicator ${motor.valve ? 'valve-open' : 'valve-closed'}`}
          title={motor.valve ? 'Valve Open' : 'Valve Closed'}
        >
          <span className="indicator-icon">{motor.valve ? '🟢' : '🔴'}</span>
          <span className="indicator-label">VLV</span>
        </div>
        
        <div 
          className={`indicator filter-${
            motor.lineFilter === 0 ? 'error' : 
            motor.lineFilter === 1 ? 'warning' : 'normal'
          }`}
          title={`Line Filter: ${
            motor.lineFilter === 0 ? 'Error' : 
            motor.lineFilter === 1 ? 'Warning' : 'Normal'
          }`}
        >
          <span className="indicator-icon">🔽</span>
          <span className="indicator-label">FLT</span>
        </div>
      </div>

      {/* Tap to Expand Hint */}
      <div className="expand-hint">
        <span>👆 Tap for detailed view & settings</span>
      </div>
    </div>
  );
};

export default CompactMotorPanel;