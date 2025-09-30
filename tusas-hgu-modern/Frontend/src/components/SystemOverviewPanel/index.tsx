import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useOpcStore } from '../../store/opcStore';
import SystemSetpointsModal from '../SystemSetpointsModal';
import './SystemOverviewPanel.css';

type OverviewSubPage = 'summary' | 'performance' | 'settings';

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
  subPage?: OverviewSubPage | string;
  onSubPageChange?: (subPage: OverviewSubPage) => void;
}

const OVERVIEW_TABS: { key: OverviewSubPage; label: string }[] = [
  { key: 'summary', label: 'Özet' },
  { key: 'performance', label: 'Performans' },
  { key: 'settings', label: 'Ayarlar' }
];

const isOverviewSubPage = (value?: string): value is OverviewSubPage =>
  Boolean(value && OVERVIEW_TABS.some((tab) => tab.key === value));

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

const SummarySection: React.FC<{
  data: SystemData;
  statusInfo: StatusInfo;
  getValueColor: (current: number, setpoint: number, tolerance?: number) => string;
  getEfficiencyColor: (efficiency: number) => string;
}> = ({ data, statusInfo, getValueColor, getEfficiencyColor }) => {
  const flowColor =
    data.totalFlowExecution !== undefined && data.totalFlowSetpoint !== undefined
      ? getValueColor(data.totalFlowExecution, data.totalFlowSetpoint)
      : '#ef4444';

  const pressureColor =
    data.pressureExecution !== undefined && data.pressureSetpoint !== undefined
      ? getValueColor(data.pressureExecution, data.pressureSetpoint)
      : '#ef4444';

  const efficiencyValue = formatNumber(data.efficiency);

  return (
    <div className="overview-summary-grid">
      <div className="summary-card status-card">
        <div className="summary-card-header">
          <span className="summary-icon">{statusInfo.icon}</span>
          <span className="summary-label">Sistem Durumu</span>
        </div>
        <div className="summary-status" style={{ color: statusInfo.color }}>
          {statusInfo.text}
        </div>
        <div className="summary-mode" style={{ backgroundColor: data.systemEnable ? '#3b82f6' : '#06b6d4' }}>
          {data.systemEnable ? 'AUTO' : 'MANUAL'}
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-icon">💧</span>
          <span className="summary-label">Toplam Debi</span>
        </div>
        <div className="summary-value" style={{ color: flowColor }}>
          {formatNumber(data.totalFlowExecution)}
          {formatNumber(data.totalFlowExecution) !== 'ERR' && <span className="summary-unit">L/dk</span>}
        </div>
        <div className="summary-subtext">
          Hedef: {formatNumber(data.totalFlowSetpoint)} {formatNumber(data.totalFlowSetpoint) !== 'ERR' && 'L/dk'}
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-icon">⚡</span>
          <span className="summary-label">Toplam Basınç</span>
        </div>
        <div className="summary-value" style={{ color: pressureColor }}>
          {formatNumber(data.pressureExecution)}
          {formatNumber(data.pressureExecution) !== 'ERR' && <span className="summary-unit">bar</span>}
        </div>
        <div className="summary-subtext">
          Hedef: {formatNumber(data.pressureSetpoint)} {formatNumber(data.pressureSetpoint) !== 'ERR' && 'bar'}
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-icon">📈</span>
          <span className="summary-label">Verimlilik</span>
        </div>
        <div
          className="summary-value"
          style={{ color: data.efficiency !== undefined ? getEfficiencyColor(data.efficiency) : '#ef4444' }}
        >
          {efficiencyValue}
          {efficiencyValue !== 'ERR' && <span className="summary-unit">%</span>}
        </div>
        <div className="summary-subtext">Aktif Pompalar: {data.activePumps ?? 'ERR'}</div>
      </div>
    </div>
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
  onSystemEnableToggle,
  subPage,
  onSubPageChange
}) => {
  const system = useOpcStore((state) => state.system);
  const [showSetpointsModal, setShowSetpointsModal] = useState(false);
  const [internalSubPage, setInternalSubPage] = useState<OverviewSubPage>('summary');

  const systemData = useMemo(() => buildSystemData(system), [system]);

  const getSystemStatusInfo = (status: number): StatusInfo => {
    switch (status) {
      case 0: return { text: 'Başlatılıyor', class: 'status-test', color: '#8b5cf6', icon: '🔄' };
      case 1: return { text: 'Otomatik Hazır', class: 'status-ready', color: '#3b82f6', icon: '🤖' };
      case 2: return { text: 'Çalışıyor', class: 'status-active', color: '#22c55e', icon: '▶️' };
      case 3: return { text: 'Hata', class: 'status-error', color: '#ef4444', icon: '❌' };
      case 4: return { text: 'Otomatik Moda Geçiş', class: 'status-warning', color: '#f59e0b', icon: '🔄' };
      case 5: return { text: 'Manuel Moda Geçiş', class: 'status-warning', color: '#f59e0b', icon: '🔄' };
      case 6: return { text: 'Manuel Hazır', class: 'status-ready', color: '#06b6d4', icon: '✋' };
      default: return { text: 'Bilinmiyor', class: 'status-ready', color: '#6b7280', icon: '❓' };
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

  const activeSubPage = isOverviewSubPage(typeof subPage === 'string' ? subPage : undefined)
    ? (subPage as OverviewSubPage)
    : internalSubPage;

  const handleSubPageChange = (next: OverviewSubPage) => {
    if (onSubPageChange) {
      onSubPageChange(next);
    } else {
      setInternalSubPage(next);
    }
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

      <div className="system-overview-tabs">
        {OVERVIEW_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`overview-tab ${activeSubPage === key ? 'active' : ''}`}
            onClick={() => handleSubPageChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="system-overview-content">
        {activeSubPage === 'summary' && (
          <SummarySection
            data={systemData}
            statusInfo={statusInfo}
            getValueColor={getValueColor}
            getEfficiencyColor={getEfficiencyColor}
          />
        )}

        {activeSubPage === 'performance' && (
          <PerformanceSection
            data={systemData}
            getValueColor={getValueColor}
            getEfficiencyColor={getEfficiencyColor}
          />
        )}

        {activeSubPage === 'settings' && (
          <SettingsSection
            data={systemData}
            onSystemEnableToggle={onSystemEnableToggle}
            onOpenSetpoints={() => setShowSetpointsModal(true)}
          />
        )}
      </div>

      {showSetpointsModal && ReactDOM.createPortal(
        <SystemSetpointsModal onClose={() => setShowSetpointsModal(false)} />,
        document.body
      )}
    </div>
  );
};

export default SystemOverviewPanel;
