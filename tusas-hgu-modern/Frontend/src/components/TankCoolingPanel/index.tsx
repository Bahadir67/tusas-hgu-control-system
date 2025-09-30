import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useOpcStore } from '../../store/opcStore';
import CoolingSetpointsModal from '../CoolingSetpointsModal';
import { useSystemOpcHint } from '../../hooks/useOpcHint';
import './TankCoolingPanel.css';

type CoolingSubPage = 'overview' | 'trends' | 'advanced';

interface TankCoolingPanelProps {
  onClick?: () => void;
  subPage?: CoolingSubPage | string;
  onSubPageChange?: (subPage: CoolingSubPage) => void;
}

interface TankCoolingData {
  tankLevel: number;
  tankTemperature: number;
  aquaSensor: number;
  waterTemperature: number;
  coolingSystemStatus: number;
  maxOilTempSetpoint: number;
  minOilTempSetpoint: number;
  coolingFlowRate: number;
  pumpStatus: boolean;
}

const COOLING_TABS: { key: CoolingSubPage; label: string }[] = [
  { key: 'overview', label: 'Özet' },
  { key: 'trends', label: 'Trendler' },
  { key: 'advanced', label: 'Gelişmiş' }
];

const isCoolingSubPage = (value?: string): value is CoolingSubPage =>
  Boolean(value && COOLING_TABS.some((tab) => tab.key === value));

const OverviewContent: React.FC<{
  data: TankCoolingData;
  tankLevelStatus: { class: string; color: string };
  getTemperatureColor: (temp: number, min: number, max: number) => string;
  getAquaSensorColor: (percentage: number) => string;
  hints: {
    tankLevel: string | undefined;
    oilTemperature: string | undefined;
    aquaSensor: string | undefined;
  };
}> = ({ data, tankLevelStatus, getTemperatureColor, getAquaSensorColor, hints }) => (
  <div className="tank-overview-grid">
    <div className="tank-level-card">
      <div className="section-header compact">
        <span className="section-icon">🛢️</span>
        <span className="section-title">Hidrolik Tank</span>
      </div>
      <div className="tank-display" title={hints.tankLevel}>
        <div className="tank-visual">
          <div className="tank-container">
            <div
              className={`tank-level ${tankLevelStatus.class}`}
              style={{ height: `${Math.min(Math.max(data.tankLevel, 0), 100)}%`, backgroundColor: tankLevelStatus.color }}
            />
            <div className="tank-level-text">{data.tankLevel.toFixed(1)}%</div>
          </div>
          <div className="tank-scale">
            <div className="scale-mark">100%</div>
            <div className="scale-mark">75%</div>
            <div className="scale-mark">50%</div>
            <div className="scale-mark">25%</div>
            <div className="scale-mark">0%</div>
          </div>
        </div>
      </div>
    </div>

    <div className="tank-overview-metrics">
      <div className="tank-metric-card" title={hints.oilTemperature}>
        <div className="metric-title">Yağ Sıcaklığı</div>
        <div
          className="metric-value large"
          style={{
            color: getTemperatureColor(
              data.tankTemperature,
              data.minOilTempSetpoint,
              data.maxOilTempSetpoint
            )
          }}
        >
          {data.tankTemperature.toFixed(1)}°C
        </div>
        <div className="metric-subtext">Aralık: {data.minOilTempSetpoint}°C - {data.maxOilTempSetpoint}°C</div>
      </div>

      <div className="tank-metric-card" title={hints.aquaSensor}>
        <div className="metric-title">Suda Yağ</div>
        <div
          className="metric-value large"
          style={{ color: getAquaSensorColor(data.aquaSensor) }}
        >
          {(data.aquaSensor * 100).toFixed(2)}%
        </div>
        <div className="metric-subtext">Sensör Durumu</div>
      </div>

      <div className="tank-metric-card pump" title="Pompa Durumu">
        <div className="metric-title">Soğutma Pompası</div>
        <div className={`metric-value large ${data.pumpStatus ? 'on' : 'off'}`}>
          {data.pumpStatus ? 'ON' : 'OFF'}
        </div>
        <div className="metric-subtext">Akım İzleme</div>
      </div>
    </div>
  </div>
);

