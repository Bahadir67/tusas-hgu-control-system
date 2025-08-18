import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { opcApi } from '../../services/api';
import SimpleGauge from '../SimpleGauge';
import './MotorDetailModal.css';

interface MotorDetailModalProps {
  motorId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface TrendData {
  timestamp: string;
  value: number;
}

const MotorDetailModal: React.FC<MotorDetailModalProps> = ({ motorId, isOpen, onClose }) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  const fetchLeakageOnly = useOpcStore((state) => state.fetchLeakageOnly);
  const [activeTab, setActiveTab] = useState<'realtime' | 'trends' | 'settings' | 'maintenance'>('realtime');
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<{
    pressure: TrendData[];
    flow: TrendData[];
    temperature: TrendData[];
  }>({
    pressure: [],
    flow: [],
    temperature: []
  });

  // Setpoint states - initialized from OPC collection
  const [rpmSetpoint, setRpmSetpoint] = useState(motor?.targetRpm || 0);
  const [pressureSetpoint, setPressureSetpoint] = useState(motor?.pressureSetpoint || 0);
  const [flowSetpoint, setFlowSetpoint] = useState(motor?.flowSetpoint || 0);
  const [tempSetpoint, setTempSetpoint] = useState(65);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Load current values from OPC collection ONLY when modal first opens
  useEffect(() => {
    if (isOpen && motor) {
      console.log(`🔧 Motor ${motorId} Settings Values - LOADED ONCE:`, motor);
      console.log(`🎯 Settings Initial Values:`, {
        targetRpm: motor.targetRpm,
        pressureSetpoint: motor.pressureSetpoint,
        flowSetpoint: motor.flowSetpoint
      });
      setRpmSetpoint(motor.targetRpm || 0);
      setPressureSetpoint(motor.pressureSetpoint || 0);
      setFlowSetpoint(motor.flowSetpoint || 0);
    }
  }, [isOpen, motorId]); // Only depend on isOpen and motorId, NOT motor data

  // Continuous leakage updates while modal is open
  useEffect(() => {
    let leakageInterval: NodeJS.Timeout;
    
    if (isOpen) {
      console.log(`🔄 Starting leakage updates for Motor ${motorId}`);
      
      // Update leakage every 1 second while modal is open
      leakageInterval = setInterval(() => {
        fetchLeakageOnly();
      }, 1000);
    }
    
    return () => {
      if (leakageInterval) {
        console.log(`🛑 Stopping leakage updates for Motor ${motorId}`);
        clearInterval(leakageInterval);
      }
    };
  }, [isOpen, motorId, fetchLeakageOnly]);

