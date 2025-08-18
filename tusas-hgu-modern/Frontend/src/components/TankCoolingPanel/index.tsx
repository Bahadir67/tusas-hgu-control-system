import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useOpcStore } from '../../store/opcStore';
import CoolingSetpointsModal from '../CoolingSetpointsModal';
import { useSystemOpcHint } from '../../hooks/useOpcHint';
import './TankCoolingPanel.css';

interface TankCoolingPanelProps {
  onClick?: () => void;
}

const TankCoolingPanel: React.FC<TankCoolingPanelProps> = ({ onClick }) => {
  const system = useOpcStore((state) => state.system);
  const [showCoolingModal, setShowCoolingModal] = useState(false);
  
  // OPC hints for tank and cooling data
  const tankLevelHint = useSystemOpcHint('tankLevel');
  const oilTemperatureHint = useSystemOpcHint('oilTemperature');
  const aquaSensorHint = useSystemOpcHint('aquaSensor');
  const chillerInletTempHint = useSystemOpcHint('chillerInletTemp');
  const chillerWaterFlowHint = useSystemOpcHint('chillerWaterFlowStatus');
  const systemStatusHint = useSystemOpcHint('systemStatus');
  
  // Use actual OPC data from store
  const tankCoolingData = {
    tankLevel: system.tankLevel || 0, // From COOLING_OIL_LEVEL_PERCENT_EXECUTION
    tankTemperature: system.oilTemperature || 0, // From COOLING_OIL_TEMPERATURE_EXECUTION
    aquaSensor: system.aquaSensor || 0, // From COOLING_AQUA_SENSOR_EXECUTION
    waterTemperature: system.waterTemperature || 0, // From COOLING_WATER_TEMPERATURE_EXECUTION
    coolingSystemStatus: system.coolingSystemStatus || 0, // From COOLING_SYSTEM_STATUS_EXECUTION
    // Setpoints
    maxOilTempSetpoint: system.maxOilTempSetpoint || 60.0, // From COOLING_MAX_OIL_TEMP_SETPOINT
    minOilTempSetpoint: system.minOilTempSetpoint || 30.0, // From COOLING_MIN_OIL_TEMP_SETPOINT
    coolingFlowRate: system.coolingFlowRate || 0, // From COOLING_FLOW_RATE_EXECUTION
    pumpStatus: system.coolingPumpStatus || false // From COOLING_PUMP_STATUS_EXECUTION
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
    // Open cooling setpoints modal instead of onClick callback
    setShowCoolingModal(true);
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
          title={systemStatusHint}
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
                title={tankLevelHint}
              />
              <div 
                className="tank-level-text" 
                title={tankLevelHint}
              >
                {tankCoolingData.tankLevel.toFixed(1)}%
              </div>
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
            <div className="tank-metric with-progress">
              <div className="metric-label">Tank Temperature</div>
              <div className="metric-with-progress">
                <div className="progress-background">
                  <div 
                    className="progress-fill temperature"
                    style={{ 
                      width: `${Math.min((tankCoolingData.tankTemperature / tankCoolingData.maxOilTempSetpoint) * 100, 100)}%`,
                      backgroundColor: getTemperatureColor(
                        tankCoolingData.tankTemperature, 
                        tankCoolingData.minOilTempSetpoint, 
                        tankCoolingData.maxOilTempSetpoint
                      )
                    }}
                  />
                </div>
                <div 
                  className="metric-value overlay-text"
                  title={oilTemperatureHint}
                >
                  {tankCoolingData.tankTemperature.toFixed(1)}°C
                </div>
              </div>
            </div>
            
            <div className="tank-metric with-progress">
              <div className="metric-label">Water in Oil</div>
              <div className="metric-with-progress">
                <div className="progress-background">
                  <div 
                    className="progress-fill water-contamination"
                    style={{ 
                      width: `${Math.min((tankCoolingData.aquaSensor * 100) / 1.0 * 100, 100)}%`,
                      backgroundColor: getAquaSensorColor(tankCoolingData.aquaSensor)
                    }}
                  />
                </div>
                <div 
                  className="metric-value overlay-text"
                  title={aquaSensorHint}
                >
                  {(tankCoolingData.aquaSensor * 100).toFixed(2)}%
                </div>
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
            <div className="cooling-metric with-progress">
              <div className="metric-header">
                <span className="metric-icon">🌡️</span>
                <span className="metric-label">Water Temp</span>
              </div>
              <div className="metric-with-progress">
                <div className="progress-background">
                  <div 
                    className="progress-fill water-temperature"
                    style={{ 
                      width: `${Math.min((tankCoolingData.waterTemperature / 50) * 100, 100)}%`,
                      backgroundColor: '#06b6d4'
                    }}
                  />
                </div>
                <div 
                  className="metric-display overlay-text"
                  title={chillerInletTempHint}
                >
                  <span className="metric-value">{tankCoolingData.waterTemperature.toFixed(1)}</span>
                  <span className="metric-unit">°C</span>
                </div>
              </div>
            </div>

            <div className="cooling-metric with-progress">
              <div className="metric-header">
                <span className="metric-icon">💧</span>
                <span className="metric-label">Flow Rate</span>
              </div>
              <div className="metric-with-progress">
                <div className="progress-background">
                  <div 
                    className="progress-fill flow-rate"
                    style={{ 
                      width: `${Math.min((tankCoolingData.coolingFlowRate / 200) * 100, 100)}%`,
                      backgroundColor: '#8b5cf6'
                    }}
                  />
                </div>
                <div 
                  className="metric-display overlay-text"
                  title={chillerWaterFlowHint}
                >
                  <span className="metric-value">{tankCoolingData.coolingFlowRate.toFixed(1)}</span>
                  <span className="metric-unit">L/min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cooling-status-row">
            <div 
              className="pump-status"
              title={chillerWaterFlowHint}
            >
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

      {/* Cooling Setpoints Modal - Portal to document.body */}
      {showCoolingModal && ReactDOM.createPortal(
        <CoolingSetpointsModal 
          onClose={() => setShowCoolingModal(false)}
        />,
        document.body
      )}
    </div>
  );
};

export default TankCoolingPanel;