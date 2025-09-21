import React, { useState, useEffect } from 'react';
import './LogoutModal.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      
      // Animate progress bar
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay">
      <div className="logout-modal">
        {/* Animated Background */}
        <div className="modal-background">
          <div className="bg-circle circle-1"></div>
          <div className="bg-circle circle-2"></div>
          <div className="bg-circle circle-3"></div>
          <div className="bg-grid"></div>
        </div>

        {/* Main Content */}
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div className="header-icon">
              <div className="icon-container">
                <span className="icon">🚨</span>
                <div className="icon-pulse"></div>
              </div>
            </div>
            <div className="header-text">
              <h2 className="modal-title">System Shutdown</h2>
              <p className="modal-subtitle">Critical Action Required</p>
            </div>
          </div>

          {/* Warning Section */}
          <div className="warning-section">
            <div className="warning-card">
              <div className="warning-icon">
                <span>⚠️</span>
              </div>
              <div className="warning-content">
                <h3 className="warning-title">Hydraulic System Active</h3>
                <p className="warning-text">
                  All motors and hydraulic systems are currently operational. 
                  This action will immediately stop all operations and safely shut down the system.
                </p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="status-section">
            <h3 className="section-title">Current System Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <div className="status-icon active">
                  <span>⚡</span>
                </div>
                <div className="status-info">
                  <div className="status-label">Motors</div>
                  <div className="status-value active">ACTIVE</div>
                </div>
              </div>
              <div className="status-item">
                <div className="status-icon">
                  <span>📊</span>
                </div>
                <div className="status-info">
                  <div className="status-label">Pressure</div>
                  <div className="status-value">125.5 bar</div>
                </div>
              </div>
              <div className="status-item">
                <div className="status-icon">
                  <span>💧</span>
                </div>
                <div className="status-info">
                  <div className="status-label">Flow Rate</div>
                  <div className="status-value">450 L/min</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shutdown Sequence */}
          <div className="sequence-section">
            <h3 className="section-title">Shutdown Sequence</h3>
            <div className="sequence-timeline">
              <div className="sequence-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <div className="step-title">Stop Motors</div>
                  <div className="step-description">Halt all motor operations</div>
                </div>
              </div>
              <div className="sequence-arrow">→</div>
              <div className="sequence-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <div className="step-title">Release Pressure</div>
                  <div className="step-description">Safely depressurize system</div>
                </div>
              </div>
              <div className="sequence-arrow">→</div>
              <div className="sequence-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <div className="step-title">Close Valves</div>
                  <div className="step-description">Seal all hydraulic valves</div>
                </div>
              </div>
              <div className="sequence-arrow">→</div>
              <div className="sequence-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <div className="step-title">System Logout</div>
                  <div className="step-description">Terminate user session</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">System ready for shutdown</div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={handleClose}>
              <span className="btn-icon">✕</span>
              Cancel Operation
            </button>
            <button className="btn-confirm" onClick={handleConfirm}>
              <span className="btn-icon">⚡</span>
              Execute Shutdown
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="modal-glow"></div>
        <div className="modal-border"></div>
      </div>
    </div>
  );
};

export default LogoutModal;