const TrendsContent: React.FC<{
  data: TankCoolingData;
  getTemperatureColor: (temp: number, min: number, max: number) => string;
  getAquaSensorColor: (percentage: number) => string;
  hints: {
    chillerInletTemp: string | undefined;
    chillerWaterFlow: string | undefined;
  };
}> = ({ data, getTemperatureColor, getAquaSensorColor, hints }) => (
  <div className="tank-trends-grid">
    <div className="trend-card" title={hints.chillerInletTemp}>
      <div className="trend-header">
        <span className="trend-icon">🌡️</span>
        <span className="trend-label">Su Sıcaklığı</span>
        <span className="trend-value">{data.waterTemperature.toFixed(1)}°C</span>
      </div>
      <div className="progress-background">
        <div
          className="progress-fill water-temperature"
          style={{
            width: `${Math.min((data.waterTemperature / 50) * 100, 100)}%`,
            backgroundColor: getTemperatureColor(
              data.waterTemperature,
              data.minOilTempSetpoint,
              data.maxOilTempSetpoint
            )
          }}
        />
      </div>
      <div className="trend-subtext">50°C üstü uyarı oluşturur</div>
    </div>

    <div className="trend-card" title={hints.chillerWaterFlow}>
      <div className="trend-header">
        <span className="trend-icon">💧</span>
        <span className="trend-label">Debi</span>
        <span className="trend-value">{data.coolingFlowRate.toFixed(1)} L/dk</span>
      </div>
      <div className="progress-background">
        <div
          className="progress-fill flow-rate"
          style={{ width: `${Math.min((data.coolingFlowRate / 200) * 100, 100)}%` }}
        />
      </div>
      <div className="trend-subtext">Beklenen Aralık: 120-180 L/dk</div>
    </div>

    <div className="trend-card">
      <div className="trend-header">
        <span className="trend-icon">🧪</span>
        <span className="trend-label">Su Sensörü</span>
        <span className="trend-value" style={{ color: getAquaSensorColor(data.aquaSensor) }}>
          {(data.aquaSensor * 100).toFixed(2)}%
        </span>
      </div>
      <div className="trend-subtext">Trend izleme: kritik eşikler %20 ve %50</div>
    </div>
  </div>
);

const AdvancedContent: React.FC<{
  data: TankCoolingData;
  onOpenSetpoints: () => void;
  onOpenPanelSettings?: () => void;
}> = ({ data, onOpenSetpoints, onOpenPanelSettings }) => (
  <div className="tank-advanced-grid">
    <div className="advanced-card">
      <div className="advanced-header">
        <span className="advanced-icon">🎯</span>
        <span className="advanced-title">Setpoint Aralıkları</span>
      </div>
      <div className="advanced-values">
        <div>
          <span className="advanced-label">Min Yağ Sıcaklığı</span>
          <span className="advanced-value">{data.minOilTempSetpoint.toFixed(1)}°C</span>
        </div>
        <div>
          <span className="advanced-label">Maks Yağ Sıcaklığı</span>
          <span className="advanced-value">{data.maxOilTempSetpoint.toFixed(1)}°C</span>
        </div>
      </div>
      <button type="button" className="advanced-btn" onClick={onOpenSetpoints}>
        Setpoint Ayarlarını Aç
      </button>
    </div>

    <div className="advanced-card">
      <div className="advanced-header">
        <span className="advanced-icon">📈</span>
        <span className="advanced-title">Çalışma Aralığı</span>
      </div>
      <div className="range-display">
        <div className="range-bar">
          <span className="range-min">{data.minOilTempSetpoint}°C</span>
          <div
            className="range-current-marker"
            style={{
              left: `${Math.min(
                Math.max(
                  ((data.tankTemperature - data.minOilTempSetpoint) /
                    (data.maxOilTempSetpoint - data.minOilTempSetpoint || 1)) * 100,
                  0
                ),
                100
              )}%`
            }}
          />
          <span className="range-max">{data.maxOilTempSetpoint}°C</span>
        </div>
        <div className="range-value">Anlık: {data.tankTemperature.toFixed(1)}°C</div>
      </div>
    </div>

    <div className="advanced-card actions">
      <div className="advanced-header">
        <span className="advanced-icon">🛠️</span>
        <span className="advanced-title">Panel İşlemleri</span>
      </div>
      <button
        type="button"
        className="advanced-btn secondary"
        onClick={onOpenPanelSettings}
        disabled={!onOpenPanelSettings}
      >
        Panel Ayarlarını Aç
      </button>
    </div>
  </div>
);

