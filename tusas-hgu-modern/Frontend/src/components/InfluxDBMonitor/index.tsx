import React, { useState, useEffect, useRef } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { influxApi } from '../../services/api';
import type { InfluxMotorSeriesPoint, InfluxSystemTrendPoint } from '../../services/api';
import InfluxDBConnectionPanel, { ConnectionStatus } from './InfluxDBConnectionPanel';
import MotorTimeSeriesChart from './MotorTimeSeriesChart';
import SystemMetricsChart from './SystemMetricsChart';
import SummaryTab from './SummaryTab';
import ChartsTab from './ChartsTab';
import QueriesTab from './QueriesTab';
import type { QueryHistoryItem } from './QueryManagementPanel';
import './InfluxDBMonitor.css';

type InfluxDBData = InfluxMotorSeriesPoint;
type SystemTrend = InfluxSystemTrendPoint;
export type InfluxMonitorTab = 'summary' | 'charts' | 'queries';

interface InfluxConnectionInfo {
  bucket?: string;
  organization?: string;
  url?: string;
}

interface InfluxDBMonitorProps {
  activeTab?: InfluxMonitorTab;
  onTabChange?: (tab: InfluxMonitorTab) => void;
}

const InfluxDBMonitor: React.FC<InfluxDBMonitorProps> = ({ activeTab, onTabChange }) => {
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
  const [motorTimeSeriesData, setMotorTimeSeriesData] = useState<InfluxDBData[]>([]);
  const [systemTrendsData, setSystemTrendsData] = useState<SystemTrend[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([
    { id: 1, query: 'SELECT pressure, flow FROM motor_data WHERE time > now() - 1h', timestamp: new Date(), duration: '0.34s', results: 1205 },
    { id: 2, query: 'SELECT mean(temperature) FROM motor_data WHERE time > now() - 24h GROUP BY time(1h)', timestamp: new Date(Date.now() - 300000), duration: '0.89s', results: 24 },
    { id: 3, query: 'SELECT * FROM system_metrics WHERE time > now() - 6h', timestamp: new Date(Date.now() - 600000), duration: '1.23s', results: 2160 }
  ]);
  const [fullscreenChart, setFullscreenChart] = useState<null | 'motor' | 'system'>(null);
  const [internalTab, setInternalTab] = useState<InfluxMonitorTab>('summary');
  const isControlled = activeTab !== undefined;
  const currentTab = isControlled ? activeTab! : internalTab;

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

  const changeTab = (tab: InfluxMonitorTab) => {
    if (!isControlled) {
      setInternalTab(tab);
    }
    onTabChange?.(tab);
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
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
      const result = await influxApi.executeQuery(query);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const success = Boolean(result?.success ?? result?.Success);
      const payload = result?.result ?? result?.Result;
      const newQuery: QueryHistoryItem = {
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
      const newQuery: QueryHistoryItem = {
        id: queryHistory.length + 1,
        query,
        timestamp: new Date(),
        duration: `${duration}s`,
        results: 0
      };
      setQueryHistory(prev => [newQuery, ...prev.slice(0, 9)]);
    }
  };

  const tabDefinitions: Array<{ id: InfluxMonitorTab; label: string; description: string }> = [
    { id: 'summary', label: 'Özet', description: 'Bağlantı özeti ve kompakt grafikler' },
    { id: 'charts', label: 'Grafikler', description: 'Detaylı zaman serisi görselleştirmeleri' },
    { id: 'queries', label: 'Sorgular', description: 'Sorgu yönetimi ve veri dışa aktarma' }
  ];

  return (
    <div className="influxdb-monitor">
      <div className="influxdb-header">
        <div className="header-title-section">
          <div className="monitor-title">
            <span className="monitor-icon">📊</span>
            <span className="monitor-text">InfluxDB Time-Series Monitor</span>
          </div>
          <div className="monitor-subtitle">
            Real-time Database Analytics • Bucket: {connectionInfo.bucket ?? '---'} • Org: {connectionInfo.organization ?? '---'}
          </div>
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
            <span className="stat-label">Last OPC Update:</span>
            <span className="stat-value">{lastUpdate?.toLocaleTimeString() || 'Never'}</span>
          </div>
        </div>
      </div>

      <div className="influxdb-tab-container">
        <div className="influxdb-tab-controls">
          {tabDefinitions.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`influxdb-tab-button ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => changeTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-description">{tab.description}</span>
            </button>
          ))}
        </div>

        <div className="influxdb-tab-content">
          {currentTab === 'summary' && (
            <SummaryTab
              connectionStatus={influxConnection}
              lastUpdate={lastUpdate ?? null}
              motorTimeSeriesData={motorTimeSeriesData}
              systemTrendsData={systemTrendsData}
              selectedMotors={selectedMotors}
              selectedMetrics={selectedMetrics}
              timeRange={timeRange}
            />
          )}

          {currentTab === 'charts' && (
            <ChartsTab
              motors={motors}
              selectedMotors={selectedMotors}
              onMotorSelection={handleMotorSelection}
              selectedMetrics={selectedMetrics}
              onMetricSelection={handleMetricSelection}
              motorTimeSeriesData={motorTimeSeriesData}
              systemTrendsData={systemTrendsData}
              timeRange={timeRange}
              onOpenMotorFullscreen={() => setFullscreenChart('motor')}
              onOpenSystemFullscreen={() => setFullscreenChart('system')}
            />
          )}

          {currentTab === 'queries' && (
            <QueriesTab
              queryHistory={queryHistory}
              onExecuteQuery={handleExecuteQuery}
              selectedMotors={selectedMotors}
              selectedMetrics={selectedMetrics}
              timeRange={timeRange}
              dataCount={motorTimeSeriesData.length}
            />
          )}
        </div>
      </div>

      {fullscreenChart && (
        <div className="chart-fullscreen-modal">
          <div className="chart-fullscreen-backdrop" onClick={() => setFullscreenChart(null)} />
          <div className="chart-fullscreen-content">
            <button className="chart-fullscreen-close" type="button" onClick={() => setFullscreenChart(null)}>
              ✕
            </button>
            {fullscreenChart === 'motor' ? (
              <MotorTimeSeriesChart
                data={motorTimeSeriesData}
                selectedMotors={selectedMotors}
                selectedMetrics={selectedMetrics}
                timeRange={timeRange}
                isFullscreen
              />
            ) : (
              <SystemMetricsChart
                data={systemTrendsData}
                timeRange={timeRange}
                isFullscreen
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluxDBMonitor;
