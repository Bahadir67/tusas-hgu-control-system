import React from 'react';
import './LogoutModal.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stage: 'initial' | 'final';
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm, stage }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay">
      <div className={`logout-modal ${stage === 'final' ? 'critical' : 'warning'}`}>
        {/* Flashing Warning Lights */}
        <div className="warning-lights">
          <div className="warning-light left"></div>
          <div className="warning-light right"></div>
        </div>

        {/* Header with Animated Icon */}
        <div className="modal-header">
          <div className="warning-icon-container">
            <span className="warning-icon">⚠️</span>
            {stage === 'final' && <span className="critical-icon">🛑</span>}
          </div>
          <h2 className="modal-title">
            {stage === 'initial' 
              ? 'SİSTEM UYARISI - SYSTEM WARNING' 
              : '🚨 KRİTİK UYARI - CRITICAL WARNING 🚨'}
          </h2>
        </div>

        {/* Animated Alert Bar */}
        <div className="alert-bar">
          <div className="alert-text">
            {stage === 'initial' ? 'DİKKAT' : 'TEHLİKE'} • 
            {stage === 'initial' ? 'ATTENTION' : 'DANGER'} • 
            {stage === 'initial' ? 'DİKKAT' : 'TEHLİKE'} • 
            {stage === 'initial' ? 'ATTENTION' : 'DANGER'}
          </div>
        </div>

        {/* Message Content */}
        <div className="modal-content">
          {stage === 'initial' ? (
            <>
              <div className="message-section">
                <h3>🇹🇷 TÜRKÇE</h3>
                <p className="warning-message">
                  <strong>HİDROLİK SİSTEM ÇALIŞIYOR!</strong><br/>
                  Çıkış yaparsanız tüm hidrolik sistemler DERHAL DURDURULACAKTIR.<br/>
                  Bu işlem geri alınamaz ve sistem güvenliği için gereklidir.
                </p>
              </div>
              
              <div className="message-section">
                <h3>🇬🇧 ENGLISH</h3>
                <p className="warning-message">
                  <strong>HYDRAULIC SYSTEM IS RUNNING!</strong><br/>
                  If you logout, all hydraulic systems will be IMMEDIATELY STOPPED.<br/>
                  This action cannot be undone and is required for system safety.
                </p>
              </div>

              <div className="system-status">
                <div className="status-item">
                  <span className="status-indicator active"></span>
                  <span>Motor 1-6: ACTIVE</span>
                </div>
                <div className="status-item">
                  <span className="status-indicator active"></span>
                  <span>Pressure: 125.5 bar</span>
                </div>
                <div className="status-item">
                  <span className="status-indicator active"></span>
                  <span>Flow: 450 L/min</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="critical-message">
                <div className="skull-icon">☠️</div>
                <h3>SON UYARI - FINAL WARNING</h3>
                <div className="skull-icon">☠️</div>
              </div>
              
              <div className="shutdown-sequence">
                <p className="sequence-title">KAPATMA SIRASI / SHUTDOWN SEQUENCE:</p>
                <ol className="sequence-list">
                  <li>✓ Tüm motorlar durdurulacak / All motors will stop</li>
                  <li>✓ Basınç tahliye edilecek / Pressure will be released</li>
                  <li>✓ Vanalar kapatılacak / Valves will be closed</li>
                  <li>✓ Acil durdurma aktif edilecek / Emergency stop activated</li>
                  <li>✓ Sistem kilidi devreye girecek / System lock engaged</li>
                </ol>
              </div>

              <div className="countdown-warning">
                <span className="countdown-text">İŞLEM GERİ ALINAMAZ!</span>
                <span className="countdown-text">THIS CANNOT BE UNDONE!</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button 
            className="btn-cancel"
            onClick={onClose}
          >
            <span className="btn-icon">↩️</span>
            {stage === 'initial' ? 'İPTAL / CANCEL' : 'VAZGEç / ABORT'}
          </button>
          
          <button 
            className={`btn-confirm ${stage === 'final' ? 'btn-danger' : 'btn-warning'}`}
            onClick={onConfirm}
          >
            <span className="btn-icon">
              {stage === 'initial' ? '⚠️' : '💀'}
            </span>
            {stage === 'initial' 
              ? 'ÇIKIŞ YAP / LOGOUT' 
              : 'SİSTEMİ DURDUR VE ÇIKIŞ / STOP & EXIT'}
          </button>
        </div>

        {/* Emergency Contact */}
        {stage === 'final' && (
          <div className="emergency-contact">
            <span className="emergency-icon">📞</span>
            <span>Acil Durum / Emergency: +90 312 XXX XX XX</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoutModal;