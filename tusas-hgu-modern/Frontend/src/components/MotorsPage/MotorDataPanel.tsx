import React, { useState, useEffect } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOpcStore } from '../../store/opcStore';
import MotorControlPanel from './MotorControlPanel';
import SetpointEditPopup from './SetpointEditPopup';

interface MotorDataPanelProps {
  motorId: number;
}

interface ChartDataPoint {
  timestamp: string;
  current: number | null;
  rpm: number | null;
  rpmNormalized: number | null;
  temperature: number | null;
}

const MotorDataPanel: React.FC<MotorDataPanelProps> = ({ motorId }) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [visibleMetrics, setVisibleMetrics] = useState({
    current: true,
    rpm: true,
    temperature: true
  });
  const [editingSetpoint, setEditingSetpoint] = useState<{
    type: 'current' | 'rpm' | 'temperature';
    currentValue: number;
  } | null>(null);
  const [leakTestStatus, setLeakTestStatus] = useState<'idle' | 'running' | 'ok'>('idle');

  // Normalize RPM to 0-100 scale for multi-axis chart
  const normalizeRPM = (rpm: number) => (rpm / 1500) * 100;

  // Fetch historical data from InfluxDB
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/influx/motor-series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motors: [motorId],
            metrics: ['current', 'rpm', 'temperature'],
            range: '30m',
            maxPoints: 180
          })
        });

        if (response.ok) {
          const data = await response.json();
          const motorSeries = data.motorSeries || [];

          const formattedData = motorSeries.map((point: any) => ({
            timestamp: new Date(point.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            current: point.current ?? null,
            rpm: point.rpm ?? null,
            rpmNormalized: point.rpm ? normalizeRPM(point.rpm) : null,
            temperature: point.temperature ?? null
          }));

          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Failed to fetch motor chart data:', error);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 2000); // 2 seconds
    return () => clearInterval(interval);
  }, [motorId]);

  const handleSetpointSave = async (type: 'current' | 'rpm' | 'temperature', value: number) => {
    let variableName = '';
    switch (type) {
      case 'current':
        variableName = `MOTOR_${motorId}_CURRENT_LIMIT`;
        break;
      case 'rpm':
        variableName = `MOTOR_${motorId}_RPM_SETPOINT`;
        break;
      case 'temperature':
        variableName = `MOTOR_${motorId}_TEMPERATURE_LIMIT`;
        break;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/opc/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: variableName,
          value: value
        })
      });

      if (!response.ok) {
        throw new Error('Failed to write setpoint');
      }
    } catch (error) {
      console.error('Setpoint write error:', error);
      throw error;
    }
  };

  const handleMotorEnableToggle = async (enable: boolean) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://localhost:5000/api/opc/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: `MOTOR_${motorId}_ENABLE`,
        value: enable
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to toggle motor enable');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to toggle motor enable');
    }
  };

  const handleStartCommand = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://localhost:5000/api/opc/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: `MOTOR_${motorId}_START_CMD`,
        value: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send start command');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send start command');
    }
  };

  const handleStopCommand = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://localhost:5000/api/opc/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: `MOTOR_${motorId}_STOP_CMD`,
        value: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send stop command');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send stop command');
    }
  };

  const handleResetCommand = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://localhost:5000/api/opc/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: `MOTOR_${motorId}_RESET_CMD`,
        value: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send reset command');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send reset command');
    }
  };

  const handleLeakTest = async (action: 'start' | 'stop') => {
    const variableName = `MOTOR_${motorId}_LEAK_${action.toUpperCase()}`;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/opc/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: variableName,
          value: 1
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger leak test');
      }

      if (action === 'start') {
        setLeakTestStatus('running');
      } else {
        setLeakTestStatus('ok');
      }
    } catch (error) {
      console.error('Leak test error:', error);
      alert('Failed to trigger leak test');
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{payload[0]?.payload?.timestamp}</p>
          {visibleMetrics.current && payload.find((p: any) => p.dataKey === 'current') && (
            <p className="tooltip-current">
              Current: {payload.find((p: any) => p.dataKey === 'current')?.value?.toFixed(1)} A
            </p>
          )}
          {visibleMetrics.rpm && payload.find((p: any) => p.dataKey === 'rpm') && (
            <p className="tooltip-rpm">
              RPM: {payload.find((p: any) => p.dataKey === 'rpm')?.value?.toFixed(0)} rpm
            </p>
          )}
          {visibleMetrics.temperature && payload.find((p: any) => p.dataKey === 'temperature') && (
            <p className="tooltip-temperature">
              Temperature: {payload.find((p: any) => p.dataKey === 'temperature')?.value?.toFixed(1)} °C
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="motor-data-panel">
      <div className="metrics-display-3col">
        {/* Left Column - Metrics */}
        <div className="metrics-column">
          <div className="metric-row-compact">
            <span className="metric-label">Current</span>
            <span className="metric-value">
              {motor?.current?.toFixed(1) ?? '--'} A
            </span>
            <span className="metric-setpoint">
              Limit: 15.0
            </span>
            <button
              className="edit-icon"
              onClick={() => setEditingSetpoint({
                type: 'current',
                currentValue: 15
              })}
            >
              ✏️
            </button>
          </div>

          <div className="metric-row-compact">
            <span className="metric-label">RPM</span>
            <span className="metric-value">
              {motor?.rpm?.toFixed(0) ?? '--'} rpm
            </span>
            <span className="metric-setpoint">
              Set: {motor?.targetRpm?.toFixed(0) ?? '--'}
            </span>
            <button
              className="edit-icon"
              onClick={() => setEditingSetpoint({
                type: 'rpm',
                currentValue: motor?.targetRpm ?? 1500
              })}
            >
              ✏️
            </button>
          </div>

          <div className="metric-row-compact">
            <span className="metric-label">Temperature</span>
            <span className="metric-value">
              {motor?.temperature?.toFixed(1) ?? '--'} °C
            </span>
            <span className="metric-setpoint">
              Limit: 60
            </span>
            <button
              className="edit-icon"
              onClick={() => setEditingSetpoint({
                type: 'temperature',
                currentValue: 60
              })}
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Middle Column - Leak Test */}
        <div className="status-column">
          <div className="leak-test-compact">
            <span className="control-label">Leak Test</span>
            <div className="button-group">
              <button
                className="leak-button start-button"
                onClick={() => handleLeakTest('start')}
                disabled={leakTestStatus === 'running'}
              >
                Start
              </button>
              <button
                className="leak-button stop-button"
                onClick={() => handleLeakTest('stop')}
                disabled={leakTestStatus === 'idle'}
              >
                Stop
              </button>
            </div>
            <span className={`leak-status ${leakTestStatus === 'ok' ? 'status-ok' : ''}`}>
              {leakTestStatus === 'ok' ? '✓ OK' : leakTestStatus === 'running' ? 'Running...' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Right Column - Motor Control Panel */}
        <div className={`control-column ${motor?.enabled ? 'motor-active' : ''}`}>
          <MotorControlPanel
            motorId={motorId}
            enabled={motor?.enabled === true}
            startAck={motor?.startAck === true}
            stopAck={motor?.stopAck === true}
            onEnableChange={handleMotorEnableToggle}
            onStartCommand={handleStartCommand}
            onStopCommand={handleStopCommand}
            onResetCommand={handleResetCommand}
          />
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <span className="chart-title">Trends (Last 30min)</span>
          <div className="metric-toggles">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={visibleMetrics.current}
                onChange={() => setVisibleMetrics(prev => ({ ...prev, current: !prev.current }))}
              />
              C
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={visibleMetrics.rpm}
                onChange={() => setVisibleMetrics(prev => ({ ...prev, rpm: !prev.rpm }))}
              />
              R
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={visibleMetrics.temperature}
                onChange={() => setVisibleMetrics(prev => ({ ...prev, temperature: !prev.temperature }))}
              />
              T
            </label>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="timestamp"
              stroke="#94a3b8"
              fontSize={9}
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={9}
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
              width={35}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8"
              fontSize={9}
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
              width={35}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleMetrics.current && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="current"
                fill="rgba(255, 152, 0, 0.2)"
                stroke="#ff9800"
                strokeWidth={2}
                name="Current"
              />
            )}
            {visibleMetrics.rpm && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="rpmNormalized"
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth={2}
                name="RPM"
              />
            )}
            {visibleMetrics.temperature && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                fill="rgba(239, 68, 68, 0.2)"
                stroke="#ef4444"
                strokeWidth={2}
                name="Temperature"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {editingSetpoint && (
        <SetpointEditPopup
          currentValue={editingSetpoint.currentValue}
          onSave={(value) => handleSetpointSave(editingSetpoint.type, value)}
          onClose={() => setEditingSetpoint(null)}
          unit={
            editingSetpoint.type === 'current' ? 'A' :
            editingSetpoint.type === 'rpm' ? 'rpm' : '°C'
          }
          label={
            editingSetpoint.type === 'current' ? 'Current Limit' :
            editingSetpoint.type === 'rpm' ? 'RPM Setpoint' : 'Temperature Limit'
          }
          min={0}
          max={
            editingSetpoint.type === 'current' ? 20 :
            editingSetpoint.type === 'rpm' ? 2000 : 80
          }
          step={editingSetpoint.type === 'rpm' ? 10 : 0.1}
        />
      )}
    </div>
  );
};

export default MotorDataPanel;
