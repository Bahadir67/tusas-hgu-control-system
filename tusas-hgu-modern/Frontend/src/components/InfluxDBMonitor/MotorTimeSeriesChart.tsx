import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface InfluxDBData {
  timestamp: string;
  motorId: number;
  pressure?: number | null;
  flow?: number | null;
  temperature?: number | null;
  rpm?: number | null;
  current?: number | null;
}

type ChartVariant = 'standard' | 'compact';

interface MotorTimeSeriesChartProps {
  data: InfluxDBData[];
  selectedMotors: number[];
  selectedMetrics: string[];
  timeRange: string;
  variant?: ChartVariant;
  isFullscreen?: boolean;
  onOpenFullscreen?: () => void;
}

const MotorTimeSeriesChart: React.FC<MotorTimeSeriesChartProps> = ({
  data,
  selectedMotors,
  selectedMetrics,
  timeRange,
  variant = 'standard',
  isFullscreen = false,
  onOpenFullscreen
}) => {
  const metricConfigs = {
    pressure: { color: '#00ff88', unit: 'bar', label: 'Pressure' },
    flow: { color: '#0099ff', unit: 'L/min', label: 'Flow' },
    temperature: { color: '#ff6b35', unit: '°C', label: 'Temperature' },
    rpm: { color: '#ffa500', unit: 'RPM', label: 'RPM' },
    current: { color: '#dda0dd', unit: 'A', label: 'Current' }
  };

  // Process data for chart display
  const chartData = useMemo(() => {
    if (!data.length) return [];

    // Group data by timestamp
    const groupedData = data.reduce((acc, item) => {
      const timeKey = new Date(item.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      if (!acc[timeKey]) {
        acc[timeKey] = { timestamp: timeKey, time: new Date(item.timestamp).getTime() };
      }

      // Add motor data for selected metrics
      selectedMetrics.forEach(metric => {
        if (selectedMotors.includes(item.motorId)) {
          const key = `motor${item.motorId}_${metric}`;
          const rawValue = item[metric as keyof InfluxDBData];

          if (rawValue !== undefined && rawValue !== null) {
            const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
            if (!Number.isNaN(numericValue)) {
              acc[timeKey][key] = numericValue;
            }
          }
        }
      });

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by time
    return Object.values(groupedData)
      .sort((a: any, b: any) => a.time - b.time)
      .slice(-60); // Show last 60 data points for performance
  }, [data, selectedMotors, selectedMetrics]);

  // Generate lines for each motor-metric combination
  const renderLines = () => {
    const lines: React.ReactElement[] = [];

    selectedMotors.forEach(motorId => {
      selectedMetrics.forEach(metric => {
        const config = metricConfigs[metric as keyof typeof metricConfigs];
        const key = `motor${motorId}_${metric}`;

        lines.push(
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={config.color}
            strokeWidth={2}
            dot={false}
            name={`Motor ${motorId} ${config.label}`}
            connectNulls={false}
            strokeDasharray={motorId === 7 ? '5,5' : undefined} // Dashed line for Motor 7 (softstarter)
          />
        );
      });
    });

    return lines;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-time">{label}</span>
          </div>
          <div className="tooltip-content">
            {payload.map((entry: any, index: number) => {
              const [motorPart, metric] = entry.dataKey.split('_');
              const motorId = motorPart.replace('motor', '');
              const config = metricConfigs[metric as keyof typeof metricConfigs];
              const rawValue = entry.value;
              const numericValue = typeof rawValue === 'number'
                ? rawValue
                : rawValue !== undefined && rawValue !== null
                  ? Number(rawValue)
                  : null;
              const formattedValue = numericValue === null || Number.isNaN(numericValue)
                ? '--'
                : `${numericValue.toFixed(1)} ${config.unit}`;

              return (
                <div key={index} className="tooltip-item">
                  <span
                    className="tooltip-color"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="tooltip-label">
                    Motor {motorId} {config.label}:
                  </span>
                  <span className="tooltip-value">
                    {formattedValue}
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

  const chartHeight = isFullscreen ? 520 : variant === 'compact' ? 220 : 400;
  const showLegend = variant !== 'compact' || isFullscreen;
  const showInfo = variant !== 'compact' || isFullscreen;

  return (
    <div
      className={`motor-timeseries-chart ${variant === 'compact' ? 'chart-compact' : ''} ${isFullscreen ? 'chart-fullscreen' : ''}`}
    >
      <div className="chart-header">
        <h3 className="chart-title">
          <span className="chart-icon">📈</span>
          Motor Time Series Data
        </h3>
        {showInfo && (
          <div className="chart-info">
            <span className="chart-range">Range: {timeRange}</span>
            <span className="chart-separator">•</span>
            <span className="chart-points">{chartData.length} points</span>
            <span className="chart-separator">•</span>
            <span className="chart-motors">
              {selectedMotors.length} motor{selectedMotors.length !== 1 ? 's' : ''}
            </span>
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
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(96, 160, 255, 0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                stroke="var(--color-text-secondary)"
                fontSize={11}
                fontFamily="var(--font-mono)"
              />
              <YAxis
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

              {renderLines()}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-no-data">
          <div className="no-data-icon">📊</div>
          <div className="no-data-text">No data available</div>
          <div className="no-data-subtitle">
            Select motors and metrics to view time series data
          </div>
        </div>
      )}

      {showLegend && (
        <div className="chart-legend-custom">
          <div className="legend-title">Active Metrics:</div>
          <div className="legend-items">
            {selectedMetrics.map(metric => {
              const config = metricConfigs[metric as keyof typeof metricConfigs];
              return (
                <div key={metric} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="legend-label">{config.label}</span>
                  <span className="legend-unit">({config.unit})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .motor-timeseries-chart {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .motor-timeseries-chart.chart-compact .chart-container {
          padding: var(--spacing-sm);
        }

        .motor-timeseries-chart.chart-compact .chart-title {
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
          height: 400px;
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
        }

        .motor-timeseries-chart.chart-compact .chart-no-data {
          height: 220px;
        }

        .motor-timeseries-chart.chart-fullscreen .chart-no-data {
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

        .chart-tooltip {
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
          min-width: 100px;
        }

        .tooltip-value {
          color: var(--color-text-primary);
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .chart-legend-custom {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-sm);
          background: rgba(15, 20, 25, 0.4);
          border: 1px solid rgba(96, 160, 255, 0.1);
          border-radius: var(--radius-sm);
        }

        .legend-title {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .legend-items {
          display: flex;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 11px;
          color: var(--color-text-secondary);
        }

        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .legend-label {
          font-weight: 500;
        }

        .legend-unit {
          opacity: 0.7;
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

          .chart-legend-custom {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }

          .legend-items {
            gap: var(--spacing-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default MotorTimeSeriesChart;
