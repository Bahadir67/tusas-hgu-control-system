import React, { useState, useEffect, useRef } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { influxApi } from '../../services/api';
import type { InfluxMotorSeriesPoint, InfluxSystemTrendPoint } from '../../services/api';
import InfluxDBConnectionPanel, { ConnectionStatus } from './InfluxDBConnectionPanel';
import MotorTimeSeriesChart from './MotorTimeSeriesChart';
import SystemMetricsChart from './SystemMetricsChart';
import DataExportPanel from './DataExportPanel';
import QueryManagementPanel from './QueryManagementPanel';
import './InfluxDBMonitor.css';
type InfluxDBData = InfluxMotorSeriesPoint;
type SystemTrend = InfluxSystemTrendPoint;
interface InfluxConnectionInfo {
  bucket?: string;
  organization?: string;
  url?: string;
}
const InfluxDBMonitor: React.FC = () => {
  const { motors, lastUpdate } = useOpcStore();
  const [influxConnection, setInfluxConnection] = useState<ConnectionStatus>({
    status: 'connecting',
    lastQuery: new Date(),
    recordCount: 0,
    dataRate: '0 Hz'
  });
  const [connectionInfo, setConnectionInfo] = useState<InfluxConnectionInfo>({});
  const configLoadedRef = useRef(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedMotors, setSelectedMotors] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [selectedMetrics, setSelectedMetrics] = useState(['pressure', 'flow', 'temperature']);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  // InfluxDB data retrieved from API
  const [motorTimeSeriesData, setMotorTimeSeriesData] = useState<InfluxDBData[]>([]);
  const [systemTrendsData, setSystemTrendsData] = useState<SystemTrend[]>([]);
  const [queryHistory, setQueryHistory] = useState([
    { id: 1, query: 'SELECT pressure, flow FROM motor_data WHERE time > now() - 1h', timestamp: new Date(), duration: '0.34s', results: 1205 },
    { id: 2, query: 'SELECT mean(temperature) FROM motor_data WHERE time > now() - 24h GROUP BY time(1h)', timestamp: new Date(Date.now() - 300000), duration: '0.89s', results: 24 },
    { id: 3, query: 'SELECT * FROM system_metrics WHERE time > now() - 6h', timestamp: new Date(Date.now() - 600000), duration: '1.23s', results: 2160 }
  ]);  // Load real InfluxDB connection status and data
  useEffect(() => {
    let isMounted = true;
    const loadInfluxDBData = async () => {
      if (!selectedMotors.length || !selectedMetrics.length) {
        if (!isMounted) {
          return;
        }
        setMotorTimeSeriesData([]);
        setSystemTrendsData([]);
        return;
      }
      try {
        setInfluxConnection(prev => ({
          ...prev,
          status: prev.status === 'connected' ? 'connected' : 'connecting'
        }));
        const health = await influxApi.getHealth();
        if (!isMounted) return;
        const isConnected = Boolean(health?.isConnected ?? health?.IsConnected);
        setInfluxConnection(prev => ({
          ...prev,
          status: isConnected ? 'connected' : 'disconnected',
          lastQuery: new Date()
        }));
        if (!isConnected) {
          setMotorTimeSeriesData([]);
          setSystemTrendsData([]);
          return;
        }
        const statsPromise = influxApi.getStats().catch(error => {
          console.error('Error loading InfluxDB stats:', error);
          return null;
        });
        const seriesPromise = influxApi
          .getMotorSeries({
            motors: selectedMotors,
            metrics: selectedMetrics,
            range: timeRange,
            maxPoints: 720
          })
          .catch(error => {
            console.error('Error loading motor series from InfluxDB:', error);
            return null;
          });
        const configPromise = configLoadedRef.current
          ? Promise.resolve(null)
          : influxApi.getConfig().catch(error => {
              console.error('Error loading InfluxDB configuration:', error);
              return null;
            });
        const [stats, series, config] = await Promise.all([
          statsPromise,
          seriesPromise,
          configPromise
        ]);
        if (!isMounted) return;
        if (config) {
          configLoadedRef.current = true;
          setConnectionInfo(prev => ({
            ...prev,
            bucket: config.bucketName ?? config.BucketName ?? prev.bucket,
            organization: config.organization ?? config.Organization ?? prev.organization,
            url: config.url ?? config.Url ?? prev.url
          }));
        }
        if (stats) {
          setInfluxConnection(prev => {
            const last24Hours =
              stats.dataPoints?.last24Hours ?? stats.DataPoints?.Last24Hours ?? prev.recordCount;
            const estimatedPerMinute =
              stats.dataPoints?.estimatedPerMinute ?? stats.DataPoints?.EstimatedPerMinute ?? 0;
            return {
              ...prev,
              recordCount: last24Hours,
              dataRate: `${Math.round(estimatedPerMinute * 60)} Hz`,
              lastQuery: new Date()
            };
          });
        }
        const seriesSuccess = Boolean(series?.success ?? series?.Success);
        if (series && seriesSuccess) {
          const motorSeries = [...(series.motorSeries ?? series.MotorSeries ?? [])].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const systemSeries = [...(series.systemSeries ?? series.SystemSeries ?? [])].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setMotorTimeSeriesData(motorSeries);
          setSystemTrendsData(systemSeries);
          setInfluxConnection(prev => ({
            ...prev,
            recordCount: motorSeries.length,
            lastQuery: new Date()
          }));
        } else if (series === null || !seriesSuccess) {
          setMotorTimeSeriesData([]);
          setSystemTrendsData([]);
        }
      } catch (error) {
        console.error('Error loading InfluxDB data:', error);
        if (!isMounted) return;
        setInfluxConnection(prev => ({
          ...prev,
          status: 'error',
          lastQuery: new Date()
        }));
      }
    };
    loadInfluxDBData();
    if (autoRefresh) {
      const interval = setInterval(loadInfluxDBData, refreshInterval * 1000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [selectedMotors, selectedMetrics, timeRange, autoRefresh, refreshInterval]);
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    // In real implementation, this would trigger new InfluxDB query
  };
  const handleMotorSelection = (motorId: number, selected: boolean) => {
    if (selected) {
      setSelectedMotors(prev => [...prev, motorId]);
    } else {
      setSelectedMotors(prev => prev.filter(id => id !== motorId));
    }
  };
  const handleMetricSelection = (metric: string, selected: boolean) => {
    if (selected) {
      setSelectedMetrics(prev => [...prev, metric]);
    } else {
      setSelectedMetrics(prev => prev.filter(m => m !== metric));
    }
  };
  const handleExecuteQuery = async (query: string) => {
    const startTime = Date.now();
    try {
      // Execute real InfluxDB query
      const result = await influxApi.executeQuery(query);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const success = Boolean(result?.success ?? result?.Success);
      const payload = result?.result ?? result?.Result;
      const newQuery = {
        id: queryHistory.length + 1,
        query,
        timestamp: new Date(),
        duration: `${duration}s`,
        results: success ? (payload?.length || 0) : 0
      };
      setQueryHistory(prev => [newQuery, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Query execution error:', error);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const newQuery = {
        id: queryHistory.length + 1,
        query,
        timestamp: new Date(),
        duration: `${duration}s`,
        results: 0
      };
      setQueryHistory(prev => [newQuery, ...prev.slice(0, 9)]);
    }
  };
  return (
    <div className="influxdb-monitor">
      {/* Header Section */}
      <div className="influxdb-header">
        <div className="header-title-section">
          <div className="monitor-title">
            <span className="monitor-icon">📊</span>
            <span className="monitor-text">InfluxDB Time-Series Monitor</span>
          </div>
          <div className="monitor-subtitle">Real-time Database Analytics • Bucket: hgu_data • Org: tusas</div>
        </div>
        <div className="header-controls">
          <div className="time-range-selector">
            <label className="control-label">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="industrial-select"
            >
              <option value="15m">Last 15 Minutes</option>
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="auto-refresh-control">
            <label className="control-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="industrial-checkbox"
              />
              Auto Refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="industrial-select-small"
              >
                <option value={1}>1s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            )}
          </div>
        </div>
      </div>
      {/* Status Bar */}
      <div className="influxdb-status-bar">
        <InfluxDBConnectionPanel
          connectionStatus={influxConnection}
          onReconnect={() => {
            setInfluxConnection(prev => ({
              ...prev,
              status: 'connecting',
              lastQuery: new Date()
            }));
            setTimeout(() => {
              setInfluxConnection(prev => ({
                ...prev,
                status: 'connected'
              }));
            }, 2000);
          }}
          bucketName={connectionInfo.bucket}
          organization={connectionInfo.organization}
          url={connectionInfo.url}
        />
        <div className="data-statistics">
          <div className="stat-item">
            <span className="stat-label">Data Points:</span>
            <span className="stat-value">{motorTimeSeriesData.length.toLocaleString()}</span>
          </div>
          <div className="stat-separator">|</div>
          <div className="stat-item">
            <span className="stat-label">Update Rate:</span>
            <span className="stat-value">{influxConnection.dataRate}</span>
          </div>
          <div className="stat-separator">|</div>
          <div className="stat-item">
            <span className="stat-label">Last Update:</span>
            <span className="stat-value">{lastUpdate?.toLocaleTimeString() || 'Never'}</span>
          </div>
        </div>
      </div>
      {/* Main Content Grid */}
      <div className="influxdb-content-grid">
        {/* Left Panel - Charts */}
        <div className="charts-panel">
          {/* Motor Selection */}
          <div className="motor-selector">
            <h3 className="panel-title">Motor Selection</h3>
            <div className="motor-checkboxes">
              {[1, 2, 3, 4, 5, 6, 7].map(motorId => (
                <label key={motorId} className="motor-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMotors.includes(motorId)}
                    onChange={(e) => handleMotorSelection(motorId, e.target.checked)}
                    className="industrial-checkbox"
                  />
                  <span className="checkbox-label">Motor {motorId}</span>
                  <span className={`status-dot status-${motors[motorId]?.status === 1 ? 'running' : 'ready'}`} />
                </label>
              ))}
            </div>
          </div>
          {/* Metric Selection */}
          <div className="metric-selector">
            <h3 className="panel-title">Metrics</h3>
            <div className="metric-checkboxes">
              {[
                { key: 'pressure', label: 'Pressure (bar)', color: '#00ff88' },
                { key: 'flow', label: 'Flow (L/min)', color: '#0099ff' },
                { key: 'temperature', label: 'Temperature (°C)', color: '#ff6b35' },
                { key: 'rpm', label: 'RPM', color: '#ffa500' },
                { key: 'current', label: 'Current (A)', color: '#dda0dd' }
              ].map(metric => (
                <label key={metric.key} className="metric-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={(e) => handleMetricSelection(metric.key, e.target.checked)}
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
          {/* Motor Time Series Charts */}
          <div className="motor-charts-container">
            <MotorTimeSeriesChart
              data={motorTimeSeriesData}
              selectedMotors={selectedMotors}
              selectedMetrics={selectedMetrics}
              timeRange={timeRange}
            />
          </div>
          {/* System Metrics Chart */}
          <div className="system-charts-container">
            <SystemMetricsChart
              data={systemTrendsData}
              timeRange={timeRange}
            />
          </div>
        </div>
        {/* Right Panel - Query Management & Export */}
        <div className="controls-panel">
          {/* Query Management */}
          <QueryManagementPanel
            queryHistory={queryHistory}
            onExecuteQuery={handleExecuteQuery}
          />
          {/* Data Export */}
          <DataExportPanel
            selectedMotors={selectedMotors}
            selectedMetrics={selectedMetrics}
            timeRange={timeRange}
            dataCount={motorTimeSeriesData.length}
          />
          {/* System Performance Metrics */}
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
          {/* Alert Configuration */}
          <div className="alert-config">
            <h3 className="panel-title">Alert Configuration</h3>
            <div className="alert-items">
              <div className="alert-item">
                <span className="alert-name">High Pressure</span>
                <span className="alert-threshold">&gt; 300 bar</span>
                <span className={`alert-status alert-active`}>Active</span>
              </div>
              <div className="alert-item">
                <span className="alert-name">Low Flow Rate</span>
                <span className="alert-threshold">&lt; 10 L/min</span>
                <span className={`alert-status alert-active`}>Active</span>
              </div>
              <div className="alert-item">
                <span className="alert-name">High Temperature</span>
                <span className="alert-threshold">&gt; 80°C</span>
                <span className={`alert-status alert-inactive`}>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InfluxDBMonitor;
