import React, { useState, useEffect } from 'react';
import './FlowCalibration.css';

interface FlowMeterData {
  id: string;
  name: string;
  actualVariable: string;
  setpointVariable: string;
  currentFlow: number;
  setpoint: number;
  offset: number;
  scaleFactor: number;
  minLimit: number;
  maxLimit: number;
  kFactor: number;
  totalizer: number;
  direction: 'forward' | 'reverse' | 'stopped';
  status: 'normal' | 'optimal' | 'low' | 'critical';
}

interface FlowCalibrationData {
  motorFlows: FlowMeterData[];
  systemFlow: FlowMeterData;
  referenceFlow: number;
  calibrationCurve: Array<{ input: number; output: number }>;
}

interface FlowCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (calibrationData: FlowCalibrationData) => void;
}

const FlowCalibration: React.FC<FlowCalibrationProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [motorFlows, setMotorFlows] = useState<FlowMeterData[]>([
    {
      id: 'pump1',
      name: 'PUMP 1',
      actualVariable: 'PUMP_1_FLOW_ACTUAL',
      setpointVariable: 'PUMP_1_FLOW_SETPOINT',
      currentFlow: 125.4,
      setpoint: 120.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 200,
      kFactor: 1000,
      totalizer: 15420.5,
      direction: 'forward',
      status: 'optimal'
    },
    {
      id: 'pump2',
      name: 'PUMP 2',
      actualVariable: 'PUMP_2_FLOW_ACTUAL',
      setpointVariable: 'PUMP_2_FLOW_SETPOINT',
      currentFlow: 98.7,
      setpoint: 100.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 200,
      kFactor: 1000,
      totalizer: 12350.2,
      direction: 'forward',
      status: 'normal'
    },
    {
      id: 'pump3',
      name: 'PUMP 3',
      actualVariable: 'PUMP_3_FLOW_ACTUAL',
      setpointVariable: 'PUMP_3_FLOW_SETPOINT',
      currentFlow: 45.2,
      setpoint: 50.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 150,
      kFactor: 1000,
      totalizer: 8920.1,
      direction: 'forward',
      status: 'low'
    },
    {
      id: 'pump4',
      name: 'PUMP 4',
      actualVariable: 'PUMP_4_FLOW_ACTUAL',
      setpointVariable: 'PUMP_4_FLOW_SETPOINT',
      currentFlow: 0.0,
      setpoint: 0.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 150,
      kFactor: 1000,
      totalizer: 0.0,
      direction: 'stopped',
      status: 'normal'
    },
    {
      id: 'pump5',
      name: 'PUMP 5',
      actualVariable: 'PUMP_5_FLOW_ACTUAL',
      setpointVariable: 'PUMP_5_FLOW_SETPOINT',
      currentFlow: 180.9,
      setpoint: 175.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 250,
      kFactor: 1000,
      totalizer: 22150.8,
      direction: 'forward',
      status: 'optimal'
    },
    {
      id: 'pump6',
      name: 'PUMP 6',
      actualVariable: 'PUMP_6_FLOW_ACTUAL',
      setpointVariable: 'PUMP_6_FLOW_SETPOINT',
      currentFlow: 320.5,
      setpoint: 300.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 400,
      kFactor: 1000,
      totalizer: 45620.3,
      direction: 'forward',
      status: 'critical'
    },
    {
      id: 'pump7',
      name: 'PUMP 7',
      actualVariable: 'PUMP_7_FLOW_ACTUAL',
      setpointVariable: 'PUMP_7_FLOW_SETPOINT',
      currentFlow: 155.3,
      setpoint: 150.0,
      offset: 0,
      scaleFactor: 1.0,
      minLimit: 0,
      maxLimit: 200,
      kFactor: 1000,
      totalizer: 18750.9,
      direction: 'forward',
      status: 'optimal'
    }
  ]);

  const [systemFlow, setSystemFlow] = useState<FlowMeterData>({
    id: 'system',
    name: 'SYSTEM TOTAL',
    actualVariable: 'TOTAL_SYSTEM_FLOW',
    setpointVariable: 'SYSTEM_FLOW_SETPOINT',
    currentFlow: 925.8,
    setpoint: 895.0,
    offset: 0,
    scaleFactor: 1.0,
    minLimit: 0,
    maxLimit: 1000,
    kFactor: 1000,
    totalizer: 123252.6,
    direction: 'forward',
    status: 'optimal'
  });

  const [referenceFlow, setReferenceFlow] = useState<number>(100.0);
  const [calibrationCurve, setCalibrationCurve] = useState([
    { input: 0, output: 0 },
    { input: 100, output: 100 },
    { input: 500, output: 500 },
    { input: 1000, output: 1000 }
  ]);

  const updateMotorFlow = (index: number, field: keyof FlowMeterData, value: any) => {
    setMotorFlows(prev => prev.map((flow, i) =>
      i === index ? { ...flow, [field]: value } : flow
    ));
  };

  const updateSystemFlow = (field: keyof FlowMeterData, value: any) => {
    setSystemFlow(prev => ({ ...prev, [field]: value }));
  };

  const handleZeroCalibration = (index: number) => {
    updateMotorFlow(index, 'offset', -motorFlows[index].currentFlow);
  };

  const handleSpanCalibration = (index: number) => {
    if (referenceFlow > 0 && motorFlows[index].currentFlow > 0) {
      const newScaleFactor = referenceFlow / motorFlows[index].currentFlow;
      updateMotorFlow(index, 'scaleFactor', newScaleFactor);
    }
  };

  const getFlowRangeClass = (flow: number): string => {
    if (flow === 0) return 'stopped';
    if (flow < 100) return 'low';
    if (flow < 500) return 'medium';
    return 'high';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return '#00ff00';
      case 'normal': return '#00aaff';
      case 'low': return '#ffaa00';
      case 'critical': return '#ff0000';
      default: return '#888888';
    }
  };

  const getDirectionIcon = (direction: string): string => {
    switch (direction) {
      case 'forward': return '→';
      case 'reverse': return '←';
      case 'stopped': return '⊗';
      default: return '?';
    }
  };

  const handleSave = () => {
    const calibrationData: FlowCalibrationData = {
      motorFlows,
      systemFlow,
      referenceFlow,
      calibrationCurve
    };
    onSave(calibrationData);
    onClose();
  };

  const handleReset = () => {
    setMotorFlows(prev => prev.map(flow => ({
      ...flow,
      offset: 0,
      scaleFactor: 1.0,
      kFactor: 1000
    })));
    setSystemFlow(prev => ({
      ...prev,
      offset: 0,
      scaleFactor: 1.0,
      kFactor: 1000
    }));
    setReferenceFlow(100.0);
  };

  if (!isOpen) return null;

  return (
    <div className="flow-calibration-overlay">
      <div className="flow-calibration-modal">
        <div className="flow-calibration-header">
          <h2>Flow Meter Calibration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="flow-calibration-content">
          {/* Reference Flow Section */}
          <div className="reference-flow-section">
            <h3>Reference Flow Test</h3>
            <div className="reference-controls">
              <label>
                Reference Flow Rate:
                <input
                  type="number"
                  value={referenceFlow}
                  onChange={(e) => setReferenceFlow(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="1000"
                  step="0.1"
                  className="flow-input"
                />
                <span className="unit">L/Min</span>
              </label>
            </div>
          </div>

          {/* Motor Flow Meters Grid */}
          <div className="motor-flows-section">
            <h3>Motor Flow Meters</h3>
            <div className="motor-flows-grid">
              {motorFlows.map((flow, index) => (
                <div key={flow.id} className="flow-meter-card">
                  <div className="flow-meter-header">
                    <h4>{flow.name}</h4>
                    <div
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(flow.status) }}
                    />
                  </div>

                  <div className="flow-readings">
                    <div className="current-flow">
                      <span className="flow-value">{flow.currentFlow.toFixed(1)}</span>
                      <span className="unit">L/Min</span>
                      <span className="direction-indicator">
                        {getDirectionIcon(flow.direction)}
                      </span>
                    </div>
                    <div className={`flow-range ${getFlowRangeClass(flow.currentFlow)}`}>
                      {getFlowRangeClass(flow.currentFlow).toUpperCase()}
                    </div>
                  </div>

                  <div className="totalizer">
                    <label>Total: {flow.totalizer.toFixed(1)} L</label>
                  </div>

                  <div className="calibration-controls">
                    <div className="control-row">
                      <label>
                        Offset:
                        <input
                          type="number"
                          value={flow.offset}
                          onChange={(e) => updateMotorFlow(index, 'offset', parseFloat(e.target.value) || 0)}
                          min="-50"
                          max="50"
                          step="0.1"
                          className="calibration-input"
                        />
                      </label>
                    </div>

                    <div className="control-row">
                      <label>
                        Scale:
                        <input
                          type="number"
                          value={flow.scaleFactor}
                          onChange={(e) => updateMotorFlow(index, 'scaleFactor', parseFloat(e.target.value) || 1.0)}
                          min="0.8"
                          max="1.2"
                          step="0.001"
                          className="calibration-input"
                        />
                      </label>
                    </div>

                    <div className="control-row">
                      <label>
                        K-Factor:
                        <input
                          type="number"
                          value={flow.kFactor}
                          onChange={(e) => updateMotorFlow(index, 'kFactor', parseFloat(e.target.value) || 1000)}
                          min="100"
                          max="10000"
                          step="1"
                          className="calibration-input"
                        />
                      </label>
                    </div>

                    <div className="control-row limits">
                      <label>
                        Min:
                        <input
                          type="number"
                          value={flow.minLimit}
                          onChange={(e) => updateMotorFlow(index, 'minLimit', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="999"
                          className="limit-input"
                        />
                      </label>
                      <label>
                        Max:
                        <input
                          type="number"
                          value={flow.maxLimit}
                          onChange={(e) => updateMotorFlow(index, 'maxLimit', parseFloat(e.target.value) || 1000)}
                          min="1"
                          max="1000"
                          className="limit-input"
                        />
                      </label>
                    </div>

                    <div className="calibration-buttons">
                      <button
                        className="cal-button zero"
                        onClick={() => handleZeroCalibration(index)}
                      >
                        Zero
                      </button>
                      <button
                        className="cal-button span"
                        onClick={() => handleSpanCalibration(index)}
                      >
                        Span
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Flow Section */}
          <div className="system-flow-section">
            <h3>System Total Flow</h3>
            <div className="system-flow-card">
              <div className="system-flow-header">
                <h4>{systemFlow.name}</h4>
                <div
                  className="status-indicator large"
                  style={{ backgroundColor: getStatusColor(systemFlow.status) }}
                />
              </div>

              <div className="system-readings">
                <div className="system-current-flow">
                  <span className="flow-value large">{systemFlow.currentFlow.toFixed(1)}</span>
                  <span className="unit">L/Min</span>
                  <span className="direction-indicator">
                    {getDirectionIcon(systemFlow.direction)}
                  </span>
                </div>
                <div className="system-setpoint">
                  SP: {systemFlow.setpoint.toFixed(1)} L/Min
                </div>
                <div className="system-totalizer">
                  Total: {systemFlow.totalizer.toFixed(1)} L
                </div>
              </div>

              <div className="system-calibration">
                <div className="system-control-row">
                  <label>
                    System Offset:
                    <input
                      type="number"
                      value={systemFlow.offset}
                      onChange={(e) => updateSystemFlow('offset', parseFloat(e.target.value) || 0)}
                      min="-100"
                      max="100"
                      step="0.1"
                      className="calibration-input"
                    />
                  </label>
                  <label>
                    System Scale:
                    <input
                      type="number"
                      value={systemFlow.scaleFactor}
                      onChange={(e) => updateSystemFlow('scaleFactor', parseFloat(e.target.value) || 1.0)}
                      min="0.8"
                      max="1.2"
                      step="0.001"
                      className="calibration-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Curve Section */}
          <div className="calibration-curve-section">
            <h3>Linearization Curve</h3>
            <div className="curve-points">
              {calibrationCurve.map((point, index) => (
                <div key={index} className="curve-point">
                  <label>
                    Input:
                    <input
                      type="number"
                      value={point.input}
                      onChange={(e) => {
                        const newCurve = [...calibrationCurve];
                        newCurve[index].input = parseFloat(e.target.value) || 0;
                        setCalibrationCurve(newCurve);
                      }}
                      className="curve-input"
                    />
                  </label>
                  <label>
                    Output:
                    <input
                      type="number"
                      value={point.output}
                      onChange={(e) => {
                        const newCurve = [...calibrationCurve];
                        newCurve[index].output = parseFloat(e.target.value) || 0;
                        setCalibrationCurve(newCurve);
                      }}
                      className="curve-input"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flow-calibration-footer">
          <button className="action-button secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="action-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="action-button primary" onClick={handleSave}>
            Save All Calibrations
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowCalibration;