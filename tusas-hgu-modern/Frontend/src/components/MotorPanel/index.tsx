import React, { useState } from 'react';
import { useOpcStore } from '../../store/opcStore';
import SettingsModal from '../SettingsModal';
import SimpleGauge from '../SimpleGauge';
import { opcApi } from '../../services/api';

interface MotorPanelProps {
  motorId: number;
  isSpecial?: boolean; // For Motor 7 (fixed-flow pump)
}

const MotorPanel: React.FC<MotorPanelProps> = ({ motorId, isSpecial = false }) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  const [showSettings, setShowSettings] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Get status text and class
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Ready', class: 'status-ready' };
      case 1: return { text: 'Running', class: 'status-running' };
      case 2: return { text: 'Warning', class: 'status-warning' };
      case 3: return { text: 'Error', class: 'status-error' };
      default: return { text: 'Unknown', class: 'status-ready' };
    }
  };

  // Get filter status icon
  const getFilterIcon = (status: number) => {
    switch (status) {
      case 0: return '❌'; // Error
      case 1: return '⚠️'; // Warning
      case 2: return '✅'; // Normal
      default: return '❓';
    }
  };

  // Handle enable/disable toggle
  const handleEnableToggle = async () => {
    if (isEnabling) return;
    
    setIsEnabling(true);
    try {
      await opcApi.writeVariable(
        `MOTOR_${motorId}_ENABLE_EXECUTION`,
        motor.enabled ? 0 : 1
      );
    } catch (error) {
      console.error('Failed to toggle motor enable:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const statusInfo = getStatusInfo(motor.status);

  // Get value color based on thresholds
  const getValueColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'var(--color-value-critical)';
    if (value >= warning) return 'var(--color-value-high)';
    if (value < warning * 0.8) return 'var(--color-value-low)';
    return 'var(--color-value-normal)';
  };

  return (
    <>
      <div className={`motor-panel ${statusInfo.class} ${isSpecial ? 'motor-panel-special' : ''}`}>
        {/* Header */}
        <div className="motor-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="motor-title">
              MOTOR {motorId} {isSpecial && '(Ana Pompa)'}
            </h3>
            <span className={`status-indicator ${statusInfo.class}`} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {statusInfo.text}
            </span>
          </div>
          
          {/* Enable/Disable Switch */}
          <div
            className={`enable-switch ${motor.enabled ? 'enabled' : ''}`}
            onClick={handleEnableToggle}
            style={{ opacity: isEnabling ? 0.5 : 1 }}
            role="switch"
            aria-checked={motor.enabled}
            aria-label={`Motor ${motorId} ${motor.enabled ? 'aktif' : 'pasif'}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleEnableToggle();
              }
            }}
          >
            <div className="enable-switch-slider" />
          </div>
        </div>

        {/* Hydraulic Pump Gauges Display - Motor 1 Special Layout */}
        {motorId === 1 ? (
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            {/* Upper Row: RPM, Pressure, Flow Rate */}
            <div className="motor-gauges" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xs)',
              marginBottom: 'var(--spacing-sm)',
              justifyItems: 'center'
            }}>
              <SimpleGauge
                value={motor.rpm}
                min={0}
                max={3000}
                unit="RPM"
                label="DEVIR"
                size={75}
                warningThreshold={2700}
                criticalThreshold={2900}
              />
              
              <SimpleGauge
                value={motor.pressure}
                min={0}
                max={200}
                unit="bar"
                label="BASINÇ"
                size={75}
                warningThreshold={160}
                criticalThreshold={180}
              />
              
              <SimpleGauge
                value={motor.flow}
                min={0}
                max={100}
                unit="L/min"
                label="DEBİ"
                size={75}
                warningThreshold={85}
                criticalThreshold={95}
              />
            </div>

            {/* Lower Row: Current, Power, Motor Temperature */}
            <div className="motor-gauges" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-xs)',
              justifyItems: 'center'
            }}>
              <SimpleGauge
                value={motor.current}
                min={0}
                max={200}
                unit="A"
                label="AKIM"
                size={75}
                warningThreshold={140}
                criticalThreshold={160}
              />
              
              <SimpleGauge
                value={motor.power || motor.current * 220 * 1.73 / 1000} // Approximate power if not available
                min={0}
                max={100}
                unit="kW"
                label="GÜÇ"
                size={75}
                warningThreshold={85}
                criticalThreshold={95}
              />
              
              <SimpleGauge
                value={motor.temperature}
                min={0}
                max={100}
                unit="°C"
                label="SICAKLIK"
                size={75}
                warningThreshold={60}
                criticalThreshold={75}
              />
            </div>
          </div>
        ) : (
          /* Original Layout for Other Motors */
          <div className="motor-gauges" style={{
            display: 'grid',
            gridTemplateColumns: isSpecial ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-md)',
            justifyItems: 'center'
          }}>
            {/* RPM Gauge */}
            <SimpleGauge
              value={motor.rpm}
              min={0}
              max={3000}
              unit="RPM"
              label="DEVIR"
              size={90}
              warningThreshold={2700}
              criticalThreshold={2900}
            />
            
            {/* Pressure Gauge */}
            <SimpleGauge
              value={motor.pressure}
              min={0}
              max={200}
              unit="bar"
              label="BASINÇ"
              size={90}
              warningThreshold={160}
              criticalThreshold={180}
            />
            
            {!isSpecial && (
              /* Flow Gauge - Only for normal motors */
              <SimpleGauge
                value={motor.flow}
                min={0}
                max={100}
                unit="L/min"
                label="DEBİ"
                size={90}
                warningThreshold={85}
                criticalThreshold={95}
              />
            )}
          </div>
        )}

        {/* Digital Values Display - Only for non-Motor 1 or minimal info for Motor 1 */}
        {motorId !== 1 ? (
          <div className="motor-values" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-md)'
          }}>
            {/* Current */}
            <div className="digital-display">
              <div className="digital-label">AKIM</div>
              <div 
                className="digital-value"
                style={{ color: getValueColor(motor.current, 140, 160) }}
              >
                {motor.current.toFixed(1)}
              </div>
              <div className="digital-unit">A</div>
            </div>

            {/* Temperature */}
            <div className="digital-display">
              <div className="digital-label">SICAKLIK</div>
              <div 
                className="digital-value"
                style={{ color: getValueColor(motor.temperature, 60, 75) }}
              >
                {motor.temperature.toFixed(0)}
              </div>
              <div className="digital-unit">°C</div>
            </div>

            {/* Target RPM */}
            <div className="digital-display">
              <div className="digital-label">HEDEF RPM</div>
              <div className="digital-value" style={{ color: 'var(--color-text-secondary)' }}>
                {motor.targetRpm.toFixed(0)}
              </div>
              <div className="digital-unit">RPM</div>
            </div>

            {/* Leak */}
            <div className="digital-display">
              <div className="digital-label">SIZINTI</div>
              <div 
                className="digital-value"
                style={{ color: getValueColor(motor.leak, 0.02, 0.05) }}
              >
                {motor.leak.toFixed(2)}
              </div>
              <div className="digital-unit">L/min</div>
            </div>
          </div>
        ) : (
          /* Motor 1 - Only essential digital info */
          <div className="motor-values" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-md)'
          }}>
            {/* Target RPM */}
            <div className="digital-display">
              <div className="digital-label">HEDEF RPM</div>
              <div className="digital-value" style={{ color: 'var(--color-text-secondary)' }}>
                {motor.targetRpm.toFixed(0)}
              </div>
              <div className="digital-unit">RPM</div>
            </div>

            {/* Leak */}
            <div className="digital-display">
              <div className="digital-label">SIZINTI</div>
              <div 
                className="digital-value"
                style={{ color: getValueColor(motor.leak, 0.02, 0.05) }}
              >
                {motor.leak.toFixed(2)}
              </div>
              <div className="digital-unit">L/min</div>
            </div>
          </div>
        )}

        {/* Setpoints Display */}
        <div className="setpoints-display" style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--color-text-dim)',
          marginBottom: 'var(--spacing-sm)',
          padding: 'var(--spacing-xs)',
          background: 'var(--color-bg-control)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <span>Basınç SP: {motor.pressureSetpoint.toFixed(1)} bar</span>
          <span>Debi SP: {motor.flowSetpoint.toFixed(1)} L/min</span>
        </div>

        {/* Control Indicators */}
        <div className="control-indicators" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-sm) 0'
        }}>
          {/* Valve Status */}
          <div 
            className={`indicator ${motor.valve ? 'indicator-valve-open' : 'indicator-valve-closed'}`}
            title={motor.valve ? 'Vana Açık' : 'Vana Kapalı'}
            role="status"
            aria-label={`Vana ${motor.valve ? 'açık' : 'kapalı'}`}
          >
            🔧
          </div>

          {/* Line Filter Status */}
          <div 
            className={`indicator indicator-filter-${
              motor.lineFilter === 0 ? 'error' : 
              motor.lineFilter === 1 ? 'warning' : 'normal'
            }`}
            title={`Hat Filtresi: ${
              motor.lineFilter === 0 ? 'Hata' : 
              motor.lineFilter === 1 ? 'Uyarı' : 'Normal'
            }`}
            role="status"
            aria-label={`Hat filtresi ${
              motor.lineFilter === 0 ? 'hata' : 
              motor.lineFilter === 1 ? 'uyarı' : 'normal'
            }`}
          >
            🔍
          </div>

          {/* Suction Filter Status */}
          <div 
            className={`indicator indicator-filter-${
              motor.suctionFilter === 0 ? 'error' : 
              motor.suctionFilter === 1 ? 'warning' : 'normal'
            }`}
            title={`Emme Filtresi: ${
              motor.suctionFilter === 0 ? 'Hata' : 
              motor.suctionFilter === 1 ? 'Uyarı' : 'Normal'
            }`}
            role="status"
            aria-label={`Emme filtresi ${
              motor.suctionFilter === 0 ? 'hata' : 
              motor.suctionFilter === 1 ? 'uyarı' : 'normal'
            }`}
          >
            🔧
          </div>

          {/* Settings Button */}
          <button
            className="settings-button"
            onClick={() => setShowSettings(true)}
            title="Motor Ayarları"
            aria-label={`Motor ${motorId} ayarlarını aç`}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          motorId={motorId}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
};

export default MotorPanel;