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

type ChartVariant = 'standard' | 'compact';

interface SystemMetricsChartProps {
  data: SystemTrend[];
  timeRange: string;
  variant?: ChartVariant;
  isFullscreen?: boolean;
  onOpenFullscreen?: () => void;
}

const SystemMetricsChart: React.FC<SystemMetricsChartProps> = ({
  data,
  timeRange,
  variant = 'standard',
  isFullscreen = false,
  onOpenFullscreen
}) => {
  // Process data for chart display
  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data
      .map(item => ({
        ...item,
        time: new Date(item.timestamp).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }))
      .slice(-60); // Show last 60 data points for performance
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

  const chartHeight = isFullscreen ? 520 : variant === 'compact' ? 240 : 350;
  const showLegend = variant !== 'compact' || isFullscreen;
  const showInfo = variant !== 'compact' || isFullscreen;

  return (
    <div
      className={`system-metrics-chart ${variant === 'compact' ? 'chart-compact' : ''} ${isFullscreen ? 'chart-fullscreen' : ''}`}
    >
      <div className="chart-header">
        <h3 className="chart-title">
          <span className="chart-icon">🏭</span>
          System Performance Metrics
        </h3>
        {showInfo && (
          <div className="chart-info">
            <span className="chart-range">Range: {timeRange}</span>
            <span className="chart-separator">•</span>
            <span className="chart-points">{chartData.length} points</span>
            <span className="chart-separator">•</span>
            <span className="chart-update">Real-time</span>
          </div>
        )}
        {onOpenFullscreen && (
          <button className="chart-action-button" type="button" onClick={onOpenFullscreen}>
            ⤢ Full Screen
          </button>
        )}
      </div>

      {chartData.length > 0 ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={chartHeight}>
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
              {showLegend && (
                <Legend
                  wrapperStyle={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              )}

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

              {/* Secondary metrics */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                stroke="#ffa500"
                strokeWidth={2}
                name="System Efficiency (%)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="oilTemperature"
                stroke="#ff6b35"
                strokeWidth={2}
                name="Oil Temperature (°C)"
                dot={false}
              />
              <Bar
                yAxisId="left"
                dataKey="activePumps"
                barSize={12}
                fill="rgba(96, 160, 255, 0.35)"
                name="Active Pumps"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tankLevel"
                stroke="#dda0dd"
                strokeWidth={2}
                name="Tank Level (%)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-no-data">
          <div className="no-data-icon">🏭</div>
          <div className="no-data-text">No system metrics available</div>
          <div className="no-data-subtitle">
            Check the time range or connection settings
          </div>
        </div>
      )}

      <style>{`
        .system-metrics-chart {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .system-metrics-chart.chart-compact .chart-container {
          padding: var(--spacing-sm);
        }

        .system-metrics-chart.chart-compact .chart-title {
          font-size: 14px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          gap: var(--spacing-md);
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
          filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.5));
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

        .chart-action-button {
          background: rgba(0, 153, 255, 0.15);
          border: 1px solid rgba(0, 153, 255, 0.45);
          color: var(--color-text-primary);
          font-size: 12px;
          font-family: var(--font-mono);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .chart-action-button:hover {
          background: rgba(0, 153, 255, 0.25);
          border-color: rgba(0, 153, 255, 0.65);
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

        .system-metrics-chart.chart-compact .chart-no-data {
          height: 240px;
        }

        .system-metrics-chart.chart-fullscreen .chart-no-data {
          height: 520px;
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

        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .chart-info {
            flex-wrap: wrap;
          }

          .chart-action-button {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default SystemMetricsChart;
