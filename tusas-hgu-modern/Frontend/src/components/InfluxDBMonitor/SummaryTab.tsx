import React from 'react';
import type { InfluxMotorSeriesPoint, InfluxSystemTrendPoint } from '../../services/api';
import type { ConnectionStatus } from './InfluxDBConnectionPanel';
import MotorTimeSeriesChart from './MotorTimeSeriesChart';
import SystemMetricsChart from './SystemMetricsChart';

interface SummaryTabProps {
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  motorTimeSeriesData: InfluxMotorSeriesPoint[];
  systemTrendsData: InfluxSystemTrendPoint[];
  selectedMotors: number[];
  selectedMetrics: string[];
  timeRange: string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  connectionStatus,
  lastUpdate,
  motorTimeSeriesData,
  systemTrendsData,
  selectedMotors,
  selectedMetrics,
  timeRange
}) => {
  const statusLabel = connectionStatus.status.toUpperCase();
  const lastQueryText = connectionStatus.lastQuery.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const opcLastUpdate = lastUpdate
    ? lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Not available';

  return (
    <div className="influx-summary-tab">
      <div className="summary-overview-grid">
        <div className={`summary-card status-${connectionStatus.status}`}>
          <span className="summary-label">Connection</span>
          <span className="summary-value">{statusLabel}</span>
          <span className="summary-subtext">Last query {lastQueryText}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Data Points</span>
          <span className="summary-value">{connectionStatus.recordCount.toLocaleString()}</span>
          <span className="summary-subtext">Range {timeRange}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Selected Motors</span>
          <span className="summary-value">{selectedMotors.length}</span>
          <span className="summary-subtext">{selectedMotors.length > 0 ? selectedMotors.join(', ') : 'None'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active Metrics</span>
          <span className="summary-value">{selectedMetrics.length}</span>
          <span className="summary-subtext">{selectedMetrics.join(', ') || 'None'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">OPC Snapshot</span>
          <span className="summary-value">{opcLastUpdate}</span>
          <span className="summary-subtext">Last OPC refresh</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Data Rate</span>
          <span className="summary-value">{connectionStatus.dataRate}</span>
          <span className="summary-subtext">Streaming estimate</span>
        </div>
      </div>

      <div className="summary-charts-row">
        <div className="summary-chart-card">
          <MotorTimeSeriesChart
            data={motorTimeSeriesData}
            selectedMotors={selectedMotors}
            selectedMetrics={selectedMetrics}
            timeRange={timeRange}
            variant="compact"
          />
        </div>
        <div className="summary-chart-card">
          <SystemMetricsChart
            data={systemTrendsData}
            timeRange={timeRange}
            variant="compact"
          />
        </div>
      </div>

      <div className="summary-bottom-grid">
        <div className="performance-metrics">
          <h3 className="panel-title">Database Performance</h3>
          <div className="performance-grid">
            <div className="perf-metric">
              <span className="perf-label">Query Rate</span>
              <span className="perf-value">15.2/min</span>
            </div>
            <div className="perf-metric">
              <span className="perf-label">Avg Response</span>
              <span className="perf-value">0.45s</span>
            </div>
            <div className="perf-metric">
              <span className="perf-label">Storage Used</span>
              <span className="perf-value">2.4 GB</span>
            </div>
            <div className="perf-metric">
              <span className="perf-label">Data Points/hr</span>
              <span className="perf-value">48.6k</span>
            </div>
          </div>
        </div>

        <div className="alert-config">
          <h3 className="panel-title">Alert Configuration</h3>
          <div className="alert-items">
            <div className="alert-item">
              <span className="alert-name">High Pressure</span>
              <span className="alert-threshold">&gt; 300 bar</span>
              <span className="alert-status alert-active">Active</span>
            </div>
            <div className="alert-item">
              <span className="alert-name">Low Flow Rate</span>
              <span className="alert-threshold">&lt; 10 L/min</span>
              <span className="alert-status alert-active">Active</span>
            </div>
            <div className="alert-item">
              <span className="alert-name">High Temperature</span>
              <span className="alert-threshold">&gt; 80°C</span>
              <span className="alert-status alert-inactive">Inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
