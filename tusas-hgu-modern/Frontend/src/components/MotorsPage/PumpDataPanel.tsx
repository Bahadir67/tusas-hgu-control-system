import React, { useState, useEffect } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOpcStore } from '../../store/opcStore';
import FilterLED from './FilterLED';
import ValveLED from './ValveLED';
import MotorControlPanel from './MotorControlPanel';
import SetpointEditPopup from './SetpointEditPopup';

interface PumpDataPanelProps {
  motorId: number;
}

interface ChartDataPoint {
  timestamp: string;
  pressure: number | null;
  flow: number | null;
}

const PumpDataPanel: React.FC<PumpDataPanelProps> = ({ motorId }) => {
  const motor = useOpcStore((state) => state.motors[motorId]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [visibleMetrics, setVisibleMetrics] = useState({
    pressure: true,
    flow: true
  });
  const [editingSetpoint, setEditingSetpoint] = useState<{
    type: 'pressure' | 'flow';
    currentValue: number;
  } | null>(null);

  // Fetch historical data from InfluxDB
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/influx/motor-series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motors: [motorId],
            metrics: ['pressure', 'flow'],
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
            pressure: point.pressure ?? null,
            flow: point.flow ?? null
          }));

          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Failed to fetch pump chart data:', error);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 2000); // 2 seconds
    return () => clearInterval(interval);
  }, [motorId]);

  const handleSetpointSave = async (type: 'pressure' | 'flow', value: number) => {
    const variableName = type === 'pressure'
      ? `PUMP_${motorId}_PRESSURE_SETPOINT`
      : `PUMP_${motorId}_FLOW_SETPOINT`;

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{payload[0]?.payload?.timestamp}</p>
          {visibleMetrics.pressure && payload.find((p: any) => p.dataKey === 'pressure') && (
            <p className="tooltip-pressure">
              Pressure: {payload.find((p: any) => p.dataKey === 'pressure')?.value?.toFixed(1)} bar
            </p>
          )}
          {visibleMetrics.flow && payload.find((p: any) => p.dataKey === 'flow') && (
            <p className="tooltip-flow">
              Flow: {payload.find((p: any) => p.dataKey === 'flow')?.value?.toFixed(1)} L/min
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pump-data-panel">
      <div className="metrics-display-3col">
        {/* Left Column - Metrics */}
        <div className="metrics-column">
          <div className="metric-row-compact">
            <span className="metric-label">Pressure</span>
            <span className="metric-value">
              {motor?.pressure?.toFixed(1) ?? '--'} bar
            </span>
            <span className="metric-setpoint">
              Set: {motor?.pressureSetpoint?.toFixed(1) ?? '--'}
            </span>
            <button
              className="edit-icon"
              onClick={() => setEditingSetpoint({
                type: 'pressure',
                currentValue: motor?.pressureSetpoint ?? 50
              })}
            >
              ✏️
            </button>
          </div>

          <div className="metric-row-compact">
            <span className="metric-label">Flow</span>
            <span className="metric-value">
              {motor?.flow?.toFixed(1) ?? '--'} L/min
            </span>
            <span className="metric-setpoint">
              Set: {motor?.flowSetpoint?.toFixed(1) ?? '--'}
            </span>
            <button
              className="edit-icon"
              onClick={() => setEditingSetpoint({
                type: 'flow',
                currentValue: motor?.flowSetpoint ?? 18
              })}
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Middle Column - Status LEDs */}
        <div className="status-column">
          <div className="filters-row-compact">
            <FilterLED
              status={motor?.suctionFilter ?? 0}
              label="Suction"
            />
            <FilterLED
              status={motor?.lineFilter ?? 0}
              label="Line"
            />
          </div>

          <div className="valve-row-compact">
            <ValveLED status={motor?.manualValve ?? 0} />
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
                checked={visibleMetrics.pressure}
                onChange={() => setVisibleMetrics(prev => ({ ...prev, pressure: !prev.pressure }))}
              />
              P
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={visibleMetrics.flow}
                onChange={() => setVisibleMetrics(prev => ({ ...prev, flow: !prev.flow }))}
              />
              F
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
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleMetrics.pressure && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="pressure"
                fill="rgba(0, 153, 255, 0.2)"
                stroke="#0099ff"
                strokeWidth={2}
                name="Pressure"
              />
            )}
            {visibleMetrics.flow && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="flow"
                fill="rgba(0, 255, 136, 0.2)"
                stroke="#00ff88"
                strokeWidth={2}
                name="Flow"
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
          unit={editingSetpoint.type === 'pressure' ? 'bar' : 'L/min'}
          label={editingSetpoint.type === 'pressure' ? 'Pressure Setpoint' : 'Flow Setpoint'}
          min={0}
          max={editingSetpoint.type === 'pressure' ? 100 : 30}
          step={0.1}
        />
      )}
    </div>
  );
};

export default PumpDataPanel;
