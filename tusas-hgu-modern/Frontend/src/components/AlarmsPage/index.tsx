import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOpcStore } from '../../store/opcStore';
import { alarmService, AlarmSummary, BackendAlarmEntry } from '../../services/alarmService';
import { authService } from '../../services/authService';
import './AlarmsPage.css';

type SeverityFilter = BackendAlarmEntry['severity'] | 'ALL';
type StateFilter = BackendAlarmEntry['state'] | 'ALL';

const PAGE_SIZE = 200;
const REFRESH_OPTIONS = [
  { label: '15 sn', value: 15_000 },
  { label: '30 sn', value: 30_000 },
  { label: '1 dk', value: 60_000 },
];

const severityOrder: BackendAlarmEntry['severity'][] = ['CRITICAL', 'HIGH', 'WARNING', 'INFO'];

const severityLabels: Record<BackendAlarmEntry['severity'], string> = {
  CRITICAL: 'Kritik',
  HIGH: 'Yuksek',
  WARNING: 'Uyari',
  INFO: 'Bilgi',
};

const stateLabels: Record<BackendAlarmEntry['state'], string> = {
  ACTIVE: 'Aktif',
  ACKNOWLEDGED: 'Onaylandi',
  RESOLVED: 'Giderildi',
  SHELVED: 'Askida',
  SUPPRESSED: 'Bastirildi',
};

const getSeverityClass = (severity: BackendAlarmEntry['severity']) =>
  `severity-pill severity-${severity.toLowerCase()}`;

