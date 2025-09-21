import React, { useState } from 'react';
import { opcApi } from '../../services/api';
import './MaintenanceLogModal.css';

interface MaintenanceLogModalProps {
  motorId: number;
  currentHours: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MaintenanceFormData {
  username: string;
  password: string;
  maintenanceType: string;
  description: string;
  resetCounter: boolean;
}

const MaintenanceLogModal: React.FC<MaintenanceLogModalProps> = ({ 
  motorId, 
  currentHours,
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    username: '',
    password: '',
    maintenanceType: 'routine',
    description: '',
    resetCounter: true // Default olarak işaretli
  });

  const maintenanceTypes = [
    { value: 'routine', label: 'Routine Maintenance' },
    { value: 'filter', label: 'Filter Replacement' },
    { value: 'oil', label: 'Oil Change' },
    { value: 'bearing', label: 'Bearing Service' },
    { value: 'calibration', label: 'Sensor Calibration' },
    { value: 'emergency', label: 'Emergency Repair' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      alert('Please enter username and password');
      return;
    }

    if (!formData.description) {
      alert('Please enter maintenance description');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Authenticate technician
      const authResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      if (!authResponse.ok) {
        throw new Error('Invalid credentials');
      }

      const authData = await authResponse.json();
      const token = authData.token;

      // 2. Log maintenance to database
      const logResponse = await fetch('http://localhost:5000/api/maintenance/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          motorId,
          technicianId: formData.username,
          maintenanceType: formData.maintenanceType,
          description: formData.description,
          operatingHoursAtMaintenance: currentHours,
          maintenanceDate: new Date().toISOString()
        })
      });

      if (!logResponse.ok) {
        throw new Error('Failed to log maintenance');
      }

      // 3. Reset PLC counter if requested
      if (formData.resetCounter) {
        // Reset operating hours
        await opcApi.writeVariable(`MOTOR_${motorId}_OPERATING_HOURS`, 0);
        
        // Clear maintenance due flag
        await opcApi.writeVariable(`MOTOR_${motorId}_MAINTENANCE_DUE`, false);
        
        console.log(`✅ Motor ${motorId} maintenance counter reset successfully`);
      }

      alert(`✅ Maintenance logged successfully!${formData.resetCounter ? '\nCounter has been reset.' : ''}`);
      
      // Clear form
      setFormData({
        username: '',
        password: '',
        maintenanceType: 'routine',
        description: '',
        resetCounter: true
      });

      onSuccess(); // Refresh parent data
      onClose();
      
    } catch (error: any) {
      console.error('❌ Maintenance log error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="maintenance-log-modal">
        <div className="modal-header">
          <h2>🔧 Log Maintenance - Motor {motorId}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Authentication Section */}
          <div className="form-section auth-section">
            <h3>🔐 Technician Authentication</h3>
            <div className="form-group">
              <label>
                Username:
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Enter technician username"
                  required
                  disabled={isLoading}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Password:
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>

          <hr className="section-separator" />

          {/* Maintenance Details Section */}
          <div className="form-section maintenance-section">
            <h3>📝 Maintenance Details</h3>
            
            <div className="form-group">
              <label>
                Maintenance Type:
                <select
                  value={formData.maintenanceType}
                  onChange={(e) => setFormData({...formData, maintenanceType: e.target.value})}
                  disabled={isLoading}
                >
                  {maintenanceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-group">
              <label>
                Description:
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the maintenance work performed..."
                  rows={4}
                  required
                  disabled={isLoading}
                />
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.resetCounter}
                  onChange={(e) => setFormData({...formData, resetCounter: e.target.checked})}
                  disabled={isLoading}
                />
                <span>Reset operating hours counter to 0</span>
              </label>
              <small className="help-text">
                ⚠️ Check this only if maintenance has been completed
              </small>
            </div>

            {/* Info Display */}
            <div className="info-display">
              <div className="info-item">
                <span className="info-label">📅 Date:</span>
                <span className="info-value">{new Date().toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">⏰ Time:</span>
                <span className="info-value">{new Date().toLocaleTimeString('tr-TR')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">⏱️ Current Hours:</span>
                <span className="info-value">{currentHours?.toFixed(1) || '0'} hrs</span>
              </div>
              {formData.resetCounter && (
                <div className="info-item warning">
                  <span className="info-label">🔄 After Reset:</span>
                  <span className="info-value">0 hrs</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Processing...' : '✅ Log Maintenance'}
            </button>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default MaintenanceLogModal;