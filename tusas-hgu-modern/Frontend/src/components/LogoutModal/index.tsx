import React from 'react';
import './LogoutModal.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay">
      <div className="logout-modal premium-scada-modal">
        {/* Compact Header */}
        <div className="modal-header">
          <div className="status-indicator"></div>
          <h3 className="modal-title">System Logout & Shutdown</h3>
          <div className="severity-level">CRITICAL</div>
        </div>

        {/* Compact Message Content */}
        <div className="modal-content">
          <div className="message-text critical">
            <p><strong>Hydraulic system is currently active.</strong></p>
            <p>This action will immediately:</p>
            <p>• Stop all hydraulic operations</p>
            <p>• Log out from the system</p>
            <p>• Shut down all motors and release pressure</p>
          </div>

          <div className="system-status">
            <div className="status-row">
              <span className="status-label">Motors:</span>
              <span className="status-value active">ACTIVE</span>
            </div>
            <div className="status-row">
              <span className="status-label">Pressure:</span>
              <span className="status-value">125.5 bar</span>
            </div>
            <div className="status-row">
              <span className="status-label">Flow:</span>
              <span className="status-value">450 L/min</span>
            </div>
          </div>

          <div className="shutdown-info">
            <div className="info-title">Shutdown sequence:</div>
            <div className="sequence-items">
              <span>Stop motors</span> →
              <span>Release pressure</span> →
              <span>Close valves</span> →
              <span>System logout</span>
            </div>
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary critical"
            onClick={onConfirm}
          >
            Stop System & Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;