const formatAbsoluteTime = (iso?: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) return '-';
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '-';

  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (Math.abs(diffSeconds) < 10) return 'simdi';
  if (Math.abs(diffSeconds) < 60) {
    const value = Math.abs(diffSeconds);
    return `${value} sn once`;
  }

  const diffMinutes = Math.floor(Math.abs(diffSeconds) / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} dk once`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} sa once`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gun once`;
};

const AlarmsPage: React.FC = () => {
  const { isConnected } = useOpcStore();

  const [alarms, setAlarms] = useState<BackendAlarmEntry[]>([]);
  const [summary, setSummary] = useState<AlarmSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyActionRequired, setOnlyActionRequired] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(REFRESH_OPTIONS[0].value);
  const [ackInProgress, setAckInProgress] = useState<string | null>(null);

  const authToken = authService.getToken();

  const operatorName = useMemo(() => {
    const rawUser = localStorage.getItem('auth_user');
    if (!rawUser) return 'operator';
    try {
      const parsed = JSON.parse(rawUser);
      return parsed?.username ?? parsed?.fullName ?? 'operator';
    } catch (err) {
      console.warn('auth_user parse failed', err);
      return 'operator';
    }
  }, [authToken]);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const token = authService.getToken();
    if (!token) {
      setSummary(null);
      setAlarms([]);
      setError('Alarm verilerine erismek icin lutfen giris yapin.');
      if (showSpinner) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
      return;
    }

    try {
      const [summaryResponse, activeAlarms] = await Promise.all([
        alarmService.getAlarmSummary(),
        alarmService.getActiveAlarms({ maxResults: PAGE_SIZE }),
      ]);

      setSummary(summaryResponse);
      setAlarms(activeAlarms);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Alarm verileri alinmadi.';
      setError(message);
      console.error('Alarm verileri alinurken hata olustu:', err);
    } finally {
      if (showSpinner) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      loadData(false);
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, loadData]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    alarms.forEach((alarm) => {
      if (alarm.source) {
        sources.add(alarm.source);
      }
    });
    return Array.from(sources).sort();
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return alarms
      .filter((alarm) => {
        if (severityFilter !== 'ALL' && alarm.severity !== severityFilter) {
          return false;
        }
        if (stateFilter !== 'ALL' && alarm.state !== stateFilter) {
          return false;
        }
        if (sourceFilter !== 'ALL' && alarm.source !== sourceFilter) {
          return false;
        }
        if (onlyActionRequired && !alarm.requiresOperatorAction) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          alarm.description.toLowerCase().includes(query) ||
          alarm.source.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        if (severityDiff !== 0) {
          return severityDiff;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [alarms, severityFilter, stateFilter, sourceFilter, onlyActionRequired, searchQuery]);

  const summaryCounts = useMemo(() => {
    const summaryFallback = {
      CRITICAL: filteredAlarms.filter((a) => a.severity === 'CRITICAL').length,
      HIGH: filteredAlarms.filter((a) => a.severity === 'HIGH').length,
      WARNING: filteredAlarms.filter((a) => a.severity === 'WARNING').length,
      INFO: filteredAlarms.filter((a) => a.severity === 'INFO').length,
      unacknowledged: filteredAlarms.filter((a) => a.state !== 'ACKNOWLEDGED' && a.state !== 'RESOLVED').length,
      total: filteredAlarms.length,
    };

    if (!summary) {
      return summaryFallback;
    }

    return {
      CRITICAL: summary.criticalCount,
      HIGH: summary.highCount,
      WARNING: summary.warningCount,
      INFO: summary.infoCount,
      unacknowledged: summary.unacknowledgedCount,
      total: summary.totalActive,
    };
  }, [filteredAlarms, summary]);

  const criticalAlarms = useMemo(() => {
    if (summary?.mostCritical?.length) {
      return summary.mostCritical;
    }
    return filteredAlarms.filter((alarm) => alarm.severity === 'CRITICAL').slice(0, 5);
  }, [filteredAlarms, summary]);

  const handleRefreshClick = () => {
    loadData(true);
  };

  const handleAcknowledge = async (alarm: BackendAlarmEntry) => {
    if (ackInProgress) {
      return;
    }

    if (alarm.state === 'ACKNOWLEDGED' || alarm.state === 'RESOLVED') {
      return;
    }

    try {
      setAckInProgress(alarm.id);
      await alarmService.acknowledgeAlarm({
        alarmId: alarm.id,
        acknowledgedBy: operatorName,
      });
      await loadData(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Alarm onaylanamadi.';
      setError(message);
    } finally {
      setAckInProgress(null);
    }
  };

  return (
    <div className="alarms-page">
      <div className="alarms-header">
        <div className="header-title">
          <span className="header-icon">!</span>
          <div>
            <h2>Alarm Yonetimi</h2>
            <p>Gercek zamanli SCADA alarm takibi</p>
          </div>
        </div>
        <div className="header-actions">
          <div className={`connection-pill ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            <span>{isConnected ? 'OPC baglantisi aktif' : 'OPC baglantisi yok'}</span>
          </div>
          <div className="refresh-controls">
            <button
              type="button"
              className="refresh-button"
              onClick={handleRefreshClick}
              disabled={loading || isRefreshing}
            >
              {loading ? 'Yukleniyor...' : 'Yenile'}
            </button>
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              <span>Oto yenile</span>
            </label>
            <select
              className="refresh-select"
              value={refreshInterval}
              onChange={(event) => setRefreshInterval(Number(event.target.value))}
              disabled={!autoRefresh}
            >
              {REFRESH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="status-summary">
        <div>
          <span className="status-label">Toplam aktif alarm</span>
          <span className="status-value">{summaryCounts.total}</span>
        </div>
        <div>
          <span className="status-label">Onay bekleyen</span>
          <span className="status-value warning">{summaryCounts.unacknowledged}</span>
        </div>
        <div>
          <span className="status-label">Son guncelleme</span>
          <span className="status-value">
            {lastRefresh ? formatAbsoluteTime(lastRefresh.toISOString()) : '-'}
            {isRefreshing && <span className="status-spinner" />}
          </span>
        </div>
      </div>

      <div className="summary-grid">
        {severityOrder.map((severity) => (
          <div key={severity} className={`summary-card severity-${severity.toLowerCase()}`}>
            <span className="summary-label">{severityLabels[severity]}</span>
            <span className="summary-value">{summaryCounts[severity]}</span>
          </div>
        ))}
        <div className="summary-card neutral">
          <span className="summary-label">Onay bekleyen</span>
          <span className="summary-value">{summaryCounts.unacknowledged}</span>
        </div>
      </div>

      <div className="alarm-filters">
        <div className="filter-group">
          <span className="filter-label">Onem</span>
          <div className="filter-chips">
            <button
              type="button"
              className={`filter-chip ${severityFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('ALL')}
            >
              Tumu
            </button>
            {severityOrder.map((severity) => (
              <button
                key={severity}
                type="button"
                className={`filter-chip severity-${severity.toLowerCase()} ${severityFilter === severity ? 'active' : ''}`}
                onClick={() => setSeverityFilter(severity)}
              >
                {severityLabels[severity]}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="state-filter">Durum</label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as StateFilter)}
          >
            <option value="ALL">Tumu</option>
            {Object.entries(stateLabels).map(([state, label]) => (
              <option key={state} value={state}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="source-filter">Kaynak</label>
          <select
            id="source-filter"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="ALL">Tumu</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group grow">
          <label className="filter-label" htmlFor="alarm-search">Arama</label>
          <input
            id="alarm-search"
            type="search"
            placeholder="Aciklama veya kaynak ara"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">
            <input
              type="checkbox"
              checked={onlyActionRequired}
              onChange={(event) => setOnlyActionRequired(event.target.checked)}
            />
            Operator mudahalesi gerekir
          </label>
        </div>
      </div>

      {error && (
        <div className="alarm-error">
          <span>{error}</span>
          <button type="button" onClick={handleRefreshClick}>
            Tekrar dene
          </button>
        </div>
      )}

      <div className="alarms-table-wrapper">
        {loading && (
          <div className="alarms-loading">Veriler yukleniyor...</div>
        )}

        {!loading && filteredAlarms.length === 0 && (
          <div className="alarms-empty">Secilen filtrelere uygun alarm bulunamadi.</div>
        )}

        {!loading && filteredAlarms.length > 0 && (
          <table className="alarms-table">
            <thead>
              <tr>
                <th>Onem</th>
                <th>Kaynak</th>
                <th>Aciklama</th>
                <th>Durum</th>
                <th>Oncelik</th>
                <th>Zaman</th>
                <th>Eylem</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlarms.map((alarm) => {
                const acknowledged = alarm.state === 'ACKNOWLEDGED' || alarm.state === 'RESOLVED';
                return (
                  <tr key={alarm.id} className={`alarm-row severity-${alarm.severity.toLowerCase()}`}>
                    <td>
                      <span className={getSeverityClass(alarm.severity)}>
                        {severityLabels[alarm.severity]}
                      </span>
                    </td>
                    <td>
                      <span className="alarm-source">{alarm.source}</span>
                      {alarm.requiresOperatorAction && (
                        <span className="alarm-badge">Operator</span>
                      )}
                    </td>
                    <td>
                      <div className="alarm-description">{alarm.description}</div>
                      {alarm.consequence && (
                        <div className="alarm-meta">{alarm.consequence}</div>
                      )}
                    </td>
                    <td>
                      <span className={`state-pill state-${alarm.state.toLowerCase()}`}>
                        {stateLabels[alarm.state]}
                      </span>
                    </td>
                    <td>
                      <span className="alarm-priority">{alarm.priority}</span>
                    </td>
                    <td>
                      <div className="alarm-time">{formatRelativeTime(alarm.timestamp)}</div>
                      <div className="alarm-meta">{formatAbsoluteTime(alarm.timestamp)}</div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ack-button"
                        onClick={() => handleAcknowledge(alarm)}
                        disabled={acknowledged || ackInProgress === alarm.id}
                      >
                        {acknowledged ? 'Onaylandi' : ackInProgress === alarm.id ? 'Isleniyor...' : 'Onayla'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {criticalAlarms.length > 0 && (
        <div className="critical-strip">
          <h3>Oncelikli Alarmlar</h3>
          <div className="critical-list">
            {criticalAlarms.map((alarm) => (
              <div key={alarm.id} className="critical-item">
                <span className="critical-source">{alarm.source}</span>
                <span className="critical-description">{alarm.description}</span>
                <span className="critical-time">{formatRelativeTime(alarm.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmsPage;