const TankCoolingPanel: React.FC<TankCoolingPanelProps> = ({ onClick, subPage, onSubPageChange }) => {
  const system = useOpcStore((state) => state.system);
  const [showCoolingModal, setShowCoolingModal] = useState(false);
  const [internalSubPage, setInternalSubPage] = useState<CoolingSubPage>('overview');

  const tankLevelHint = useSystemOpcHint('tankLevel');
  const oilTemperatureHint = useSystemOpcHint('oilTemperature');
  const aquaSensorHint = useSystemOpcHint('aquaSensor');
  const chillerInletTempHint = useSystemOpcHint('chillerInletTemp');
  const chillerWaterFlowHint = useSystemOpcHint('chillerWaterFlowStatus');
  const systemStatusHint = useSystemOpcHint('systemStatus');

  const tankCoolingData: TankCoolingData = {
    tankLevel: system.tankLevel || 0,
    tankTemperature: system.oilTemperature || 0,
    aquaSensor: system.aquaSensor || 0,
    waterTemperature: system.waterTemperature || 0,
    coolingSystemStatus: system.coolingSystemStatus || 0,
    maxOilTempSetpoint: system.maxOilTempSetpoint || 60.0,
    minOilTempSetpoint: system.minOilTempSetpoint || 30.0,
    coolingFlowRate: system.coolingFlowRate || 0,
    pumpStatus: system.coolingPumpStatus || false
  };

  const getCoolingStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'Off', class: 'status-off', color: '#6b7280', icon: '⏸️' };
      case 1: return { text: 'Normal', class: 'status-normal', color: '#22c55e', icon: '❄️' };
      case 2: return { text: 'Warning', class: 'status-warning', color: '#f59e0b', icon: '⚠️' };
      case 3: return { text: 'Error', class: 'status-error', color: '#ef4444', icon: '🔥' };
      default: return { text: 'Unknown', class: 'status-off', color: '#6b7280', icon: '❓' };
    }
  };

  const getTankLevelStatus = (level: number) => {
    if (level < 20) return { class: 'level-critical', color: '#ef4444' };
    if (level < 40) return { class: 'level-low', color: '#f59e0b' };
    if (level > 90) return { class: 'level-high', color: '#06b6d4' };
    return { class: 'level-normal', color: '#22c55e' };
  };

  const getTemperatureColor = (temp: number, min: number, max: number) => {
    if (temp > max) return '#ef4444';
    if (temp < min) return '#06b6d4';
    if (temp > max * 0.9) return '#f59e0b';
    return '#22c55e';
  };

  const getAquaSensorColor = (percentage: number) => {
    if (percentage > 0.5) return '#ef4444';
    if (percentage > 0.2) return '#f59e0b';
    return '#22c55e';
  };

  const statusInfo = useMemo(
    () => getCoolingStatusInfo(tankCoolingData.coolingSystemStatus),
    [tankCoolingData.coolingSystemStatus]
  );

  const tankLevelStatus = useMemo(
    () => getTankLevelStatus(tankCoolingData.tankLevel),
    [tankCoolingData.tankLevel]
  );

  const activeSubPage = isCoolingSubPage(typeof subPage === 'string' ? subPage : undefined)
    ? (subPage as CoolingSubPage)
    : internalSubPage;

  const handleSubPageChange = (next: CoolingSubPage) => {
    if (onSubPageChange) {
      onSubPageChange(next);
    } else {
      setInternalSubPage(next);
    }
  };

  const handleOpenSetpoints = () => {
    setShowCoolingModal(true);
  };

  const handleOpenPanelSettings = () => {
    onClick?.();
  };

  return (
    <div className={`tank-cooling-panel ${statusInfo.class}`}>
      <div className="status-strip" style={{ backgroundColor: statusInfo.color }} />

      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">{statusInfo.icon}</span>
          <span className="panel-text">TANK & COOLING</span>
        </div>
        <div
          className={`status-badge ${statusInfo.class}`}
          style={{ backgroundColor: `${statusInfo.color}20`, borderColor: `${statusInfo.color}60` }}
          title={systemStatusHint}
        >
          <span className="status-indicator" style={{ backgroundColor: statusInfo.color }} />
          <span className="status-text">{statusInfo.text}</span>
        </div>
      </div>

      <div className="tank-tabs">
        {COOLING_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`tank-tab ${activeSubPage === key ? 'active' : ''}`}
            onClick={() => handleSubPageChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tank-panel-content">
        {activeSubPage === 'overview' && (
          <OverviewContent
            data={tankCoolingData}
            tankLevelStatus={tankLevelStatus}
            getTemperatureColor={getTemperatureColor}
            getAquaSensorColor={getAquaSensorColor}
            hints={{
              tankLevel: tankLevelHint,
              oilTemperature: oilTemperatureHint,
              aquaSensor: aquaSensorHint
            }}
          />
        )}

        {activeSubPage === 'trends' && (
          <TrendsContent
            data={tankCoolingData}
            getTemperatureColor={getTemperatureColor}
            getAquaSensorColor={getAquaSensorColor}
            hints={{
              chillerInletTemp: chillerInletTempHint,
              chillerWaterFlow: chillerWaterFlowHint
            }}
          />
        )}

        {activeSubPage === 'advanced' && (
          <AdvancedContent
            data={tankCoolingData}
            onOpenSetpoints={handleOpenSetpoints}
            onOpenPanelSettings={handleOpenPanelSettings}
          />
        )}
      </div>

      {showCoolingModal && ReactDOM.createPortal(
        <CoolingSetpointsModal onClose={() => setShowCoolingModal(false)} />,
        document.body
      )}
    </div>
  );
};

export default TankCoolingPanel;
