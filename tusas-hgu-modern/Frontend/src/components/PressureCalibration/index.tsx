import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import './PressureCalibration.css';

interface PressureCalibrationData {
  sensors: {
    [sensorName: string]: {
      offset: number;
      scaleFactor: number;
      minLimit: number;
      maxLimit: number;
    };
  };
  referenceValue: number;
}

interface PressureCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (calibrationData: PressureCalibrationData) => void;
}

interface SensorData {
  name: string;
  displayName: string;
  variableName: string;
  setpointVariableName: string;
  currentValue: number;
  setpointValue: number;
  unit: string;
  status: 'normal' | 'warning' | 'error';
}

const PressureCalibration: React.FC<PressureCalibrationProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  // OPC Store state
  const motors = useOpcStore((state) => state.motors);
  const systemPressure = useOpcStore((state) => state.system.totalPressure || 0);
  const systemPressureSetpoint = useOpcStore((state) => state.system.pressureSetpoint || 0);

  // Loading and modal states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Reference pressure for calibration testing
  const [referenceValue, setReferenceValue] = useState(100.0);

  // Calibration data for each sensor
  const [calibrationData, setCalibrationData] = useState<{
    [sensorName: string]: {
      offset: number;
      scaleFactor: number;
      minLimit: number;
      maxLimit: number;
    };
  }>({});

  // Define all pressure sensors
  const pressureSensors: SensorData[] = [
    // Motor pressure sensors
    ...Array.from({ length: 7 }, (_, i) => ({
      name: `motor_${i + 1}`,
      displayName: `Motor ${i + 1} Pressure`,
      variableName: `PUMP_${i + 1}_PRESSURE_ACTUAL`,
      setpointVariableName: `PUMP_${i + 1}_PRESSURE_SETPOINT`,
      currentValue: motors[i + 1]?.pressure || 0,
      setpointValue: motors[i + 1]?.pressureSetpoint || 0,
      unit: 'Bar',
      status: getMotorPressureStatus(motors[i + 1]?.pressure || 0, motors[i + 1]?.pressureSetpoint || 0)
    })),
    // System pressure sensor
    {
      name: 'system',
      displayName: 'System Pressure',
      variableName: 'TOTAL_SYSTEM_PRESSURE',
      setpointVariableName: 'SYSTEM_PRESSURE_SETPOINT',
      currentValue: systemPressure,
      setpointValue: systemPressureSetpoint,
      unit: 'Bar',
      status: getSystemPressureStatus(systemPressure, systemPressureSetpoint)
    }
  ];

  // Initialize calibration data
  useEffect(() => {
    if (isOpen) {
      const initialCalibrationData: typeof calibrationData = {};
      pressureSensors.forEach(sensor => {
        initialCalibrationData[sensor.name] = {
          offset: 0.0,
          scaleFactor: 1.0,
          minLimit: 0.0,
          maxLimit: 300.0
        };
      });
      setCalibrationData(initialCalibrationData);
    }
  }, [isOpen]);

  // Status determination functions
  function getMotorPressureStatus(current: number, setpoint: number): 'normal' | 'warning' | 'error' {
    const deviation = Math.abs(current - setpoint);
    if (deviation > setpoint * 0.15) return 'error';
    if (deviation > setpoint * 0.1) return 'warning';
    return 'normal';
  }

  function getSystemPressureStatus(current: number, setpoint: number): 'normal' | 'warning' | 'error' {
    const deviation = Math.abs(current - setpoint);
    if (deviation > 20) return 'error';
    if (deviation > 10) return 'warning';
    return 'normal';
  }

  // Calibration control handlers
  const handleCalibrationChange = (
    sensorName: string,
    field: keyof typeof calibrationData[string],
    value: number
  ) => {
    setCalibrationData(prev => ({
      ...prev,
      [sensorName]: {
        ...prev[sensorName],
        [field]: value
      }
    }));
  };

  const handleZeroCalibration = async (sensorName: string) => {
    try {
      setIsLoading(true);

      // Zero calibration sets offset to negative current value
      const sensor = pressureSensors.find(s => s.name === sensorName);
      if (sensor) {
        const offset = -sensor.currentValue;
        handleCalibrationChange(sensorName, 'offset', offset);

        console.log(`Zero calibration applied to ${sensor.displayName}: offset = ${offset.toFixed(2)} Bar`);
      }
    } catch (error) {
      console.error('Zero calibration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpanCalibration = async (sensorName: string) => {
    try {
      setIsLoading(true);

      // Span calibration adjusts scale factor based on reference value
      const sensor = pressureSensors.find(s => s.name === sensorName);
      if (sensor && referenceValue > 0) {
        const scaleFactor = referenceValue / sensor.currentValue;
        handleCalibrationChange(sensorName, 'scaleFactor', scaleFactor);

        console.log(`Span calibration applied to ${sensor.displayName}: scale = ${scaleFactor.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Span calibration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal control handlers
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const calibrationOutput: PressureCalibrationData = {
        sensors: calibrationData,
        referenceValue
      };

      // Apply calibration to OPC system
      for (const sensor of pressureSensors) {
        const config = calibrationData[sensor.name];
        if (config) {
          // In a real system, you would write calibration parameters to PLC
          console.log(`Applying calibration to ${sensor.displayName}:`, config);

          // Example: Write calibration parameters to OPC variables
          // await opcApi.writeVariable(`${sensor.variableName}_OFFSET`, config.offset);
          // await opcApi.writeVariable(`${sensor.variableName}_SCALE`, config.scaleFactor);
          // await opcApi.writeVariable(`${sensor.variableName}_MIN_LIMIT`, config.minLimit);
          // await opcApi.writeVariable(`${sensor.variableName}_MAX_LIMIT`, config.maxLimit);
        }
      }

      // Call the parent save handler
      onSave(calibrationOutput);

      console.log('Pressure calibration saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save calibration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const resetData: typeof calibrationData = {};
    pressureSensors.forEach(sensor => {
      resetData[sensor.name] = {
        offset: 0.0,
        scaleFactor: 1.0,
        minLimit: 0.0,
        maxLimit: 300.0
      };
    });
    setCalibrationData(resetData);
    setReferenceValue(100.0);
  };

  const handleCancel = () => {
    if (JSON.stringify(calibrationData) !== JSON.stringify({})) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // Calculate calibrated value for display
  const getCalibratedValue = (sensorName: string, rawValue: number): number => {
    const config = calibrationData[sensorName];
    if (!config) return rawValue;

    return (rawValue + config.offset) * config.scaleFactor;
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="pressure-calibration-overlay" onClick={handleCancel} />

      {/* Modal Content */}
      <div className="pressure-calibration-modal" role="dialog" aria-labelledby="calibration-title" aria-modal="true">
        {/* Modal Header */}
        <div className="calibration-header">
          <div className="calibration-title-section">
            <h2 id="calibration-title" className="calibration-title">
              Pressure Sensor Calibration
            </h2>
            <div className="calibration-subtitle">
              Industrial Hydraulic System - Calibration & Testing
            </div>
          </div>

          <button
            className="calibration-close-button"
            onClick={handleCancel}
            aria-label="Close calibration modal"
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        {/* Reference Pressure Section */}
        <div className="reference-pressure-section">
          <div className="reference-header">
            <span className="reference-icon">🎯</span>
            <h3>Reference Pressure</h3>
          </div>
          <div className="reference-controls">
            <label className="reference-label">
              Standard Reference Value
              <div className="reference-input-group">
                <input
                  type="number"
                  className="reference-input"
                  value={referenceValue}
                  onChange={(e) => setReferenceValue(Number(e.target.value))}
                  min="0"
                  max="300"
                  step="0.1"
                  disabled={isSaving}
                />
                <span className="reference-unit">Bar</span>
              </div>
            </label>
            <div className="reference-info">
              <span className="info-text">
                Set reference pressure for span calibration validation
              </span>
            </div>
          </div>
        </div>

        {/* Sensors Grid */}
        <div className="sensors-grid">
          {/* Motor Sensors */}
          <div className="sensor-group">
            <h3 className="group-title">
              <span className="group-icon">⚙️</span>
              Motor Pressure Sensors
            </h3>
            <div className="motor-sensors-grid">
              {pressureSensors.slice(0, 7).map((sensor) => {
                const config = calibrationData[sensor.name] || {
                  offset: 0,
                  scaleFactor: 1,
                  minLimit: 0,
                  maxLimit: 300
                };
                const calibratedValue = getCalibratedValue(sensor.name, sensor.currentValue);

                return (
                  <div key={sensor.name} className="sensor-card">
                    <div className="sensor-header">
                      <div className="sensor-title">{sensor.displayName}</div>
                      <div className={`sensor-status status-${sensor.status}`}>
                        <span className="status-dot" />
                        <span className="status-text">
                          {sensor.status === 'normal' ? 'OK' :
                           sensor.status === 'warning' ? 'WARN' : 'ERROR'}
                        </span>
                      </div>
                    </div>

                    <div className="sensor-values">
                      <div className="value-display">
                        <div className="value-label">Current Reading</div>
                        <div className="value-data">
                          <span className="raw-value">{sensor.currentValue.toFixed(2)}</span>
                          <span className="calibrated-value">
                            → {calibratedValue.toFixed(2)}
                          </span>
                          <span className="value-unit">{sensor.unit}</span>
                        </div>
                      </div>
                      <div className="setpoint-display">
                        <div className="setpoint-label">Setpoint</div>
                        <div className="setpoint-value">
                          {sensor.setpointValue.toFixed(1)} {sensor.unit}
                        </div>
                      </div>
                    </div>

                    <div className="calibration-controls">
                      <div className="control-row">
                        <label className="control-label">
                          Offset
                          <input
                            type="number"
                            className="control-input"
                            value={config.offset}
                            onChange={(e) => handleCalibrationChange(sensor.name, 'offset', Number(e.target.value))}
                            min="-10"
                            max="10"
                            step="0.01"
                            disabled={isSaving}
                          />
                          <span className="control-unit">Bar</span>
                        </label>
                        <label className="control-label">
                          Scale
                          <input
                            type="number"
                            className="control-input"
                            value={config.scaleFactor}
                            onChange={(e) => handleCalibrationChange(sensor.name, 'scaleFactor', Number(e.target.value))}
                            min="0.8"
                            max="1.2"
                            step="0.001"
                            disabled={isSaving}
                          />
                          <span className="control-unit">×</span>
                        </label>
                      </div>

                      <div className="control-row">
                        <label className="control-label">
                          Min Limit
                          <input
                            type="number"
                            className="control-input"
                            value={config.minLimit}
                            onChange={(e) => handleCalibrationChange(sensor.name, 'minLimit', Number(e.target.value))}
                            min="0"
                            max="300"
                            step="1"
                            disabled={isSaving}
                          />
                          <span className="control-unit">Bar</span>
                        </label>
                        <label className="control-label">
                          Max Limit
                          <input
                            type="number"
                            className="control-input"
                            value={config.maxLimit}
                            onChange={(e) => handleCalibrationChange(sensor.name, 'maxLimit', Number(e.target.value))}
                            min="0"
                            max="300"
                            step="1"
                            disabled={isSaving}
                          />
                          <span className="control-unit">Bar</span>
                        </label>
                      </div>

                      <div className="calibration-buttons">
                        <button
                          className="cal-button zero-button"
                          onClick={() => handleZeroCalibration(sensor.name)}
                          disabled={isLoading || isSaving}
                        >
                          Zero
                        </button>
                        <button
                          className="cal-button span-button"
                          onClick={() => handleSpanCalibration(sensor.name)}
                          disabled={isLoading || isSaving}
                        >
                          Span
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Sensor */}
          <div className="sensor-group">
            <h3 className="group-title">
              <span className="group-icon">🏭</span>
              System Pressure Sensor
            </h3>
            {(() => {
              const sensor = pressureSensors[7]; // System sensor
              const config = calibrationData[sensor.name] || {
                offset: 0,
                scaleFactor: 1,
                minLimit: 0,
                maxLimit: 300
              };
              const calibratedValue = getCalibratedValue(sensor.name, sensor.currentValue);

              return (
                <div className="sensor-card system-sensor">
                  <div className="sensor-header">
                    <div className="sensor-title">{sensor.displayName}</div>
                    <div className={`sensor-status status-${sensor.status}`}>
                      <span className="status-dot" />
                      <span className="status-text">
                        {sensor.status === 'normal' ? 'OK' :
                         sensor.status === 'warning' ? 'WARN' : 'ERROR'}
                      </span>
                    </div>
                  </div>

                  <div className="sensor-values">
                    <div className="value-display">
                      <div className="value-label">Current Reading</div>
                      <div className="value-data">
                        <span className="raw-value">{sensor.currentValue.toFixed(2)}</span>
                        <span className="calibrated-value">
                          → {calibratedValue.toFixed(2)}
                        </span>
                        <span className="value-unit">{sensor.unit}</span>
                      </div>
                    </div>
                    <div className="setpoint-display">
                      <div className="setpoint-label">Setpoint</div>
                      <div className="setpoint-value">
                        {sensor.setpointValue.toFixed(1)} {sensor.unit}
                      </div>
                    </div>
                  </div>

                  <div className="calibration-controls">
                    <div className="control-row">
                      <label className="control-label">
                        Offset
                        <input
                          type="number"
                          className="control-input"
                          value={config.offset}
                          onChange={(e) => handleCalibrationChange(sensor.name, 'offset', Number(e.target.value))}
                          min="-10"
                          max="10"
                          step="0.01"
                          disabled={isSaving}
                        />
                        <span className="control-unit">Bar</span>
                      </label>
                      <label className="control-label">
                        Scale
                        <input
                          type="number"
                          className="control-input"
                          value={config.scaleFactor}
                          onChange={(e) => handleCalibrationChange(sensor.name, 'scaleFactor', Number(e.target.value))}
                          min="0.8"
                          max="1.2"
                          step="0.001"
                          disabled={isSaving}
                        />
                        <span className="control-unit">×</span>
                      </label>
                    </div>

                    <div className="control-row">
                      <label className="control-label">
                        Min Limit
                        <input
                          type="number"
                          className="control-input"
                          value={config.minLimit}
                          onChange={(e) => handleCalibrationChange(sensor.name, 'minLimit', Number(e.target.value))}
                          min="0"
                          max="300"
                          step="1"
                          disabled={isSaving}
                        />
                        <span className="control-unit">Bar</span>
                      </label>
                      <label className="control-label">
                        Max Limit
                        <input
                          type="number"
                          className="control-input"
                          value={config.maxLimit}
                          onChange={(e) => handleCalibrationChange(sensor.name, 'maxLimit', Number(e.target.value))}
                          min="0"
                          max="300"
                          step="1"
                          disabled={isSaving}
                        />
                        <span className="control-unit">Bar</span>
                      </label>
                    </div>

                    <div className="calibration-buttons">
                      <button
                        className="cal-button zero-button"
                        onClick={() => handleZeroCalibration(sensor.name)}
                        disabled={isLoading || isSaving}
                      >
                        Zero
                      </button>
                      <button
                        className="cal-button span-button"
                        onClick={() => handleSpanCalibration(sensor.name)}
                        disabled={isLoading || isSaving}
                      >
                        Span
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="calibration-actions">
          <button
            className="action-button secondary"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset to Defaults
          </button>
          <button
            className="action-button secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="action-button primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="button-spinner" />
                Saving...
              </>
            ) : (
              'Save All Calibrations'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div className="confirm-header">
              <span className="confirm-icon">⚠️</span>
              <h3>Unsaved Changes</h3>
            </div>
            <p>You have unsaved calibration changes. Are you sure you want to cancel?</p>
            <div className="confirm-actions">
              <button
                className="confirm-button secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                Continue Editing
              </button>
              <button
                className="confirm-button primary"
                onClick={() => {
                  setShowConfirmDialog(false);
                  onClose();
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PressureCalibration;