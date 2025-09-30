import React from 'react';
import type { InfluxMotorSeriesPoint, InfluxSystemTrendPoint } from '../../services/api';
import MotorTimeSeriesChart from './MotorTimeSeriesChart';
import SystemMetricsChart from './SystemMetricsChart';

interface ChartsTabProps {
  motors: Record<number, { status?: number } | undefined>;
  selectedMotors: number[];
  onMotorSelection: (motorId: number, selected: boolean) => void;
  selectedMetrics: string[];
  onMetricSelection: (metric: string, selected: boolean) => void;
  motorTimeSeriesData: InfluxMotorSeriesPoint[];
  systemTrendsData: InfluxSystemTrendPoint[];
  timeRange: string;
  onOpenMotorFullscreen: () => void;
  onOpenSystemFullscreen: () => void;
}

const metricDefinitions = [
  { key: 'pressure', label: 'Pressure (bar)', color: '#00ff88' },
  { key: 'flow', label: 'Flow (L/min)', color: '#0099ff' },
  { key: 'temperature', label: 'Temperature (°C)', color: '#ff6b35' },
  { key: 'rpm', label: 'RPM', color: '#ffa500' },
  { key: 'current', label: 'Current (A)', color: '#dda0dd' }
];

const ChartsTab: React.FC<ChartsTabProps> = ({
  motors,
  selectedMotors,
  onMotorSelection,
  selectedMetrics,
  onMetricSelection,
  motorTimeSeriesData,
  systemTrendsData,
  timeRange,
  onOpenMotorFullscreen,
  onOpenSystemFullscreen
}) => {
  return (
    <div className="influx-charts-tab">
      <div className="charts-tab-grid">
        <div className="selection-panel">
          <div className="motor-selector">
            <h3 className="panel-title">Motor Selection</h3>
            <div className="motor-checkboxes">
              {[1, 2, 3, 4, 5, 6, 7].map(motorId => (
                <label key={motorId} className="motor-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMotors.includes(motorId)}
                    onChange={(e) => onMotorSelection(motorId, e.target.checked)}
                    className="industrial-checkbox"
                  />
                  <span className="checkbox-label">Motor {motorId}</span>
                  <span className={`status-dot status-${motors[motorId]?.status === 1 ? 'running' : 'ready'}`} />
                </label>
              ))}
            </div>
          </div>

          <div className="metric-selector">
            <h3 className="panel-title">Metrics</h3>
            <div className="metric-checkboxes">
              {metricDefinitions.map(metric => (
                <label key={metric.key} className="metric-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={(e) => onMetricSelection(metric.key, e.target.checked)}
                    className="industrial-checkbox"
                  />
                  <span className="checkbox-label">{metric.label}</span>
                  <span
                    className="metric-color-indicator"
                    style={{ backgroundColor: metric.color }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="charts-panel">
          <div className="motor-charts-container">
            <MotorTimeSeriesChart
              data={motorTimeSeriesData}
              selectedMotors={selectedMotors}
              selectedMetrics={selectedMetrics}
              timeRange={timeRange}
              onOpenFullscreen={onOpenMotorFullscreen}
            />
          </div>
          <div className="system-charts-container">
            <SystemMetricsChart
              data={systemTrendsData}
              timeRange={timeRange}
              onOpenFullscreen={onOpenSystemFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsTab;
