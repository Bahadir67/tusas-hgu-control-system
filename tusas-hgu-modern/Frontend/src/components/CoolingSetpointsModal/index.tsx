import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import './CoolingSetpointsModal.css';

interface CoolingSetpointsModalProps {
  onClose: () => void;
}

const CoolingSetpointsModal: React.FC<CoolingSetpointsModalProps> = ({ onClose }) => {
  const system = useOpcStore((state) => state.system);
  const fetchPageData = useOpcStore((state) => state.fetchPageData);
  
  // Use actual OPC data from store
  const currentData = {
    tankTemperature: system.oilTemperature || 0,
    waterInOil: system.aquaSensor || 0,
    waterTemperature: 35.2, // Will be added to system store when available
    coolingFlowRate: 145.8, // Will be added to system store when available
    coolingSystemStatus: 1, // Will be added to system store when available
    pumpStatus: true // Will be added to system store when available
  };
  
  // Setpoint states
  const [minTempSetpoint, setMinTempSetpoint] = useState('30.0');
  const [maxTempSetpoint, setMaxTempSetpoint] = useState('60.0');
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch latest data when modal opens
  useEffect(() => {
    fetchPageData('main').catch(console.error);
  }, [fetchPageData]);

  // Operating ranges for validation
  const tempRange = { min: 20, max: 80 };

  const validateInputs = () => {
    const minTemp = parseFloat(minTempSetpoint);
    const maxTemp = parseFloat(maxTempSetpoint);
    
    if (isNaN(minTemp) || minTemp < tempRange.min || minTemp > tempRange.max) {
      alert(`Minimum temperature must be between ${tempRange.min}°C and ${tempRange.max}°C`);
      return false;
    }
    
    if (isNaN(maxTemp) || maxTemp < tempRange.min || maxTemp > tempRange.max) {
      alert(`Maximum temperature must be between ${tempRange.min}°C and ${tempRange.max}°C`);
      return false;
    }
    
    if (minTemp >= maxTemp) {
      alert('Minimum temperature must be less than maximum temperature');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsSaving(true);
    try {
      // Write cooling setpoints to OPC server
      await Promise.all([
        opcApi.writeVariable('COOLING_MIN_OIL_TEMP_SETPOINT', minTempSetpoint),
        opcApi.writeVariable('COOLING_MAX_OIL_TEMP_SETPOINT', maxTempSetpoint),
      ]);
      
      // Update local store if needed
      console.log('Cooling setpoints saved successfully');
      
      onClose();
    } catch (error) {
      console.error('Failed to save cooling setpoints:', error);
      alert('Cooling setpoints could not be saved!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset cooling setpoints to default values?')) {
      setMinTempSetpoint('30.0');
      setMaxTempSetpoint('60.0');
    }
  };

  const getCoolingStatusText = (status: number) => {
    switch (status) {
      case 0: return 'OFF';
      case 1: return 'NORMAL';
      case 2: return 'WARNING';
      case 3: return 'ERROR';
      default: return 'UNKNOWN';
    }
  };

  const getContaminationStatus = (percentage: number) => {
    if (percentage > 0.5) return 'CRITICAL';
    if (percentage > 0.2) return 'WARNING';
    return 'NORMAL';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cooling-setpoints-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-title">
            <span className="header-icon">❄️</span>
            <span className="header-text">COOLING SYSTEM SETTINGS</span>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Current Status */}
        <div className="current-status">
          <div className="status-header">
            <span className="status-icon">📊</span>
            <span className="status-title">Current System Status</span>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">Tank Temperature</div>
              <div className="status-value temperature">
                {currentData.tankTemperature.toFixed(1)}°C
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Water in Oil</div>
              <div className="status-value contamination">
                {(currentData.waterInOil * 100).toFixed(2)}% - {getContaminationStatus(currentData.waterInOil)}
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Water Temperature</div>
              <div className="status-value cooling">
                {currentData.waterTemperature.toFixed(1)}°C
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Cooling System</div>
              <div className="status-value pump">
                {getCoolingStatusText(currentData.coolingSystemStatus)} - Pump {currentData.pumpStatus ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Range Configuration */}
        <div className="temp-range-section">
          <div className="config-header">
            <span className="config-icon">🌡️</span>
            <span className="config-title">Temperature Control Range</span>
          </div>

          <div className="input-grid-compact">
            {/* Min Temperature */}
            <div className="input-group-compact">
              <div className="input-header-compact">
                <span className="input-icon">🔵</span>
                <label className="input-label">Min Temp</label>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="setpoint-input-compact"
                  value={minTempSetpoint}
                  onChange={(e) => setMinTempSetpoint(e.target.value)}
                  min={tempRange.min}
                  max={tempRange.max}
                  step="0.5"
                  disabled={isSaving}
                />
                <span className="input-unit">°C</span>
              </div>
              <div className="input-range-compact">
                {tempRange.min} - {tempRange.max} °C
              </div>
            </div>

            {/* Max Temperature */}
            <div className="input-group-compact">
              <div className="input-header-compact">
                <span className="input-icon">🔴</span>
                <label className="input-label">Max Temp</label>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="setpoint-input-compact"
                  value={maxTempSetpoint}
                  onChange={(e) => setMaxTempSetpoint(e.target.value)}
                  min={tempRange.min}
                  max={tempRange.max}
                  step="0.5"
                  disabled={isSaving}
                />
                <span className="input-unit">°C</span>
              </div>
              <div className="input-range-compact">
                {tempRange.min} - {tempRange.max} °C
              </div>
            </div>
          </div>

          {/* Temperature Range Preview */}
          <div className="range-preview">
            <div className="config-title" style={{ fontSize: '12px', marginBottom: '8px' }}>
              Operating Range Preview
            </div>
            <div className="range-bar-preview">
              <div 
                className="range-marker" 
                style={{ 
                  left: `${((parseFloat(minTempSetpoint) - 20) / (80 - 20)) * 100}%` 
                }}
              />
              <div 
                className="range-marker" 
                style={{ 
                  left: `${((parseFloat(maxTempSetpoint) - 20) / (80 - 20)) * 100}%`,
                  borderColor: '#ef4444'
                }}
              />
            </div>
            <div className="range-labels">
              <span>20°C (Cold)</span>
              <span>50°C (Optimal)</span>
              <span>80°C (Hot)</span>
            </div>
          </div>
        </div>


        {/* Safety Information - Compact */}
        <div className="safety-info-compact">
          <span className="safety-icon">🛡️</span>
          <span className="safety-text-compact">Temperature changes affect system performance. Monitor tank conditions after applying changes.</span>
        </div>

        {/* Action Buttons - Compact */}
        <div className="modal-actions-compact">
          <button 
            className="action-button-compact reset-button"
            onClick={handleReset}
            disabled={isSaving}
          >
            🔄 Reset
          </button>
          
          <button 
            className="action-button-compact cancel-button" 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          
          <button 
            className="action-button-compact save-button" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Saving...' : '❄️ Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoolingSetpointsModal;