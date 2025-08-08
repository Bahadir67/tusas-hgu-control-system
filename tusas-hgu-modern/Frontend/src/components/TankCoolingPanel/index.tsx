import React from 'react';
// import { useOpcStore } from '../../store/opcStore';
import './TankCoolingPanel.css';

interface TankCoolingPanelProps {
  onClick?: () => void;
}

const TankCoolingPanel: React.FC<TankCoolingPanelProps> = ({ onClick }) => {
  // const system = useOpcStore((state) => state.system);
  
  // Mock tank & cooling data - replace with actual OPC data
  const tankCoolingData = {
    tankLevel: 78.5, // SYSTEM_TANK_LEVEL_EXECUTION (%)
    tankTemperature: 42.3, // SYSTEM_TANK_TEMPERATURE_EXECUTION (°C)
    aquaSensor: 0.08, // COOLING_AQUA_SENSOR_EXECUTION (water in oil %)
    waterTemperature: 35.2, // COOLING_WATER_TEMPERATURE_EXECUTION (°C)
    coolingSystemStatus: 1, // COOLING_SYSTEM_STATUS_EXECUTION (0=Off, 1=Normal, 2=Warning, 3=Error)
    // Setpoints
    maxOilTempSetpoint: 60.0, // COOLING_MAX_OIL_TEMP_SETPOINT
    minOilTempSetpoint: 30.0, // COOLING_MIN_OIL_TEMP_SETPOINT
    coolingFlowRate: 145.8, // Cooling flow rate
    pumpStatus: true // Cooling pump status
  };

  const getCoolingStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Off', class: 'status-off', color: '#6b7280', icon: '⏸️' };
      case 1: return { text: 'Normal', class: 'status-normal', color: '#22c55e', icon: '❄️' };
      case 2: return { text: 'Warning', class: 'status-warning', color: '#f59e0b', icon: '⚠️' };
      case 3: return { text: 'Error', class: 'status-error', color: '#ef4444', icon: '🔥' };
      default: return { text: 'Unknown', class: 'status-off', color: '#6b7280', icon: '❓' };
    }
  };

  const getTankLevelStatus = (level: number) => {
    if (level < 20) return { class: 'level-critical', color: '#ef4444' };
    if (level < 40) return { class: 'level-low', color: '#f59e0b' };
    if (level > 90) return { class: 'level-high', color: '#06b6d4' };
    return { class: 'level-normal', color: '#22c55e' };
  };

  const getTemperatureColor = (temp: number, min: number, max: number) => {
    if (temp > max) return '#ef4444'; // Too hot
    if (temp < min) return '#06b6d4'; // Too cold
    if (temp > max * 0.9) return '#f59e0b'; // Getting hot
    return '#22c55e'; // Normal
  };

  const getAquaSensorColor = (percentage: number) => {
    if (percentage > 0.5) return '#ef4444'; // Critical water contamination
    if (percentage > 0.2) return '#f59e0b'; // Warning level
    return '#22c55e'; // Normal
  };

  const statusInfo = getCoolingStatusInfo(tankCoolingData.coolingSystemStatus);
  const tankLevelStatus = getTankLevelStatus(tankCoolingData.tankLevel);

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
      className={`tank-cooling-panel ${statusInfo.class}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Tank and cooling system details"
      aria-pressed="false"
    >
      {/* Status LED Strip */}
      <div 
        className="status-strip" 
        style={{ backgroundColor: statusInfo.color }}
      />

      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">{statusInfo.icon}</span>
          <span className="panel-text">TANK & COOLING</span>
        </div>
        <div 
          className={`status-badge ${statusInfo.class}`}
          style={{ 
            backgroundColor: `${statusInfo.color}20`,
            borderColor: `${statusInfo.color}60`
          }}
        >
          <span className="status-indicator" style={{ backgroundColor: statusInfo.color }} />
          <span className="status-text">{statusInfo.text}</span>
        </div>
      </div>

      {/* Tank Section */}
      <div className="tank-section">
        <div className="section-header">
          <span className="section-icon">🛢️</span>
          <span className="section-title">HYDRAULIC TANK</span>
        </div>
        
        <div className="tank-display">
          <div className="tank-visual">
            <div className="tank-container">
              <div 
                className={`tank-level ${tankLevelStatus.class}`}
                style={{ 
                  height: `${tankCoolingData.tankLevel}%`,
                  backgroundColor: tankLevelStatus.color 
                }}
              />
              <div className="tank-level-text">{tankCoolingData.tankLevel.toFixed(1)}%</div>
            </div>
            <div className="tank-scale">
              <div className="scale-mark">100%</div>
              <div className="scale-mark">75%</div>
              <div className="scale-mark">50%</div>
              <div className="scale-mark">25%</div>
              <div className="scale-mark">0%</div>
            </div>
          </div>
          
          <div className="tank-metrics">
            <div className="tank-metric">
              <div className="metric-label">Tank Temperature</div>
              <div 
                className="metric-value"
                style={{ 
                  color: getTemperatureColor(
                    tankCoolingData.tankTemperature, 
                    tankCoolingData.minOilTempSetpoint, 
                    tankCoolingData.maxOilTempSetpoint
                  ) 
                }}
              >
                {tankCoolingData.tankTemperature.toFixed(1)}°C
              </div>
            </div>
            
            <div className="tank-metric">
              <div className="metric-label">Water in Oil</div>
              <div 
                className="metric-value"
                style={{ color: getAquaSensorColor(tankCoolingData.aquaSensor) }}
              >
                {(tankCoolingData.aquaSensor * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cooling Section */}
      <div className="cooling-section">
        <div className="section-header">
          <span className="section-icon">❄️</span>
          <span className="section-title">COOLING SYSTEM</span>
        </div>
        
        <div className="cooling-metrics">
          <div className="cooling-metric-grid">
            <div className="cooling-metric">
              <div className="metric-header">
                <span className="metric-icon">🌡️</span>
                <span className="metric-label">Water Temp</span>
              </div>
              <div 
                className="metric-display"
                style={{ color: '#06b6d4' }}
              >
                <span className="metric-value">{tankCoolingData.waterTemperature.toFixed(1)}</span>
                <span className="metric-unit">°C</span>
              </div>
            </div>

            <div className="cooling-metric">
              <div className="metric-header">
                <span className="metric-icon">💧</span>
                <span className="metric-label">Flow Rate</span>
              </div>
              <div 
                className="metric-display"
                style={{ color: '#8b5cf6' }}
              >
                <span className="metric-value">{tankCoolingData.coolingFlowRate.toFixed(1)}</span>
                <span className="metric-unit">L/min</span>
              </div>
            </div>
          </div>

          <div className="cooling-status-row">
            <div className="pump-status">
              <span className="pump-icon">
                {tankCoolingData.pumpStatus ? '🔵' : '🔴'}
              </span>
              <span className="pump-text">
                Cooling Pump {tankCoolingData.pumpStatus ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Range Indicator */}
      <div className="temp-range-indicator">
        <div className="range-header">Operating Range</div>
        <div className="range-display">
          <div className="range-bar">
            <div className="range-min">{tankCoolingData.minOilTempSetpoint}°C</div>
            <div className="range-current-marker" 
                 style={{ 
                   left: `${((tankCoolingData.tankTemperature - tankCoolingData.minOilTempSetpoint) / 
                           (tankCoolingData.maxOilTempSetpoint - tankCoolingData.minOilTempSetpoint)) * 100}%`,
                   backgroundColor: getTemperatureColor(
                     tankCoolingData.tankTemperature,
                     tankCoolingData.minOilTempSetpoint,
                     tankCoolingData.maxOilTempSetpoint
                   )
                 }}
            />
            <div className="range-max">{tankCoolingData.maxOilTempSetpoint}°C</div>
          </div>
        </div>
      </div>

      {/* Tap to Expand Hint */}
      <div className="expand-hint">
        <span>Tap for cooling settings & history</span>
        <span className="expand-icon">🔧</span>
      </div>
    </div>
  );
};

export default TankCoolingPanel;