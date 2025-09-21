import React, { useState, useEffect } from 'react';
import './TemperatureCalibration.css';

interface TemperatureCalibrationData {
  sensorId: string;
  sensorType: 'RTD_PT100' | 'RTD_PT1000' | 'THERMOCOUPLE_K' | 'THERMOCOUPLE_J';
  outputType: 'voltage' | '4_20ma';
  offset: number;
  scaleFactor: number;
  minLimit: number;
  maxLimit: number;
  alphaCoefficient: number;
  coldJunctionComp: boolean;
  linearizationPoints: Array<{temperature: number; correction: number}>;
  alarmLimits: {
    highTemp: number;
    lowTemp: number;
  };
  ambientCompensation: boolean;
  validationEnabled: boolean;
  maConfig: {
    minMa: number;
    maxMa: number;
    zeroMaTemp: number;
    spanMaTemp: number;
  };
}

interface TemperatureCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (calibrationData: TemperatureCalibrationData[]) => void;
}

interface TemperatureSensor {
  id: string;
  name: string;
  variableName: string;
  currentValue: number;
  currentValueMa: number;
  group: 'motor' | 'tank' | 'chiller';
  defaultRange: { min: number; max: number };
  status: 'normal' | 'warning' | 'critical' | 'offline';
}

const temperatureSensors: TemperatureSensor[] = [
  // Motor Sensors (0-150°C)
  { id: 'motor1', name: 'Motor 1', variableName: 'MOTOR_1_TEMPERATURE_C', currentValue: 45.2, currentValueMa: 12.8, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  { id: 'motor2', name: 'Motor 2', variableName: 'MOTOR_2_TEMPERATURE_C', currentValue: 48.7, currentValueMa: 13.6, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  { id: 'motor3', name: 'Motor 3', variableName: 'MOTOR_3_TEMPERATURE_C', currentValue: 52.1, currentValueMa: 14.4, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'warning' },
  { id: 'motor4', name: 'Motor 4', variableName: 'MOTOR_4_TEMPERATURE_C', currentValue: 43.8, currentValueMa: 12.3, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  { id: 'motor5', name: 'Motor 5', variableName: 'MOTOR_5_TEMPERATURE_C', currentValue: 46.3, currentValueMa: 13.0, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  { id: 'motor6', name: 'Motor 6', variableName: 'MOTOR_6_TEMPERATURE_C', currentValue: 41.5, currentValueMa: 11.6, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  { id: 'motor7', name: 'Motor 7', variableName: 'MOTOR_7_TEMPERATURE_C', currentValue: 47.9, currentValueMa: 13.4, group: 'motor', defaultRange: { min: 0, max: 150 }, status: 'normal' },
  // Tank/Oil System (0-100°C)
  { id: 'tank', name: 'Tank Oil', variableName: 'TANK_OIL_TEMPERATURE', currentValue: 35.4, currentValueMa: 9.4, group: 'tank', defaultRange: { min: 0, max: 100 }, status: 'normal' },
  // Chiller System (0-50°C)
  { id: 'chiller_inlet', name: 'Chiller Inlet', variableName: 'CHILLER_INLET_TEMPERATURE', currentValue: 28.3, currentValueMa: 7.6, group: 'chiller', defaultRange: { min: 0, max: 50 }, status: 'normal' },
  { id: 'chiller_outlet', name: 'Chiller Outlet', variableName: 'CHILLER_OUTLET_TEMPERATURE', currentValue: 22.1, currentValueMa: 6.2, group: 'chiller', defaultRange: { min: 0, max: 50 }, status: 'normal' },
];

const getTemperatureColor = (temp: number): string => {
  if (temp < 25) return '#4FC3F7'; // Cool Blue
  if (temp <= 60) return '#66BB6A'; // Green
  if (temp <= 90) return '#FFA726'; // Orange
  return '#F44336'; // Red
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'normal': return '#66BB6A';
    case 'warning': return '#FFA726';
    case 'critical': return '#F44336';
    case 'offline': return '#9E9E9E';
    default: return '#9E9E9E';
  }
};

const TemperatureCalibration: React.FC<TemperatureCalibrationProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [calibrationData, setCalibrationData] = useState<Record<string, TemperatureCalibrationData>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    motor: true,
    tank: true,
    chiller: true
  });
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize calibration data for all sensors
      const initialData: Record<string, TemperatureCalibrationData> = {};
      temperatureSensors.forEach(sensor => {
        initialData[sensor.id] = {
          sensorId: sensor.id,
          sensorType: 'RTD_PT100',
          outputType: 'voltage',
          offset: 0,
          scaleFactor: 1.0,
          minLimit: sensor.defaultRange.min,
          maxLimit: sensor.defaultRange.max,
          alphaCoefficient: 0.00385,
          coldJunctionComp: false,
          linearizationPoints: [
            { temperature: 0, correction: 0 },
            { temperature: 50, correction: 0 },
            { temperature: 100, correction: 0 }
          ],
          alarmLimits: {
            highTemp: sensor.defaultRange.max * 0.9,
            lowTemp: sensor.defaultRange.min + 5
          },
          ambientCompensation: false,
          validationEnabled: true,
          maConfig: {
            minMa: 4,
            maxMa: 20,
            zeroMaTemp: sensor.defaultRange.min,
            spanMaTemp: sensor.defaultRange.max
          }
        };
      });
      setCalibrationData(initialData);
    }
  }, [isOpen]);

  const updateCalibrationData = (sensorId: string, field: keyof TemperatureCalibrationData, value: any) => {
    setCalibrationData(prev => ({
      ...prev,
      [sensorId]: {
        ...prev[sensorId],
        [field]: value
      }
    }));
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleZeroCalibration = (sensorId: string) => {
    const sensor = temperatureSensors.find(s => s.id === sensorId);
    if (sensor) {
      updateCalibrationData(sensorId, 'offset', -sensor.currentValue);
    }
  };

  const handleSpanCalibration = (sensorId: string, referenceTemp: number) => {
    const sensor = temperatureSensors.find(s => s.id === sensorId);
    if (sensor && sensor.currentValue !== 0) {
      const scaleFactor = referenceTemp / sensor.currentValue;
      updateCalibrationData(sensorId, 'scaleFactor', scaleFactor);
    }
  };

  const handleSave = () => {
    const calibrationArray = Object.values(calibrationData);
    onSave(calibrationArray);
    onClose();
  };

  const groupedSensors = {
    motor: temperatureSensors.filter(s => s.group === 'motor'),
    tank: temperatureSensors.filter(s => s.group === 'tank'),
    chiller: temperatureSensors.filter(s => s.group === 'chiller')
  };

  if (!isOpen) return null;

  return (
    <div className="temp-cal-overlay">
      <div className="temp-cal-modal">
        <div className="temp-cal-header">
          <h2>Temperature Sensor Calibration</h2>
          <div className="temp-cal-header-info">
            <span className="temp-cal-sensor-count">
              {temperatureSensors.length} Temperature Sensors
            </span>
            <span className="temp-cal-system-status">
              System Temperature: Normal
            </span>
          </div>
          <button className="temp-cal-close" onClick={onClose}>×</button>
        </div>

        <div className="temp-cal-content">
          <div className="temp-cal-sidebar">
            <div className="temp-cal-legend">
              <h3>Temperature Ranges</h3>
              <div className="temp-cal-legend-item">
                <div className="temp-cal-legend-color" style={{ backgroundColor: '#4FC3F7' }}></div>
                <span>Cool (&lt;25°C)</span>
              </div>
              <div className="temp-cal-legend-item">
                <div className="temp-cal-legend-color" style={{ backgroundColor: '#66BB6A' }}></div>
                <span>Normal (25-60°C)</span>
              </div>
              <div className="temp-cal-legend-item">
                <div className="temp-cal-legend-color" style={{ backgroundColor: '#FFA726' }}></div>
                <span>Warm (60-90°C)</span>
              </div>
              <div className="temp-cal-legend-item">
                <div className="temp-cal-legend-color" style={{ backgroundColor: '#F44336' }}></div>
                <span>Hot (&gt;90°C)</span>
              </div>
            </div>

            <div className="temp-cal-global-controls">
              <h3>Global Actions</h3>
              <button className="temp-cal-btn temp-cal-btn-secondary">
                Zero All Sensors
              </button>
              <button className="temp-cal-btn temp-cal-btn-secondary">
                Reset All Calibrations
              </button>
              <button className="temp-cal-btn temp-cal-btn-secondary">
                Load Factory Defaults
              </button>
            </div>
          </div>

          <div className="temp-cal-main">
            {Object.entries(groupedSensors).map(([groupName, sensors]) => (
              <div key={groupName} className="temp-cal-group">
                <div
                  className="temp-cal-group-header"
                  onClick={() => toggleGroup(groupName)}
                >
                  <h3>
                    {groupName === 'motor' && 'Motor Temperature Sensors (0-150°C)'}
                    {groupName === 'tank' && 'Tank/Oil System (0-100°C)'}
                    {groupName === 'chiller' && 'Chiller System (0-50°C)'}
                  </h3>
                  <span className="temp-cal-group-count">
                    {sensors.length} sensor{sensors.length !== 1 ? 's' : ''}
                  </span>
                  <span className={`temp-cal-expand-icon ${expandedGroups[groupName] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>

                {expandedGroups[groupName] && (
                  <div className="temp-cal-sensors">
                    {sensors.map(sensor => {
                      const config = calibrationData[sensor.id];
                      if (!config) return null;

                      return (
                        <div key={sensor.id} className="temp-cal-sensor">
                          <div className="temp-cal-sensor-header">
                            <div className="temp-cal-sensor-info">
                              <h4>{sensor.name}</h4>
                              <span className="temp-cal-variable-name">{sensor.variableName}</span>
                              <div className="temp-cal-current-value">
                                <span
                                  className="temp-cal-temperature"
                                  style={{ color: getTemperatureColor(sensor.currentValue) }}
                                >
                                  {sensor.currentValue.toFixed(1)}°C
                                </span>
                                <span className="temp-cal-current-ma">
                                  {sensor.currentValueMa.toFixed(1)}mA
                                </span>
                                <div
                                  className="temp-cal-status-indicator"
                                  style={{ backgroundColor: getStatusColor(sensor.status) }}
                                  title={`Status: ${sensor.status}`}
                                ></div>
                              </div>
                            </div>
                            <button
                              className={`temp-cal-expand-sensor ${selectedSensor === sensor.id ? 'active' : ''}`}
                              onClick={() => setSelectedSensor(selectedSensor === sensor.id ? null : sensor.id)}
                            >
                              {selectedSensor === sensor.id ? 'Collapse' : 'Configure'}
                            </button>
                          </div>

                          {selectedSensor === sensor.id && (
                            <div className="temp-cal-sensor-config">
                              <div className="temp-cal-config-grid">
                                <div className="temp-cal-config-section">
                                  <h5>Sensor Configuration</h5>
                                  <div className="temp-cal-input-group">
                                    <label>Sensor Type</label>
                                    <select
                                      value={config.sensorType}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'sensorType', e.target.value)}
                                    >
                                      <option value="RTD_PT100">RTD PT100</option>
                                      <option value="RTD_PT1000">RTD PT1000</option>
                                      <option value="THERMOCOUPLE_K">Thermocouple K</option>
                                      <option value="THERMOCOUPLE_J">Thermocouple J</option>
                                    </select>
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>Output Type</label>
                                    <select
                                      value={config.outputType}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'outputType', e.target.value)}
                                    >
                                      <option value="voltage">Voltage (0-10V)</option>
                                      <option value="4_20ma">4-20mA</option>
                                    </select>
                                  </div>
                                  {config.sensorType.startsWith('RTD') && (
                                    <div className="temp-cal-input-group">
                                      <label>Alpha Coefficient</label>
                                      <input
                                        type="number"
                                        step="0.00001"
                                        value={config.alphaCoefficient}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'alphaCoefficient', parseFloat(e.target.value))}
                                      />
                                    </div>
                                  )}
                                  {config.sensorType.startsWith('THERMOCOUPLE') && (
                                    <div className="temp-cal-input-group">
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={config.coldJunctionComp}
                                          onChange={(e) => updateCalibrationData(sensor.id, 'coldJunctionComp', e.target.checked)}
                                        />
                                        Cold Junction Compensation
                                      </label>
                                    </div>
                                  )}
                                </div>

                                <div className="temp-cal-config-section">
                                  <h5>Calibration Parameters</h5>
                                  <div className="temp-cal-input-group">
                                    <label>Offset (°C)</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="-10"
                                      max="10"
                                      value={config.offset}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'offset', parseFloat(e.target.value))}
                                    />
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>Scale Factor</label>
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0.95"
                                      max="1.05"
                                      value={config.scaleFactor}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'scaleFactor', parseFloat(e.target.value))}
                                    />
                                  </div>
                                  <div className="temp-cal-calibration-buttons">
                                    <button
                                      className="temp-cal-btn temp-cal-btn-small"
                                      onClick={() => handleZeroCalibration(sensor.id)}
                                    >
                                      Zero
                                    </button>
                                    <button
                                      className="temp-cal-btn temp-cal-btn-small"
                                      onClick={() => {
                                        const refTemp = prompt('Enter reference temperature (°C):');
                                        if (refTemp) handleSpanCalibration(sensor.id, parseFloat(refTemp));
                                      }}
                                    >
                                      Span
                                    </button>
                                  </div>
                                </div>

                                <div className="temp-cal-config-section">
                                  <h5>Range & Limits</h5>
                                  <div className="temp-cal-input-group">
                                    <label>Min Limit (°C)</label>
                                    <input
                                      type="number"
                                      value={config.minLimit}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'minLimit', parseFloat(e.target.value))}
                                    />
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>Max Limit (°C)</label>
                                    <input
                                      type="number"
                                      value={config.maxLimit}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'maxLimit', parseFloat(e.target.value))}
                                    />
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>High Alarm (°C)</label>
                                    <input
                                      type="number"
                                      value={config.alarmLimits.highTemp}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'alarmLimits', {
                                        ...config.alarmLimits,
                                        highTemp: parseFloat(e.target.value)
                                      })}
                                    />
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>Low Alarm (°C)</label>
                                    <input
                                      type="number"
                                      value={config.alarmLimits.lowTemp}
                                      onChange={(e) => updateCalibrationData(sensor.id, 'alarmLimits', {
                                        ...config.alarmLimits,
                                        lowTemp: parseFloat(e.target.value)
                                      })}
                                    />
                                  </div>
                                </div>

                                  <div className="temp-cal-config-section">
                                  <h5>Advanced Features</h5>
                                  <div className="temp-cal-input-group">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={config.ambientCompensation}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'ambientCompensation', e.target.checked)}
                                      />
                                      Ambient Compensation
                                    </label>
                                  </div>
                                  <div className="temp-cal-input-group">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={config.validationEnabled}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'validationEnabled', e.target.checked)}
                                      />
                                      Sensor Validation
                                    </label>
                                  </div>
                                  <button className="temp-cal-btn temp-cal-btn-small temp-cal-btn-secondary">
                                    Configure Linearization
                                  </button>
                                </div>

                                {config.outputType === '4_20ma' && (
                                  <div className="temp-cal-config-section">
                                    <h5>4-20mA Configuration</h5>
                                    <div className="temp-cal-input-group">
                                      <label>Minimum Current (mA)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="20"
                                        value={config.maConfig.minMa}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'maConfig', {
                                          ...config.maConfig,
                                          minMa: parseFloat(e.target.value)
                                        })}
                                      />
                                    </div>
                                    <div className="temp-cal-input-group">
                                      <label>Maximum Current (mA)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="25"
                                        value={config.maConfig.maxMa}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'maConfig', {
                                          ...config.maConfig,
                                          maxMa: parseFloat(e.target.value)
                                        })}
                                      />
                                    </div>
                                    <div className="temp-cal-input-group">
                                      <label>Zero mA Temperature (°C)</label>
                                      <input
                                        type="number"
                                        value={config.maConfig.zeroMaTemp}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'maConfig', {
                                          ...config.maConfig,
                                          zeroMaTemp: parseFloat(e.target.value)
                                        })}
                                      />
                                    </div>
                                    <div className="temp-cal-input-group">
                                      <label>Span mA Temperature (°C)</label>
                                      <input
                                        type="number"
                                        value={config.maConfig.spanMaTemp}
                                        onChange={(e) => updateCalibrationData(sensor.id, 'maConfig', {
                                          ...config.maConfig,
                                          spanMaTemp: parseFloat(e.target.value)
                                        })}
                                      />
                                    </div>
                                    <div className="temp-cal-calibration-buttons">
                                      <button
                                        className="temp-cal-btn temp-cal-btn-small"
                                        onClick={() => {
                                          const zeroTemp = prompt('Enter zero mA temperature (°C):');
                                          if (zeroTemp) updateCalibrationData(sensor.id, 'maConfig', {
                                            ...config.maConfig,
                                            zeroMaTemp: parseFloat(zeroTemp)
                                          });
                                        }}
                                      >
                                        Set Zero mA
                                      </button>
                                      <button
                                        className="temp-cal-btn temp-cal-btn-small"
                                        onClick={() => {
                                          const spanTemp = prompt('Enter span mA temperature (°C):');
                                          if (spanTemp) updateCalibrationData(sensor.id, 'maConfig', {
                                            ...config.maConfig,
                                            spanMaTemp: parseFloat(spanTemp)
                                          });
                                        }}
                                      >
                                        Set Span mA
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="temp-cal-footer">
          <div className="temp-cal-footer-info">
            <span>Calibration will be applied to all selected sensors</span>
          </div>
          <div className="temp-cal-footer-actions">
            <button className="temp-cal-btn temp-cal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="temp-cal-btn temp-cal-btn-primary" onClick={handleSave}>
              Apply Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemperatureCalibration;
