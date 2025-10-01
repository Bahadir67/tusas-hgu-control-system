import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOpcStore } from '../../store/opcStore';
import SystemSetpointsModal from '../SystemSetpointsModal';
import './SystemOverviewPanel.css';
import './SystemOverviewPanel-compact.css';

// All-in-one compact panel - no tabs needed

interface StatusInfo {
  text: string;
  class: string;
  color: string;
  icon: string;
}

interface SystemData {
  totalFlowExecution?: number;
  pressureExecution?: number;
  statusExecution: number;
  totalFlowSetpoint?: number;
  pressureSetpoint?: number;
  efficiency?: number;
  activePumps?: number;
  systemEnable: boolean;
}

interface SystemOverviewPanelProps {
  alarms?: Array<{ id: number; message: string; type: string }>;
  onSystemEnableToggle?: () => void;
}

const formatNumber = (value?: number, fractionDigits = 1) => {
  if (value === undefined || Number.isNaN(value)) {
    return 'ERR';
  }
  return value.toFixed(fractionDigits);
};

const calculateProgress = (current?: number, target?: number) => {
  if (current === undefined || target === undefined || target <= 0) {
    return { width: '0%', display: 'ERR' };
  }

  const ratio = (current / target) * 100;
  const clampedWidth = Math.min(Math.max(ratio, 0), 100);
  const clampedDisplay = Math.max(Math.min(ratio, 200), 0);

  return {
    width: `${clampedWidth}%`,
    display: `${clampedDisplay.toFixed(0)}%`
  };
};

const buildSystemData = (system: ReturnType<typeof useOpcStore>['system']): SystemData => ({
  totalFlowExecution: system?.totalFlow,
  pressureExecution: system?.totalPressure,
  statusExecution: system?.systemStatus || 0,
  totalFlowSetpoint: system?.flowSetpoint,
  pressureSetpoint: system?.pressureSetpoint,
  efficiency: system?.systemEfficiency,
  activePumps: system?.activePumps,
  systemEnable: system?.systemEnable || false
});

