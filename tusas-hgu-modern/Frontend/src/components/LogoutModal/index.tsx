import React, { useState, useEffect } from 'react';
import './LogoutModal.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-content">
          {/* Compact Header */}
          <div className="logout-modal-header">
            <span className="logout-icon">⚠️</span>
            <div className="logout-header-text">
              <h2 className="logout-title">System Logout</h2>
              <p className="logout-subtitle">Confirm Action</p>
            </div>
          </div>

          {/* Simple Warning */}
          <div className="logout-warning">
            <p>All active motors and hydraulic operations will be safely stopped.</p>
          </div>

          {/* Buttons */}
          <div className="logout-actions">
            <button className="logout-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="logout-btn-confirm" onClick={onConfirm}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