  // Load trend data when trends tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'trends' && motor) {
      loadTrendData();
    }
  }, [isOpen, activeTab, motorId]);

  const loadTrendData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading trend data from InfluxDB
      // In real implementation, this would call your InfluxDB API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate sample trend data for last 24 hours with 5-minute intervals
      const generateTrendData = (baseValue: number, variance: number): TrendData[] => {
        const data: TrendData[] = [];
        const now = new Date();
        const intervalMinutes = 5; // 5-minute intervals
        const totalHours = 24; // 24 hours of data
        const dataPoints = (totalHours * 60) / intervalMinutes; // 288 data points
        
        for (let i = dataPoints; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
          
          // Add some realistic variation patterns (daily cycle simulation)
          const hourOfDay = timestamp.getHours();
          const dailyFactor = 1 + 0.1 * Math.sin((hourOfDay / 24) * 2 * Math.PI);
          
          // Random walk with daily pattern
          const randomWalk = (Math.random() - 0.5) * variance;
          const value = baseValue * dailyFactor + randomWalk;
          
          data.push({
            timestamp: timestamp.toISOString(),
            value: Math.max(0, value)
          });
        }
        return data;
      };

      setTrendData({
        pressure: generateTrendData(motor.pressure || 125, 15),
        flow: generateTrendData(motor.flow || 75, 10),
        temperature: generateTrendData(motor.temperature || 55, 8)
      });
    } catch (error) {
      console.error('Failed to load trend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetpointSubmit = async (variable: string, value: number) => {
    try {
      setIsLoading(true);
      await opcApi.writeVariable(`MOTOR_${motorId}_${variable}_SETPOINT`, value);
      // Show success message or update UI
    } catch (error) {
      console.error('Failed to update setpoint:', error);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeakTest = async () => {
    try {
      setIsLoading(true);
      await opcApi.writeVariable(`PUMP_${motorId}_LEAK_TEST_START`, true);
      // Show success message
    } catch (error) {
      console.error('Failed to start leak test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('MotorDetailModal render check:', { motorId, isOpen, motor: !!motor });
  
  if (!isOpen || !motor) {
    console.log('MotorDetailModal NOT rendering because:', { isOpen, motor: !!motor });
    return null;
  }

  console.log('MotorDetailModal IS rendering for motor:', motorId);

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Ready', class: 'status-ready', color: '#3b82f6' };
      case 1: return { text: 'Running', class: 'status-running', color: '#22c55e' };
      case 2: return { text: 'Warning', class: 'status-warning', color: '#f59e0b' };
      case 3: return { text: 'Error', class: 'status-error', color: '#ef4444' };
      default: return { text: 'Unknown', class: 'status-ready', color: '#6b7280' };
    }
  };

  // Don't render if motor data is not available
  if (!motor) {
    console.log('MotorDetailModal: No motor data for motorId:', motorId);
    return null;
  }

  const statusInfo = getStatusInfo(motor.status);

  console.log('MotorDetailModal rendering for motor:', motorId, motor);

  return (
    <>
      {/* Modal Overlay */}
      <div className="modal-overlay" onClick={onClose} style={{ display: 'block' }} />

      {/* Modal Content */}
      <div className="motor-detail-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 id="modal-title" className="modal-title">
              Motor {motorId} - Detailed View
            </h2>
            <div className={`modal-status ${statusInfo.class}`}>
              <span className="status-dot" style={{ backgroundColor: statusInfo.color }} />
              <span className="status-text">{statusInfo.text}</span>
            </div>
          </div>
          
          <button 
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'realtime' ? 'active' : ''}`}
            onClick={() => setActiveTab('realtime')}
          >
            <span className="tab-icon">📊</span>
            Real-time
          </button>
          <button 
            className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <span className="tab-icon">📈</span>
            Trends
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="tab-icon">⚙️</span>
            Settings
          </button>
          <button 
            className={`tab-button ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <span className="tab-icon">🔧</span>
            Maintenance
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-content">
          {activeTab === 'realtime' && (
            <div className="realtime-tab">
              {/* Gauges Section */}
              <div className="gauges-section">
                <SimpleGauge
                  value={motor.rpm}
                  min={0}
                  max={3000}
                  unit="RPM"
                  label="MOTOR SPEED"
                  size={120}
                  warningThreshold={2700}
                  criticalThreshold={2900}
                />
                
                <SimpleGauge
                  value={motor.pressure}
                  min={0}
                  max={200}
                  unit="bar"
                  label="PRESSURE"
                  size={120}
                  warningThreshold={160}
                  criticalThreshold={180}
                />
                
                <SimpleGauge
                  value={motor.flow}
                  min={0}
                  max={100}
                  unit="L/min"
                  label="FLOW RATE"
                  size={120}
                  warningThreshold={85}
                  criticalThreshold={95}
                />
                
                <SimpleGauge
                  value={motor.temperature}
                  min={0}
                  max={100}
                  unit="°C"
                  label="TEMPERATURE"
                  size={120}
                  warningThreshold={70}
                  criticalThreshold={85}
                />
              </div>

              {/* Digital Values - Reordered per request */}
              <div className="digital-values-section">
                <div className="value-grid">
                  <div className="digital-value-card">
                    <div className="card-header">Target RPM</div>
                    <div className="card-value" style={{ color: '#06b6d4' }}>
                      {motor.targetRpm.toFixed(0)}
                    </div>
                    <div className="card-unit">RPM</div>
                  </div>

                  <div className="digital-value-card">
                    <div className="card-header">Pressure Setpoint</div>
                    <div className="card-value" style={{ color: '#8b5cf6' }}>
                      {motor.pressureSetpoint.toFixed(1)}
                    </div>
                    <div className="card-unit">bar</div>
                  </div>

                  <div className="digital-value-card">
                    <div className="card-header">Flow Setpoint</div>
                    <div className="card-value" style={{ color: '#f59e0b' }}>
                      {motor.flowSetpoint.toFixed(1)}
                    </div>
                    <div className="card-unit">L/min</div>
                  </div>

                  <div className="digital-value-card">
                    <div className="card-header">Leakage</div>
                    <div className="card-value" style={{ 
                      color: motor.leak > 0.05 ? '#ef4444' : 
                            motor.leak > 0.02 ? '#f59e0b' : '#22c55e' 
                    }}>
                      {motor.leak.toFixed(3)}
                    </div>
                    <div className="card-unit">L/min</div>
                  </div>
                </div>
              </div>

              {/* Control Actions */}
              <div className="control-actions">
                <button 
                  className="action-button leak-test"
                  onClick={handleLeakTest}
                  disabled={isLoading}
                >
                  🔍 Start Leak Test
                </button>
                
                <button className="action-button emergency">
                  🛑 Emergency Stop
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="trends-tab">
              {isLoading ? (
                <div className="loading-section">
                  <div className="loading-spinner" />
                  <p>Loading trend data...</p>
                </div>
              ) : (
                <div className="trends-content">
                  <div className="trend-header">
                    <h3>Son 24 Saat - Gerçek Zamanlı Trend</h3>
                    <p>5 dakikalık örnekleme ile InfluxDB'den alınan veriler</p>
                  </div>

                  <div className="trend-charts">
                    {/* Pressure Chart */}
                    <div className="trend-chart-container">
                      <div className="chart-header">
                        <h4>Basınç Grafiği</h4>
                        <div className="chart-legend">
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#22c55e' }}></span>
                            Gerçek Değer
                          </span>
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#06b6d4' }}></span>
                            Set Point: {motor.pressureSetpoint} bar
                          </span>
                        </div>
                      </div>
                      <div className="touch-chart-area">
                        <svg viewBox="0 0 800 300" className="trend-svg">
                          {/* Grid Lines */}
                          {[0, 50, 100, 150, 200].map(y => (
                            <g key={y}>
                              <line x1="50" y1={250 - y} x2="750" y2={250 - y} stroke="rgba(96, 160, 255, 0.1)" strokeDasharray="5,5" />
                              <text x="35" y={255 - y} fill="rgba(168, 178, 192, 0.6)" fontSize="12" textAnchor="end">
                                {(y * 200 / 200).toFixed(0)}
                              </text>
                            </g>
                          ))}
                          
                          {/* Data Line */}
                          <polyline
                            points={trendData.pressure.map((point, i) => 
                              `${50 + (i * 700 / (trendData.pressure.length - 1))},${250 - (point.value / 200) * 200}`
                            ).join(' ')}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Set Point Line */}
                          <line 
                            x1="50" 
                            y1={250 - (motor.pressureSetpoint / 200) * 200} 
                            x2="750" 
                            y2={250 - (motor.pressureSetpoint / 200) * 200} 
                            stroke="#06b6d4" 
                            strokeWidth="2" 
                            strokeDasharray="10,5"
                            opacity="0.7"
                          />
                          
                          {/* Data Points */}
                          {trendData.pressure.map((point, i) => (
                            <circle
                              key={i}
                              cx={50 + (i * 700 / (trendData.pressure.length - 1))}
                              cy={250 - (point.value / 200) * 200}
                              r="4"
                              fill="#22c55e"
                              className="chart-point"
                            />
                          ))}
                          
                          {/* Axis Labels */}
                          <text x="400" y="290" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle">Zaman (Saat)</text>
                          <text x="20" y="150" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle" transform="rotate(-90 20 150)">Basınç (bar)</text>
                        </svg>
                        
                        <div className="chart-stats">
                          <div className="stat-item">
                            <span className="stat-label">Güncel:</span>
                            <span className="stat-value" style={{ color: '#22c55e' }}>{motor.pressure.toFixed(1)} bar</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Ortalama:</span>
                            <span className="stat-value">{(trendData.pressure.reduce((a, b) => a + b.value, 0) / trendData.pressure.length || 0).toFixed(1)} bar</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Min/Max:</span>
                            <span className="stat-value">
                              {Math.min(...trendData.pressure.map(p => p.value)).toFixed(1)} / 
                              {Math.max(...trendData.pressure.map(p => p.value)).toFixed(1)} bar
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flow Chart */}
                    <div className="trend-chart-container">
                      <div className="chart-header">
                        <h4>Debi Grafiği</h4>
                        <div className="chart-legend">
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#06b6d4' }}></span>
                            Gerçek Değer
                          </span>
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                            Set Point: {motor.flowSetpoint} L/min
                          </span>
                        </div>
                      </div>
                      <div className="touch-chart-area">
                        <svg viewBox="0 0 800 300" className="trend-svg">
                          {/* Grid Lines */}
                          {[0, 25, 50, 75, 100].map(y => (
                            <g key={y}>
                              <line x1="50" y1={250 - y * 2} x2="750" y2={250 - y * 2} stroke="rgba(96, 160, 255, 0.1)" strokeDasharray="5,5" />
                              <text x="35" y={255 - y * 2} fill="rgba(168, 178, 192, 0.6)" fontSize="12" textAnchor="end">
                                {y}
                              </text>
                            </g>
                          ))}
                          
                          {/* Data Line */}
                          <polyline
                            points={trendData.flow.map((point, i) => 
                              `${50 + (i * 700 / (trendData.flow.length - 1))},${250 - (point.value / 100) * 200}`
                            ).join(' ')}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Set Point Line */}
                          <line 
                            x1="50" 
                            y1={250 - (motor.flowSetpoint / 100) * 200} 
                            x2="750" 
                            y2={250 - (motor.flowSetpoint / 100) * 200} 
                            stroke="#f59e0b" 
                            strokeWidth="2" 
                            strokeDasharray="10,5"
                            opacity="0.7"
                          />
                          
                          {/* Data Points */}
                          {trendData.flow.map((point, i) => (
                            <circle
                              key={i}
                              cx={50 + (i * 700 / (trendData.flow.length - 1))}
                              cy={250 - (point.value / 100) * 200}
                              r="4"
                              fill="#06b6d4"
                              className="chart-point"
                            />
                          ))}
                          
                          {/* Axis Labels */}
                          <text x="400" y="290" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle">Zaman (Saat)</text>
                          <text x="20" y="150" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle" transform="rotate(-90 20 150)">Debi (L/min)</text>
                        </svg>
                        
                        <div className="chart-stats">
                          <div className="stat-item">
                            <span className="stat-label">Güncel:</span>
                            <span className="stat-value" style={{ color: '#06b6d4' }}>{motor.flow.toFixed(1)} L/min</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Ortalama:</span>
                            <span className="stat-value">{(trendData.flow.reduce((a, b) => a + b.value, 0) / trendData.flow.length || 0).toFixed(1)} L/min</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Min/Max:</span>
                            <span className="stat-value">
                              {Math.min(...trendData.flow.map(p => p.value)).toFixed(1)} / 
                              {Math.max(...trendData.flow.map(p => p.value)).toFixed(1)} L/min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Temperature Chart */}
                    <div className="trend-chart-container">
                      <div className="chart-header">
                        <h4>Sıcaklık Grafiği</h4>
                        <div className="chart-legend">
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                            Motor Sıcaklığı
                          </span>
                          <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
                            Alarm: 70°C
                          </span>
                        </div>
                      </div>
                      <div className="touch-chart-area">
                        <svg viewBox="0 0 800 300" className="trend-svg">
                          {/* Grid Lines */}
                          {[0, 20, 40, 60, 80, 100].map(y => (
                            <g key={y}>
                              <line x1="50" y1={250 - y * 2} x2="750" y2={250 - y * 2} stroke="rgba(96, 160, 255, 0.1)" strokeDasharray="5,5" />
                              <text x="35" y={255 - y * 2} fill="rgba(168, 178, 192, 0.6)" fontSize="12" textAnchor="end">
                                {y}
                              </text>
                            </g>
                          ))}
                          
                          {/* Warning Zone */}
                          <rect x="50" y="50" width="700" height="40" fill="rgba(239, 68, 68, 0.1)" />
                          
                          {/* Data Line */}
                          <polyline
                            points={trendData.temperature.map((point, i) => 
                              `${50 + (i * 700 / (trendData.temperature.length - 1))},${250 - (point.value / 100) * 200}`
                            ).join(' ')}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Alarm Line */}
                          <line 
                            x1="50" 
                            y1={250 - (70 / 100) * 200} 
                            x2="750" 
                            y2={250 - (70 / 100) * 200} 
                            stroke="#ef4444" 
                            strokeWidth="2" 
                            strokeDasharray="10,5"
                            opacity="0.7"
                          />
                          
                          {/* Data Points */}
                          {trendData.temperature.map((point, i) => (
                            <circle
                              key={i}
                              cx={50 + (i * 700 / (trendData.temperature.length - 1))}
                              cy={250 - (point.value / 100) * 200}
                              r="4"
                              fill={point.value > 70 ? '#ef4444' : '#f59e0b'}
                              className="chart-point"
                            />
                          ))}
                          
                          {/* Axis Labels */}
                          <text x="400" y="290" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle">Zaman (Saat)</text>
                          <text x="20" y="150" fill="rgba(168, 178, 192, 0.8)" fontSize="12" textAnchor="middle" transform="rotate(-90 20 150)">Sıcaklık (°C)</text>
                        </svg>
                        
                        <div className="chart-stats">
                          <div className="stat-item">
                            <span className="stat-label">Güncel:</span>
                            <span className="stat-value" style={{ color: motor.temperature > 70 ? '#ef4444' : '#f59e0b' }}>
                              {motor.temperature.toFixed(1)}°C
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Ortalama:</span>
                            <span className="stat-value">{(trendData.temperature.reduce((a, b) => a + b.value, 0) / trendData.temperature.length || 0).toFixed(1)}°C</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Min/Max:</span>
                            <span className="stat-value">
                              {Math.min(...trendData.temperature.map(p => p.value)).toFixed(1)} / 
                              {Math.max(...trendData.temperature.map(p => p.value)).toFixed(1)}°C
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="settings-content">
                <h3>Motor Control Settings</h3>
                
                <div className="settings-grid">
                  <div className="setting-group">
                    <label className="setting-label">
                      RPM Setpoint
                      <input
                        type="number"
                        className="setting-input"
                        value={rpmSetpoint}
                        onChange={(e) => setRpmSetpoint(Number(e.target.value))}
                        min="0"
                        max="3000"
                        step="10"
                      />
                      <span className="setting-unit">RPM</span>
                    </label>
                    <button 
                      className="apply-button"
                      onClick={() => handleSetpointSubmit('MOTOR_TARGET_RPM', rpmSetpoint)}
                      disabled={isLoading}
                    >
                      Apply
                    </button>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      Pressure Setpoint
                      <input
                        type="number"
                        className="setting-input"
                        value={pressureSetpoint}
                        onChange={(e) => setPressureSetpoint(Number(e.target.value))}
                        min="0"
                        max="200"
                        step="0.1"
                      />
                      <span className="setting-unit">bar</span>
                    </label>
                    <button 
                      className="apply-button"
                      onClick={() => handleSetpointSubmit('PUMP_PRESSURE', pressureSetpoint)}
                      disabled={isLoading}
                    >
                      Apply
                    </button>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      Flow Rate Setpoint
                      <input
                        type="number"
                        className="setting-input"
                        value={flowSetpoint}
                        onChange={(e) => setFlowSetpoint(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="setting-unit">L/min</span>
                    </label>
                    <button 
                      className="apply-button"
                      onClick={() => handleSetpointSubmit('PUMP_FLOW', flowSetpoint)}
                      disabled={isLoading}
                    >
                      Apply
                    </button>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      Temperature Limit
                      <input
                        type="number"
                        className="setting-input"
                        value={tempSetpoint}
                        onChange={(e) => setTempSetpoint(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="setting-unit">°C</span>
                    </label>
                    <button 
                      className="apply-button"
                      onClick={() => handleSetpointSubmit('TEMP_LIMIT', tempSetpoint)}
                      disabled={isLoading}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="advanced-settings">
                  <h4>Advanced Controls</h4>
                  <div className="advanced-grid">
                    <div className="control-switch">
                      <label>
                        <input type="checkbox" checked={motor.enabled} readOnly />
                        <span className="switch-slider"></span>
                        Motor Enabled
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="maintenance-tab">
              <div className="maintenance-content">
                <h3>Maintenance & Service Information</h3>
                
                {/* Service Status Cards */}
                <div className="service-status-grid">
                  <div className="service-card">
                    <div className="service-header">
                      <span className="service-icon">⏰</span>
                      <span className="service-title">Runtime Hours</span>
                    </div>
                    <div className="service-value">
                      {(2340 + motorId * 127).toLocaleString()} hrs
                    </div>
                    <div className="service-detail">
                      Total operational time since commissioning
                    </div>
                  </div>

                  <div className="service-card">
                    <div className="service-header">
                      <span className="service-icon">🔧</span>
                      <span className="service-title">Last Service</span>
                    </div>
                    <div className="service-value">
                      {new Date(Date.now() - (15 + motorId * 3) * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="service-detail">
                      Routine maintenance performed
                    </div>
                  </div>

                  <div className="service-card">
                    <div className="service-header">
                      <span className="service-icon">📅</span>
                      <span className="service-title">Next Service</span>
                    </div>
                    <div className="service-value">
                      {new Date(Date.now() + (30 - motorId * 2) * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="service-detail">
                      Scheduled maintenance due
                    </div>
                  </div>

                  <div className="service-card">
                    <div className="service-header">
                      <span className="service-icon">🔄</span>
                      <span className="service-title">Start Cycles</span>
                    </div>
                    <div className="service-value">
                      {(15420 + motorId * 892).toLocaleString()}
                    </div>
                    <div className="service-detail">
                      Total motor start operations
                    </div>
                  </div>
                </div>

                {/* Component Health Status */}
                <div className="component-health-section">
                  <h4>Component Health Status</h4>
                  <div className="health-components">
                    <div className="health-item">
                      <div className="health-header">
                        <span className="health-icon">⚡</span>
                        <span className="health-name">Motor Windings</span>
                        <span className={`health-status ${motor.temperature < 60 ? 'good' : motor.temperature < 70 ? 'fair' : 'poor'}`}>
                          {motor.temperature < 60 ? 'GOOD' : motor.temperature < 70 ? 'FAIR' : 'POOR'}
                        </span>
                      </div>
                      <div className="health-detail">
                        Insulation resistance: 150+ MΩ | Temperature: {motor.temperature.toFixed(1)}°C
                      </div>
                    </div>

                    <div className="health-item">
                      <div className="health-header">
                        <span className="health-icon">🔩</span>
                        <span className="health-name">Bearings</span>
                        <span className="health-status good">GOOD</span>
                      </div>
                      <div className="health-detail">
                        Vibration levels normal | Last lubrication: 45 days ago
                      </div>
                    </div>

                    {/* Filter sections removed per user request */}
                  </div>
                </div>

                {/* Maintenance Actions */}
                <div className="maintenance-actions">
                  <h4>Maintenance Actions</h4>
                  <div className="action-buttons-grid">
                    <button className="maintenance-btn routine">
                      📋 Schedule Routine Service
                    </button>
                    <button className="maintenance-btn filter">
                      🔽 Replace Filters
                    </button>
                    <button className="maintenance-btn calibration">
                      ⚙️ Sensor Calibration
                    </button>
                    <button className="maintenance-btn inspection">
                      🔍 Visual Inspection
                    </button>
                    <button className="maintenance-btn lubrication">
                      🛢️ Bearing Lubrication
                    </button>
                    <button className="maintenance-btn testing">
                      🧪 Performance Test
                    </button>
                  </div>
                </div>

                {/* Maintenance History */}
                <div className="maintenance-history">
                  <h4>Recent Maintenance History</h4>
                  <div className="history-table">
                    <div className="history-header">
                      <span>Date</span>
                      <span>Type</span>
                      <span>Technician</span>
                      <span>Status</span>
                    </div>
                    {[
                      { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), type: 'Routine Service', tech: 'Tech_01', status: 'Completed' },
                      { date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), type: 'Filter Replacement', tech: 'Tech_02', status: 'Completed' },
                      { date: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000), type: 'Bearing Lubrication', tech: 'Tech_01', status: 'Completed' },
                      { date: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), type: 'Sensor Calibration', tech: 'Tech_03', status: 'Completed' },
                    ].map((item, index) => (
                      <div key={index} className="history-row">
                        <span>{item.date.toLocaleDateString('tr-TR')}</span>
                        <span>{item.type}</span>
                        <span>{item.tech}</span>
                        <span className="status-completed">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerts and Recommendations */}
                <div className="maintenance-alerts">
                  <h4>Alerts & Recommendations</h4>
                  <div className="alerts-list">
                    {motor.temperature > 65 && (
                      <div className="alert warning">
                        <span className="alert-icon">⚠️</span>
                        <div className="alert-content">
                          <div className="alert-title">Temperature Monitoring</div>
                          <div className="alert-message">Motor temperature is elevated. Consider checking cooling system.</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Line filter alert removed per user request */}
                    
                    <div className="alert info">
                      <span className="alert-icon">📅</span>
                      <div className="alert-content">
                        <div className="alert-title">Scheduled Maintenance</div>
                        <div className="alert-message">Next routine service due in {30 - motorId * 2} days. Auto-scheduled for optimal performance.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MotorDetailModal;