// Compact All-in-One Section combining all data
const CompactAllDataSection: React.FC<{
  data: SystemData;
  statusInfo: StatusInfo;
  getValueColor: (current: number, setpoint: number, tolerance?: number) => string;
  getEfficiencyColor: (efficiency: number) => string;
  onSystemEnableToggle?: () => void;
  onOpenSetpoints: () => void;
}> = ({ data, statusInfo, getValueColor, getEfficiencyColor, onSystemEnableToggle, onOpenSetpoints }) => {
  const [chartData, setChartData] = React.useState<Array<{
    time: string;
    totalFlow: number | null;
    totalPressure: number | null;
  }>>([]);

  // Fetch 30-minute historical data from InfluxDB using working motor-series endpoint
  React.useEffect(() => {
    const fetchTrendData = async () => {
      try {
        // Use the same endpoint as InfluxDB Monitor (motor-series) which returns SystemSeries
        const response = await fetch('http://localhost:5000/api/influx/motor-series', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            motors: [1], // Dummy motor to trigger query
            metrics: ['pressure'], // Dummy metric
            range: '30m',
            maxPoints: 180
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Extract SystemSeries from response (motor-series returns both motor and system data)
          const systemSeries = result.SystemSeries || result.systemSeries || [];

          if (Array.isArray(systemSeries)) {
            const formattedData = systemSeries.map((point: any) => ({
              time: new Date(point.timestamp).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              totalFlow: point.totalFlow,
              totalPressure: point.totalPressure
            }));
            setChartData(formattedData);
          }
        } else {
          console.error('Failed to fetch trend data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
      }
    };

    // Initial fetch
    fetchTrendData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTrendData, 30000);
    return () => clearInterval(interval);
  }, []);

  const flowColor =
    data.totalFlowExecution !== undefined && data.totalFlowSetpoint !== undefined
      ? getValueColor(data.totalFlowExecution, data.totalFlowSetpoint)
      : '#ef4444';

  const pressureColor =
    data.pressureExecution !== undefined && data.pressureSetpoint !== undefined
      ? getValueColor(data.pressureExecution, data.pressureSetpoint)
      : '#ef4444';

  const flowProgress = calculateProgress(data.totalFlowExecution, data.totalFlowSetpoint);
  const pressureProgress = calculateProgress(data.pressureExecution, data.pressureSetpoint);

  // Custom Tooltip matching InfluxDB style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="system-chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-time">{payload[0]?.payload?.time}</span>
          </div>
          <div className="tooltip-content">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="tooltip-item">
                <span className="tooltip-color" style={{ backgroundColor: entry.color }} />
                <span className="tooltip-label">
                  {entry.dataKey === 'totalFlow' ? 'Total Flow' : 'Total Pressure'}:
                </span>
                <span className="tooltip-value">
                  {entry.value !== null && !Number.isNaN(entry.value)
                    ? `${entry.value.toFixed(1)} ${entry.dataKey === 'totalFlow' ? 'L/min' : 'bar'}`
                    : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Top Row: Status + System Enable */}
      <div className="compact-top-row">
        <div className="summary-card status-card-compact">
          <span className="summary-icon">{statusInfo.icon}</span>
          <div className="status-info-compact">
            <span className="summary-label">System</span>
            <span className="summary-status-compact" style={{ color: statusInfo.color }}>{statusInfo.text}</span>
          </div>
          <div className="summary-mode-compact" style={{ backgroundColor: data.systemEnable ? '#3b82f6' : '#06b6d4' }}>
            {data.systemEnable ? 'AUTO' : 'MANUAL'}
          </div>
        </div>

        <div className="system-enable-compact">
          <span className="enable-label-compact">ENABLE</span>
          <div
            className={`enable-toggle-compact ${data.systemEnable ? 'active' : 'inactive'}`}
            onClick={onSystemEnableToggle}
            role="button"
            tabIndex={0}
          >
            <div className="enable-slider-compact" />
          </div>
        </div>
      </div>

      {/* Middle Row: Flow + Pressure with progress */}
      <div className="compact-metrics-row">
        <div className="metric-card-compact">
          <div className="metric-header-compact">
            <span className="metric-icon">💧</span>
            <span className="metric-label">Flow Rate</span>
          </div>
          <div className="metric-values-compact">
            <span className="metric-value" style={{ color: flowColor }}>
              {formatNumber(data.totalFlowExecution)}
              {formatNumber(data.totalFlowExecution) !== 'ERR' && <span className="metric-unit">L/min</span>}
            </span>
            <span className="metric-sp">SP: {formatNumber(data.totalFlowSetpoint)}</span>
          </div>
          <div className="progress-bar-compact" style={{ backgroundColor: flowColor, width: flowProgress.width }} />
        </div>

        <div className="metric-card-compact">
          <div className="metric-header-compact">
            <span className="metric-icon">⚡</span>
            <span className="metric-label">Pressure</span>
          </div>
          <div className="metric-values-compact">
            <span className="metric-value" style={{ color: pressureColor }}>
              {formatNumber(data.pressureExecution)}
              {formatNumber(data.pressureExecution) !== 'ERR' && <span className="metric-unit">bar</span>}
            </span>
            <span className="metric-sp">SP: {formatNumber(data.pressureSetpoint)}</span>
          </div>
          <div className="progress-bar-compact" style={{ backgroundColor: pressureColor, width: pressureProgress.width }} />
        </div>
      </div>

      {/* Bottom Row: Efficiency + Active Pumps + Setpoints Button */}
      <div className="compact-bottom-row">
        <div className="info-card-compact">
          <span className="info-icon">📈</span>
          <span className="info-label">Efficiency</span>
          <span className="info-value" style={{ color: data.efficiency !== undefined ? getEfficiencyColor(data.efficiency) : '#ef4444' }}>
            {formatNumber(data.efficiency)}{formatNumber(data.efficiency) !== 'ERR' && '%'}
          </span>
        </div>

        <div className="info-card-compact">
          <span className="info-icon">🔧</span>
          <span className="info-label">Active Pumps</span>
          <span className="info-value" style={{ color: '#06b6d4' }}>
            {data.activePumps ?? 'ERR'}/7
          </span>
        </div>

        <button className="setpoints-btn-compact" onClick={onOpenSetpoints} type="button">
          <span className="setpoints-icon">🎯</span>
          Setpoints
        </button>
      </div>

      {/* Combined Trend Chart - InfluxDB style with Recharts */}
      <div className="compact-trends-row">
        <div className="trend-chart-combined">
          <div className="trend-chart-header-combined">
            <div className="trend-legend-item">
              <span className="trend-icon">💧</span>
              <span className="trend-label">Flow Rate</span>
              <span className="trend-value" style={{ color: '#00ff88' }}>L/min</span>
            </div>
            <div className="trend-legend-item">
              <span className="trend-icon">⚡</span>
              <span className="trend-label">Pressure</span>
              <span className="trend-value" style={{ color: '#0099ff' }}>bar</span>
            </div>
          </div>
          <div className="trend-chart-canvas-recharts">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(96, 160, 255, 0.1)" vertical={false} />
                  <XAxis
                    dataKey="time"
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
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalFlow"
                    fill="rgba(0, 255, 136, 0.2)"
                    stroke="#00ff88"
                    strokeWidth={2}
                    name="Total Flow"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalPressure"
                    fill="rgba(0, 153, 255, 0.2)"
                    stroke="#0099ff"
                    strokeWidth={2}
                    name="Total Pressure"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">Collecting data...</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const PerformanceSection: React.FC<{
  data: SystemData;
  getValueColor: (current: number, setpoint: number, tolerance?: number) => string;
  getEfficiencyColor: (efficiency: number) => string;
}> = ({ data, getValueColor, getEfficiencyColor }) => {
  const flowProgress = calculateProgress(data.totalFlowExecution, data.totalFlowSetpoint);
  const pressureProgress = calculateProgress(data.pressureExecution, data.pressureSetpoint);

  return (
    <div className="performance-section">
      <div className="performance-grid">
        <div className="performance-card">
          <div className="performance-card-header">
            <span className="performance-label">Debi Performansı</span>
            <span className="performance-percentage">{flowProgress.display}</span>
          </div>
          <div className="progress-container">
            <div
              className="progress-bar flow-progress"
              style={{
                width: flowProgress.width,
                backgroundColor:
                  data.totalFlowExecution !== undefined && data.totalFlowSetpoint !== undefined
                    ? getValueColor(data.totalFlowExecution, data.totalFlowSetpoint)
                    : '#ef4444'
              }}
            />
          </div>
        </div>

        <div className="performance-card">
          <div className="performance-card-header">
            <span className="performance-label">Basınç Performansı</span>
            <span className="performance-percentage">{pressureProgress.display}</span>
          </div>
          <div className="progress-container">
            <div
              className="progress-bar pressure-progress"
              style={{
                width: pressureProgress.width,
                backgroundColor:
                  data.pressureExecution !== undefined && data.pressureSetpoint !== undefined
                    ? getValueColor(data.pressureExecution, data.pressureSetpoint)
                    : '#ef4444'
              }}
            />
          </div>
        </div>
      </div>

      <div className="secondary-metrics-grid">
        <div className="secondary-metric">
          <div className="secondary-label">Verimlilik</div>
          <div
            className="secondary-value"
            style={{ color: data.efficiency !== undefined ? getEfficiencyColor(data.efficiency) : '#ef4444' }}
          >
            {formatNumber(data.efficiency)}
            {formatNumber(data.efficiency) !== 'ERR' && '%'}
          </div>
        </div>

        <div className="secondary-metric">
          <div className="secondary-label">Aktif Pompalar</div>
          <div className="secondary-value" style={{ color: '#06b6d4' }}>
            {data.activePumps !== undefined ? `${data.activePumps}/6` : 'ERR'}
          </div>
        </div>

        <div className="secondary-metric">
          <div className="secondary-label">Toplam Güç</div>
          <div className="secondary-value" style={{ color: '#8b5cf6' }}>
            Veri bekleniyor
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsSection: React.FC<{
  data: SystemData;
  onSystemEnableToggle?: () => void;
  onOpenSetpoints: () => void;
}> = ({ data, onSystemEnableToggle, onOpenSetpoints }) => (
  <div className="settings-section">
    <div className="setpoints-section compact">
      <div className="setpoints-header">
        <span className="setpoints-icon">🎯</span>
        <span className="setpoints-title">Hedef Değerler</span>
        <button className="setpoints-open-btn" onClick={onOpenSetpoints} type="button">
          Setpoint Ayarları
        </button>
      </div>

      <div className="setpoints-display">
        <div className="setpoint-item">
          <div className="setpoint-header">
            <span className="setpoint-icon">💧</span>
            <span className="setpoint-label">Debi Hedefi</span>
          </div>
          <div className="setpoint-value" style={{ color: '#06b6d4' }}>
            {formatNumber(data.totalFlowSetpoint)} {formatNumber(data.totalFlowSetpoint) !== 'ERR' && 'L/dk'}
          </div>
        </div>

        <div className="setpoint-item">
          <div className="setpoint-header">
            <span className="setpoint-icon">⚡</span>
            <span className="setpoint-label">Basınç Hedefi</span>
          </div>
          <div className="setpoint-value" style={{ color: '#8b5cf6' }}>
            {formatNumber(data.pressureSetpoint)} {formatNumber(data.pressureSetpoint) !== 'ERR' && 'bar'}
          </div>
        </div>
      </div>

      <div className="emergency-status-compact">
        <span className="emergency-icon">🛡️</span>
        <span className="emergency-text">Emergency:</span>
        <span className="emergency-state normal">NORMAL</span>
      </div>
    </div>

    <div className="system-pump-enable-section compact">
      <div className="pump-enable-header">
        <span className="pump-enable-icon">⚡</span>
        <span className="pump-enable-title">Sistem Pompa Kontrolü</span>
      </div>
      <div className="pump-enable-controls">
        <div className="pump-enable-switch-container">
          <label className="pump-enable-label">Pompa Durumu</label>
          <div
            className={`pump-enable-switch ${data.systemEnable ? 'enabled' : 'disabled'}`}
            onClick={onSystemEnableToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSystemEnableToggle?.();
              }
            }}
          >
            <div className="pump-enable-slider" />
          </div>
          <div
            className="pump-status-text"
            style={{ color: data.systemEnable ? '#22c55e' : '#ef4444' }}
          >
            {data.systemEnable ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SystemOverviewPanel: React.FC<SystemOverviewPanelProps> = ({
  alarms = [],
  onSystemEnableToggle
}) => {
  const system = useOpcStore((state) => state.system);
  const [showSetpointsModal, setShowSetpointsModal] = useState(false);

  const systemData = useMemo(() => buildSystemData(system), [system]);

  const getSystemStatusInfo = (status: number): StatusInfo => {
    switch (status) {
      case 0: return { text: 'Starting', class: 'status-test', color: '#8b5cf6', icon: '🔄' };
      case 1: return { text: 'Auto Ready', class: 'status-ready', color: '#3b82f6', icon: '🤖' };
      case 2: return { text: 'Running', class: 'status-active', color: '#22c55e', icon: '▶️' };
      case 3: return { text: 'Error', class: 'status-error', color: '#ef4444', icon: '❌' };
      case 4: return { text: 'Auto Switching', class: 'status-warning', color: '#f59e0b', icon: '🔄' };
      case 5: return { text: 'Manual Switching', class: 'status-warning', color: '#f59e0b', icon: '🔄' };
      case 6: return { text: 'Manual Ready', class: 'status-ready', color: '#06b6d4', icon: '✋' };
      default: return { text: 'Unknown', class: 'status-ready', color: '#6b7280', icon: '❓' };
    }
  };

  const statusInfo = useMemo(() => getSystemStatusInfo(systemData.statusExecution), [systemData.statusExecution]);

  const getValueColor = (current: number, setpoint: number, tolerance: number = 0.05) => {
    if (!setpoint) {
      return '#ef4444';
    }
    const diff = Math.abs(current - setpoint) / setpoint;
    if (diff > tolerance * 2) return '#ef4444';
    if (diff > tolerance) return '#f59e0b';
    return '#22c55e';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return '#22c55e';
    if (efficiency >= 90) return '#84cc16';
    if (efficiency >= 85) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`system-overview-panel ${statusInfo.class}`}>
      <div className="system-status-strip" style={{ backgroundColor: statusInfo.color }} />

      <div className="system-header">
        <div className="system-title">
          <span className="system-icon">{statusInfo.icon}</span>
          <span className="system-text">SYSTEM OVERVIEW</span>
        </div>
        <div
          className={`system-status-badge ${statusInfo.class}`}
          style={{ backgroundColor: `${statusInfo.color}20`, borderColor: `${statusInfo.color}60` }}
        >
          <span className="status-dot" style={{ backgroundColor: statusInfo.color }} />
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      <div className="system-overview-content">
        <CompactAllDataSection
          data={systemData}
          statusInfo={statusInfo}
          getValueColor={getValueColor}
          getEfficiencyColor={getEfficiencyColor}
          onSystemEnableToggle={onSystemEnableToggle}
          onOpenSetpoints={() => setShowSetpointsModal(true)}
        />
      </div>

      {showSetpointsModal && ReactDOM.createPortal(
        <SystemSetpointsModal onClose={() => setShowSetpointsModal(false)} />,
        document.body
      )}
    </div>
  );
};

export default SystemOverviewPanel;
