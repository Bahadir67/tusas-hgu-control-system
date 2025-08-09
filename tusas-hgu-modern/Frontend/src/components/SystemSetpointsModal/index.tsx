import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import './SystemSetpointsModal.css';

interface SystemSetpointsModalProps {
  onClose: () => void;
}

const SystemSetpointsModal: React.FC<SystemSetpointsModalProps> = ({ onClose }) => {
  const system = useOpcStore((state) => state.system);
  const fetchPageData = useOpcStore((state) => state.fetchPageData);
  const [flowSetpoint, setFlowSetpoint] = useState(system?.totalFlowSetpoint?.toString() || '450.0');
  const [pressureSetpoint, setPressureSetpoint] = useState(system?.pressureSetpoint?.toString() || '125.0');
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch latest data when modal opens
  useEffect(() => {
    fetchPageData('main').catch(console.error);
  }, [fetchPageData]);
  
  // Update form values when system data changes
  useEffect(() => {
    setFlowSetpoint(system?.totalFlowSetpoint?.toString() || '450.0');
    setPressureSetpoint(system?.pressureSetpoint?.toString() || '125.0');
  }, [system?.totalFlowSetpoint, system?.pressureSetpoint]);

  // Operating ranges for validation
  const flowRange = { min: 100, max: 600 };
  const pressureRange = { min: 50, max: 200 };

  const validateInputs = () => {
    const flow = parseFloat(flowSetpoint);
    const pressure = parseFloat(pressureSetpoint);
    
    if (isNaN(flow) || flow < flowRange.min || flow > flowRange.max) {
      alert(`Flow rate must be between ${flowRange.min} and ${flowRange.max} L/min`);
      return false;
    }
    
    if (isNaN(pressure) || pressure < pressureRange.min || pressure > pressureRange.max) {
      alert(`Pressure must be between ${pressureRange.min} and ${pressureRange.max} bar`);
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
      // Write system setpoints to OPC server
      await Promise.all([
        opcApi.writeVariable('SYSTEM_TOTAL_FLOW_SETPOINT', flowSetpoint),
        opcApi.writeVariable('SYSTEM_PRESSURE_SETPOINT', pressureSetpoint),
      ]);
      
      // Update local store
      useOpcStore.getState().updateSystem({
        totalFlowSetpoint: parseFloat(flowSetpoint),
        pressureSetpoint: parseFloat(pressureSetpoint),
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save system setpoints:', error);
      alert('System setpoints could not be saved!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset setpoints to default values?')) {
      setFlowSetpoint('450.0');
      setPressureSetpoint('125.0');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="system-setpoints-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-title">
            <span className="header-icon">🎯</span>
            <span className="header-text">SYSTEM TARGET VALUES</span>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Current System Status */}
        <div className="current-status">
          <div className="status-header">
            <span className="status-icon">📊</span>
            <span className="status-title">Current System Status</span>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">Current Flow</div>
              <div className="status-value flow">
                {system?.totalFlow?.toFixed(1) || '--'} L/min
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Current Pressure</div>
              <div className="status-value pressure">
                {system?.totalPressure?.toFixed(1) || '--'} bar
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">System Status</div>
              <div className="status-value status">
                {system?.statusExecution === 2 ? 'ACTIVE' : 'STANDBY'}
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Active Motors</div>
              <div className="status-value motors">
                {system?.activePumps || 0}/6
              </div>
            </div>
          </div>
        </div>

        {/* Setpoint Configuration */}
        <div className="setpoints-config">
          <div className="config-header">
            <span className="config-icon">⚙️</span>
            <span className="config-title">Setpoint Configuration</span>
          </div>

          <div className="input-grid-compact">
            {/* Flow Setpoint */}
            <div className="input-group-compact">
              <div className="input-header-compact">
                <span className="input-icon">💧</span>
                <label className="input-label">Flow Rate</label>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="setpoint-input-compact"
                  value={flowSetpoint}
                  onChange={(e) => setFlowSetpoint(e.target.value)}
                  min={flowRange.min}
                  max={flowRange.max}
                  step="0.1"
                  disabled={isSaving}
                />
                <span className="input-unit">L/min</span>
              </div>
              <div className="input-range-compact">
                {flowRange.min} - {flowRange.max} L/min
              </div>
            </div>

            {/* Pressure Setpoint */}
            <div className="input-group-compact">
              <div className="input-header-compact">
                <span className="input-icon">⚡</span>
                <label className="input-label">Pressure</label>
              </div>
              <div className="input-container">
                <input
                  type="number"
                  className="setpoint-input-compact"
                  value={pressureSetpoint}
                  onChange={(e) => setPressureSetpoint(e.target.value)}
                  min={pressureRange.min}
                  max={pressureRange.max}
                  step="0.1"
                  disabled={isSaving}
                />
                <span className="input-unit">bar</span>
              </div>
              <div className="input-range-compact">
                {pressureRange.min} - {pressureRange.max} bar
              </div>
            </div>
          </div>
        </div>

        {/* Safety Information - Compact */}
        <div className="safety-info-compact">
          <span className="safety-icon">🛡️</span>
          <span className="safety-text-compact">Changes apply immediately to all motors. Monitor system response.</span>
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
            {isSaving ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSetpointsModal;