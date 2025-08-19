import React from 'react';
import { useOpcStore } from '../../store/opcStore';
import { useMotorOpcHint } from '../../hooks/useOpcHint';
import './CompactMotorPanel.css';

interface CompactMotorPanelProps {
  motorId: number;
  onClick?: () => void;
}

const CompactMotorPanel: React.FC<CompactMotorPanelProps> = ({ 
  motorId, 
  onClick 
}) => {
  // Motor 7 yüksek basınç motoru - bağımsız çalışır
  const isHighPressureMotor = motorId === 7;
  const motor = useOpcStore((state) => state.motors[motorId]);
  
  // OPC hints for motor data
  const rpmHint = useMotorOpcHint(motorId, 'rpm');
  const currentHint = useMotorOpcHint(motorId, 'current');
  const temperatureHint = useMotorOpcHint(motorId, 'temperature');
  const statusHint = useMotorOpcHint(motorId, 'status');
  const flowHint = useMotorOpcHint(motorId, 'flow');
  const pressureHint = useMotorOpcHint(motorId, 'pressure');
  
  if (!motor) {
    return null;
  }
  
  // Debug log for Motor 1 to check setpoint values
  if (motorId === 1) {
    console.log(`🔍 Motor 1 Debug - Current Values:`, {
      targetRpm: motor.targetRpm,
      pressureSetpoint: motor.pressureSetpoint,
      flowSetpoint: motor.flowSetpoint,
      rpm: motor.rpm,
      pressure: motor.pressure,
      flow: motor.flow
    });
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
      className={`enhanced-motor-panel ${statusInfo.class} ${isHighPressureMotor ? 'high-pressure' : ''}`}
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
          {isHighPressureMotor && <span className="high-pressure-badge">HIGH PRESSURE</span>}
          <span className="power-rating">{isHighPressureMotor ? '90kW' : '75kW'}</span>
        </div>
        <div className="status-section">
          <div 
            className={`status-dot ${statusInfo.class}`}
            style={{ backgroundColor: statusInfo.color }}
            aria-label={statusInfo.text}
            title={statusHint}
          />
          <span className="status-text" title={statusHint}>{statusInfo.text}</span>
        </div>
      </div>

      {/* Digital Display Section - 2x3 Layout for All Motors */}
      <div className="digital-displays">
        <div className="digital-row">
          <div className="digital-display" title={rpmHint}>
            <span className="display-label">RPM</span>
            <span className="display-value" style={{ color: statusInfo.color }}>
              {motor.rpm?.toFixed(0) || '0'}
            </span>
          </div>
          <div className="digital-display" title={pressureHint}>
            <span className="display-label">PRESSURE</span>
            <span className="display-value" style={{ 
              color: motor.pressure > 160 ? '#ef4444' : 
                    motor.pressure > 140 ? '#f59e0b' : '#22c55e' 
            }}>
              {motor.pressure?.toFixed(1) || '0'} bar
            </span>
          </div>
          <div className="digital-display" title={flowHint}>
            <span className="display-label">FLOW</span>
            <span className="display-value" style={{ color: '#06b6d4' }}>
              {motor.flow?.toFixed(1) || '0'} L/min
            </span>
          </div>
        </div>
        <div className="digital-row">
          <div className="digital-display" title={currentHint}>
            <span className="display-label">CURRENT</span>
            <span className="display-value" style={{ 
              color: motor.current === null ? '#6b7280' : 
                    motor.current > 140 ? '#ef4444' : 
                    motor.current > 120 ? '#f59e0b' : '#22c55e' 
            }}>
              {motor.current === null ? 'N/A' : (motor.current?.toFixed(0) || '0')}A
            </span>
          </div>
          <div className="digital-display">
            <span className="display-label">POWER</span>
            <span className="display-value" style={{ color: '#8b5cf6' }}>
              {((motor.current || 0) * 380 * 1.732 / 1000).toFixed(1)}kW
            </span>
          </div>
          <div className="digital-display" title={temperatureHint}>
            <span className="display-label">TEMP</span>
            <span className="display-value" style={{ 
              color: motor.temperature === null ? '#6b7280' : 
                    motor.temperature > 60 ? '#ef4444' : 
                    motor.temperature > 50 ? '#f59e0b' : '#22c55e' 
            }}>
              {motor.temperature === null ? 'N/A' : (motor.temperature?.toFixed(0) || '0')}°C
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons - Touch Optimized */}
      <div className="quick-actions-touch">
        <button 
          className="quick-action-btn-touch start"
          onClick={(e) => handleQuickAction('start', e)}
          disabled={motor.status === 1}
          title="Start Motor"
        >
          ▶ START
        </button>
        <button 
          className="quick-action-btn-touch stop"
          onClick={(e) => handleQuickAction('stop', e)}
          disabled={motor.status === 0}
          title="Stop Motor"
        >
          ⏹ STOP
        </button>
        <button 
          className="quick-action-btn-touch reset"
          onClick={(e) => handleQuickAction('reset', e)}
          title="Reset Alarms"
        >
          🔄 RESET
        </button>
      </div>

      {/* Compact Status Indicators */}
      <div className="compact-indicators">
        <div 
          className={`compact-indicator ${motor.manualValve ? 'valve-open' : 'valve-closed'}`}
          title={motor.manualValve ? 'Manual Valve Open' : 'Manual Valve Closed'}
        >
          <span className="compact-icon">{motor.manualValve ? '🟢' : '🔴'}</span>
          <span className="compact-label">MANUAL VALVE</span>
        </div>
        
        <div 
          className={`compact-indicator filter-${
            motor.lineFilter ? 'normal' : 'error'
          }`}
          title={`Line Filter: ${
            motor.lineFilter ? 'Normal' : 'Error'
          }`}
        >
          <span className="compact-icon">
            {motor.lineFilter ? '🟢' : '🔴'}
          </span>
          <span className="compact-label">LINE FILTER</span>
        </div>
        
        <div 
          className={`compact-indicator filter-${
            motor.suctionFilter ? 'normal' : 'error'
          }`}
          title={`Suction Filter: ${
            motor.suctionFilter ? 'Normal' : 'Error'
          }`}
        >
          <span className="compact-icon">
            {motor.suctionFilter ? '🟢' : '🔴'}
          </span>
          <span className="compact-label">SUCTION FILTER</span>
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