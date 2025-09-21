import React, { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';

interface SystemTrend {
  timestamp: string;
  totalFlow?: number | null;
  totalPressure?: number | null;
  activePumps?: number | null;
  efficiency?: number | null;
  tankLevel?: number | null;
  oilTemperature?: number | null;
}

interface SystemMetricsChartProps {
  data: SystemTrend[];
  timeRange: string;
}

const SystemMetricsChart: React.FC<SystemMetricsChartProps> = ({
  data,
  timeRange
}) => {
  // Process data for chart display
  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data.map(item => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    })).slice(-60); // Show last 60 data points for performance
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="system-chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-time">{label}</span>
          </div>
          <div className="tooltip-content">
            {payload.map((entry: any, index: number) => {
              const formatValue = (value: number | null, key: string) => {
                if (value === null || Number.isNaN(value)) {
                  return '--';
                }

                switch (key) {
                  case 'totalFlow':
                    return `${value.toFixed(1)} L/min`;
                  case 'totalPressure':
                    return `${value.toFixed(1)} bar`;
                  case 'activePumps':
                    return `${value.toFixed(0)}`;
                  case 'efficiency':
                    return `${value.toFixed(1)}%`;
                  case 'tankLevel':
                    return `${value.toFixed(1)}%`;
                  case 'oilTemperature':
                    return `${value.toFixed(1)}°C`;
                  default:
                    return value.toFixed(1);
                }
              };

              const getLabel = (key: string) => {
                switch (key) {
                  case 'totalFlow':
                    return 'Total Flow';
                  case 'totalPressure':
                    return 'Total Pressure';
                  case 'activePumps':
                    return 'Active Pumps';
                  case 'efficiency':
                    return 'System Efficiency';
                  case 'tankLevel':
                    return 'Tank Level';
                  case 'oilTemperature':
                    return 'Oil Temperature';
                  default:
                    return key;
                }
              };

              const rawValue = entry.value;
              const numericValue = typeof rawValue === 'number'
                ? rawValue
                : rawValue !== undefined && rawValue !== null && rawValue !== ''
                  ? Number(rawValue)
                  : null;

              return (
                <div key={index} className="tooltip-item">
                  <span
                    className="tooltip-color"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="tooltip-label">
                    {getLabel(entry.dataKey)}:
                  </span>
                  <span className="tooltip-value">
                    {formatValue(numericValue, entry.dataKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxisLabel = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  return (
    <div className="system-metrics-chart">
      <div className="chart-header">
        <h3 className="chart-title">
          <span className="chart-icon">🏭</span>
          System Performance Metrics
        </h3>
        <div className="chart-info">
          <span className="chart-range">Range: {timeRange}</span>
          <span className="chart-separator">•</span>
          <span className="chart-points">{chartData.length} points</span>
          <span className="chart-separator">•</span>
          <span className="chart-update">Real-time</span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(96, 160, 255, 0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="var(--color-text-secondary)"
                fontSize={11}
                fontFamily="var(--font-mono)"
              />
              <YAxis
                yAxisId="left"
                stroke="var(--color-text-secondary)"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={formatYAxisLabel}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--color-text-secondary)"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={formatYAxisLabel}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              />

              {/* Primary metrics as areas */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalFlow"
                fill="rgba(0, 255, 136, 0.2)"
                stroke="#00ff88"
                strokeWidth={2}
                name="Total Flow (L/min)"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalPressure"
                fill="rgba(0, 153, 255, 0.2)"
                stroke="#0099ff"
                strokeWidth={2}
                name="Total Pressure (bar)"
              />

              {/* Secondary metrics as lines */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                stroke="#ffa500"
                strokeWidth={2}
                dot={false}
                name="System Efficiency (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tankLevel"
                stroke="#dda0dd"
                strokeWidth={2}
                dot={false}
                name="Tank Level (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="oilTemperature"
                stroke="#ff6b35"
                strokeWidth={2}
                dot={false}
                name="Oil Temperature (°C)"
              />

              {/* Active pumps as bars */}
              <Bar
                yAxisId="right"
                dataKey="activePumps"
                fill="rgba(30, 144, 255, 0.6)"
                name="Active Pumps"
                maxBarSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-no-data">
          <div className="no-data-icon">🏭</div>
          <div className="no-data-text">No system data available</div>
          <div className="no-data-subtitle">
            Waiting for system metrics from InfluxDB
          </div>
        </div>
      )}

      {/* Current Values Summary */}
      <div className="current-values-summary">
        <div className="summary-title">Current System Status:</div>
        <div className="summary-grid">
          {chartData.length > 0 && (
            <>
              <div className="summary-item">
                <span className="summary-label">Flow Rate:</span>
                <span className="summary-value flow">
                  {chartData[chartData.length - 1]?.totalFlow?.toFixed(1) || 0} L/min
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Pressure:</span>
                <span className="summary-value pressure">
                  {chartData[chartData.length - 1]?.totalPressure?.toFixed(1) || 0} bar
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Efficiency:</span>
                <span className="summary-value efficiency">
                  {chartData[chartData.length - 1]?.efficiency?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Tank Level:</span>
                <span className="summary-value tank">
                  {chartData[chartData.length - 1]?.tankLevel?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Oil Temp:</span>
                <span className="summary-value temperature">
                  {chartData[chartData.length - 1]?.oilTemperature?.toFixed(1) || 0}°C
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Active Pumps:</span>
                <span className="summary-value pumps">
                  {chartData[chartData.length - 1]?.activePumps || 0}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .system-metrics-chart {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .chart-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .chart-icon {
          font-size: 18px;
          filter: drop-shadow(0 0 4px rgba(255, 165, 0, 0.5));
        }

        .chart-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 11px;
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
        }

        .chart-separator {
          color: var(--color-border);
        }

        .chart-container {
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
        }

        .chart-no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
        }

        .no-data-icon {
          font-size: 48px;
          opacity: 0.5;
          margin-bottom: var(--spacing-md);
        }

        .no-data-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .no-data-subtitle {
          font-size: 14px;
          opacity: 0.7;
        }

        .system-chart-tooltip {
          background: rgba(22, 32, 38, 0.95);
          border: 1px solid rgba(96, 160, 255, 0.3);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
        }

        .tooltip-header {
          margin-bottom: var(--spacing-xs);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid rgba(96, 160, 255, 0.2);
        }

        .tooltip-time {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
        }

        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tooltip-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 11px;
        }

        .tooltip-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .tooltip-label {
          color: var(--color-text-secondary);
          min-width: 120px;
        }

        .tooltip-value {
          color: var(--color-text-primary);
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .current-values-summary {
          background: rgba(15, 20, 25, 0.4);
          border: 1px solid rgba(96, 160, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: var(--spacing-md);
        }

        .summary-title {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-sm);
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-xs);
          background: rgba(22, 32, 38, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.1);
          border-radius: var(--radius-sm);
        }

        .summary-label {
          font-size: 11px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .summary-value {
          font-size: 12px;
          font-weight: bold;
          font-family: var(--font-mono);
          text-shadow: 0 0 4px currentColor;
        }

        .summary-value.flow {
          color: #00ff88;
        }

        .summary-value.pressure {
          color: #0099ff;
        }

        .summary-value.efficiency {
          color: #ffa500;
        }

        .summary-value.tank {
          color: #dda0dd;
        }

        .summary-value.temperature {
          color: #ff6b35;
        }

        .summary-value.pumps {
          color: #1e90ff;
        }

        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .chart-info {
            flex-wrap: wrap;
          }

          .summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-xs);
          }

          .summary-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
};

export default SystemMetricsChart;




