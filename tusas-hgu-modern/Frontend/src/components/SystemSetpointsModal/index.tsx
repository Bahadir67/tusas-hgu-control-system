import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import { useSystemOpcHint } from '../../hooks/useOpcHint';
import './SystemSetpointsModal.css';

interface SystemSetpointsModalProps {
  onClose: () => void;
}

const SystemSetpointsModal: React.FC<SystemSetpointsModalProps> = ({ onClose }) => {
  const system = useOpcStore((state) => state.system);
  const fetchPageData = useOpcStore((state) => state.fetchPageData);
  const [flowSetpoint, setFlowSetpoint] = useState(system?.totalFlowSetpoint?.toString() || '');
  const [pressureSetpoint, setPressureSetpoint] = useState(system?.pressureSetpoint?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOpc, setIsLoadingOpc] = useState(false);
  
  // OPC hints for input fields
  const flowHint = useSystemOpcHint('flowSetpoint');
  const pressureHint = useSystemOpcHint('pressureSetpoint');
  
  // Load setpoints - first from store, then automatically from OPC
  useEffect(() => {
    console.log('Loading setpoints from store:', system);
    
    // First, set store values immediately (for instant display)
    if (system?.totalFlowSetpoint !== undefined) {
      setFlowSetpoint(system.totalFlowSetpoint.toString());
      console.log('Set flow setpoint from store:', system.totalFlowSetpoint);
    }
    if (system?.pressureSetpoint !== undefined) {
      setPressureSetpoint(system.pressureSetpoint.toString());
      console.log('Set pressure setpoint from store:', system.pressureSetpoint);
    }
    
    // Then automatically load from OPC after modal is rendered (non-blocking)
    const autoLoadFromOpc = async () => {
      try {
        console.log('Auto-loading setpoints from OPC...');
        
        // Check if token exists, get new one if needed
        let token = localStorage.getItem('token');
        if (!token) {
          const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            localStorage.setItem('token', loginData.token);
            token = loginData.token;
          }
        }
        
        if (token) {
          const [flowResponse, pressureResponse] = await Promise.all([
            opcApi.readVariable('SYSTEM_FLOW_SETPOINT'),
            opcApi.readVariable('SYSTEM_PRESSURE_SETPOINT')
          ]);
          
          console.log('Auto-loaded OPC values - Flow:', flowResponse.value, 'Pressure:', pressureResponse.value);
          
          if (flowResponse.value !== undefined) {
            setFlowSetpoint(flowResponse.value.toString());
          }
          if (pressureResponse.value !== undefined) {
            setPressureSetpoint(pressureResponse.value.toString());
          }
        }
      } catch (error) {
        console.warn('Auto OPC loading failed (silent):', error);
        // Silent fail - keep store values, don't show error to user
      }
    };
    
    // Auto-load OPC values after modal renders (800ms delay to ensure stability)
    const timer = setTimeout(autoLoadFromOpc, 800);
    return () => clearTimeout(timer);
  }, []); // Run only once when modal opens

  // Operating ranges for validation
  const flowRange = { min: 100, max: 600 };
  const pressureRange = { min: 50, max: 200 };

  // Manual OPC loading function
  const handleLoadFromOpc = async () => {
    setIsLoadingOpc(true);
    try {
      console.log('Manually loading setpoints from OPC...');
      
      // Check if token exists
      const token = localStorage.getItem('token');
      console.log('Current localStorage token:', token?.slice(0, 50) + '...');
      
      if (!token) {
        // Try to get a fresh token
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          localStorage.setItem('token', loginData.token);
          console.log('New token obtained and stored');
        } else {
          throw new Error('Could not authenticate');
        }
      }
      
      const [flowResponse, pressureResponse] = await Promise.all([
        opcApi.readVariable('SYSTEM_FLOW_SETPOINT'),
        opcApi.readVariable('SYSTEM_PRESSURE_SETPOINT')
      ]);
      
      console.log('OPC Flow response:', flowResponse);
      console.log('OPC Pressure response:', pressureResponse);
      
      if (flowResponse.value !== undefined) {
        setFlowSetpoint(flowResponse.value.toString());
      }
      if (pressureResponse.value !== undefined) {
        setPressureSetpoint(pressureResponse.value.toString());
      }
      
      alert('Values loaded from OPC successfully!');
    } catch (error) {
      console.error('Failed to load OPC setpoints:', error);
      console.error('Error details:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Could not load current values from OPC server: ${message}`);
    } finally {
      setIsLoadingOpc(false);
    }
  };

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
      // Write system setpoints to OPC server (fixed variable names)
      await Promise.all([
        opcApi.writeVariable('SYSTEM_FLOW_SETPOINT', parseFloat(flowSetpoint)),
        opcApi.writeVariable('SYSTEM_PRESSURE_SETPOINT', parseFloat(pressureSetpoint)),
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
      setFlowSetpoint('');
      setPressureSetpoint('');
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
                  title={flowHint}
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
                  title={pressureHint}
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
            disabled={isSaving || isLoadingOpc}
          >
            🔄 Reset
          </button>
          
          <button 
            className="action-button-compact cancel-button" 
            onClick={onClose}
            disabled={isSaving || isLoadingOpc}
          >
            Cancel
          </button>
          
          <button 
            className="action-button-compact save-button" 
            onClick={handleSave}
            disabled={isSaving || isLoadingOpc}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSetpointsModal;