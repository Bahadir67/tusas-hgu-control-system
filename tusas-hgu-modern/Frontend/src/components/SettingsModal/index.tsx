import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';

interface SettingsModalProps {
  motorId: number;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ motorId, onClose }) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  const fetchPageData = useOpcStore((state) => state.fetchPageData);
  const [pressureSetpoint, setPressureSetpoint] = useState(motor.pressureSetpoint.toString());
  const [flowSetpoint, setFlowSetpoint] = useState(motor.flowSetpoint.toString());
  const [targetRpm, setTargetRpm] = useState(motor.targetRpm.toString());
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch latest data when modal opens
  useEffect(() => {
    fetchPageData('motors').catch(console.error);
  }, [fetchPageData]);
  
  // Update form values when motor data changes
  useEffect(() => {
    setPressureSetpoint(motor.pressureSetpoint.toString());
    setFlowSetpoint(motor.flowSetpoint.toString());
    setTargetRpm(motor.targetRpm.toString());
  }, [motor.pressureSetpoint, motor.flowSetpoint, motor.targetRpm]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Write setpoints to OPC server
      await Promise.all([
        opcApi.writeVariable(`MOTOR_${motorId}_PRESSURE_SETPOINT`, pressureSetpoint),
        opcApi.writeVariable(`MOTOR_${motorId}_FLOW_SETPOINT`, flowSetpoint),
        opcApi.writeVariable(`MOTOR_${motorId}_TARGET_EXECUTION`, targetRpm),
      ]);
      
      // Update local store
      useOpcStore.getState().updateMotor(motorId, {
        pressureSetpoint: parseFloat(pressureSetpoint),
        flowSetpoint: parseFloat(flowSetpoint),
        targetRpm: parseFloat(targetRpm),
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Ayarlar kaydedilemedi!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeakTest = async () => {
    if (!window.confirm('Sızıntı testi başlatmak istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      await opcApi.writeVariable(`MOTOR_${motorId}_LEAK_EXECUTION`, 1);
      alert('Sızıntı testi başlatıldı');
      onClose();
    } catch (error) {
      console.error('Failed to start leak test:', error);
      alert('Sızıntı testi başlatılamadı!');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-header">Motor {motorId} Ayarları</h2>
        
        {/* Pressure Setpoint */}
        <div className="modal-input-group">
          <label className="modal-input-label">Basınç Setpoint (bar)</label>
          <input
            type="number"
            className="modal-input"
            value={pressureSetpoint}
            onChange={(e) => setPressureSetpoint(e.target.value)}
            min="0"
            max="200"
            step="0.1"
          />
        </div>
        
        {/* Flow Setpoint */}
        <div className="modal-input-group">
          <label className="modal-input-label">Debi Setpoint (L/min)</label>
          <input
            type="number"
            className="modal-input"
            value={flowSetpoint}
            onChange={(e) => setFlowSetpoint(e.target.value)}
            min="0"
            max="150"
            step="0.1"
          />
        </div>
        
        {/* Target RPM */}
        <div className="modal-input-group">
          <label className="modal-input-label">Hedef RPM</label>
          <input
            type="number"
            className="modal-input"
            value={targetRpm}
            onChange={(e) => setTargetRpm(e.target.value)}
            min="0"
            max="3000"
            step="10"
          />
        </div>
        
        {/* Current Values Display */}
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: '#1a1a1a', 
          borderRadius: '4px',
          fontSize: '13px',
          color: '#b8b8b8'
        }}>
          <div>Mevcut Basınç: {motor.pressure.toFixed(1)} bar</div>
          <div>Mevcut Debi: {motor.flow.toFixed(1)} L/min</div>
          <div>Mevcut RPM: {motor.rpm.toFixed(0)}</div>
          <div>Motor Durumu: {motor.enabled ? 'Aktif' : 'Pasif'}</div>
        </div>
        
        {/* Buttons */}
        <div className="modal-buttons">
          <button 
            className="button button-secondary"
            onClick={handleLeakTest}
            style={{ marginRight: 'auto' }}
          >
            Sızıntı Testi
          </button>
          
          <button 
            className="button button-secondary" 
            onClick={onClose}
            disabled={isSaving}
          >
            İptal
          </button>
          
          <button 
            className="button button-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;