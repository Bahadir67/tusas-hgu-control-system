import React, { useEffect, useMemo } from 'react';
import { useOpcStore } from '../../store/opcStore';
import './DigitalInputsModal.css';

type Severity = 'success' | 'critical' | 'warning' | 'info';

type MotorBooleanKey =
  | 'startAck'
  | 'stopAck'
  | 'resetAck'
  | 'manualValve'
  | 'lineFilter'
  | 'suctionFilter';

interface DigitalInputItem {
  id: string;
  label: string;
  value: boolean;
  description: string;
  icon: string;
  severity?: Severity;
  activeLabel?: string;
  inactiveLabel?: string;
}

interface DigitalInputGroup {
  id: string;
  title: string;
  icon: string;
  description: string;
  items: DigitalInputItem[];
}

interface DigitalInputsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const motorStatusConfigs: Array<{
  key: MotorBooleanKey;
  label: string;
  icon: string;
  severity: Severity;
  activeLabel?: string;
  inactiveLabel?: string;
}> = [
  {
    key: 'startAck',
    label: 'Başlatma Onayı',
    icon: '✅',
    severity: 'success',
    activeLabel: 'Onaylandı',
    inactiveLabel: 'Beklemede',
  },
  {
    key: 'stopAck',
    label: 'Durdurma Onayı',
    icon: '⏹️',
    severity: 'info',
    activeLabel: 'Onaylandı',
    inactiveLabel: 'Beklemede',
  },
  {
    key: 'resetAck',
    label: 'Reset Onayı',
    icon: '♻️',
    severity: 'info',
    activeLabel: 'Hazır',
    inactiveLabel: 'Pasif',
  },
  {
    key: 'manualValve',
    label: 'Manuel Vana Açık',
    icon: '🧰',
    severity: 'warning',
    activeLabel: 'Açık',
    inactiveLabel: 'Kapalı',
  },
  {
    key: 'lineFilter',
    label: 'Hat Filtresi Alarmı',
    icon: '🧼',
    severity: 'warning',
    activeLabel: 'Aktif',
    inactiveLabel: 'Normal',
  },
  {
    key: 'suctionFilter',
    label: 'Emme Filtresi Alarmı',
    icon: '🌀',
    severity: 'warning',
    activeLabel: 'Aktif',
    inactiveLabel: 'Normal',
  },
];

const DigitalInputsModal: React.FC<DigitalInputsModalProps> = ({ isOpen, onClose }) => {
  const system = useOpcStore((state) => state.system);
  const motors = useOpcStore((state) => state.motors);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const digitalGroups = useMemo<DigitalInputGroup[]>(() => [
    {
      id: 'safety',
      title: 'Güvenlik & Acil Durum',
      icon: '🛡️',
      description: 'Operatör panosu ve kritik emniyet girişleri',
      items: [
        {
          id: 'emergency-stop',
          label: 'Acil Stop Butonu',
          icon: '🆘',
          value: system.emergencyStop,
          description: 'Panel üzerindeki acil durdurma hattının durumu',
          severity: 'critical',
          activeLabel: 'Aktif',
          inactiveLabel: 'Serbest',
        },
        {
          id: 'system-enable',
          label: 'Sistem Enable Girişi',
          icon: '🟢',
          value: system.systemEnable,
          description: 'Hidrolik ünitenin çalışmasına izin veren dijital giriş',
          severity: 'success',
          activeLabel: 'Etkin',
          inactiveLabel: 'Pasif',
        },
        {
          id: 'system-error',
          label: 'Sistem Hata Kontağı',
          icon: '🚨',
          value: system.systemErrorActive,
          description: 'PLC tarafından algılanan genel sistem hatası',
          severity: 'critical',
          activeLabel: 'Hata',
          inactiveLabel: 'Normal',
        },
        {
          id: 'safety-error',
          label: 'Kritik Emniyet Hatası',
          icon: '⚠️',
          value: system.criticalSafetyError,
          description: 'Emniyet rölelerinden gelen kritik alarm hattı',
          severity: 'critical',
          activeLabel: 'Aktif',
          inactiveLabel: 'Normal',
        },
      ],
    },
    {
      id: 'process',
      title: 'Proses & Koruma',
      icon: '🧭',
      description: 'Basınç emniyeti ve tank seviyeleri için girişler',
      items: [
        {
          id: 'pressure-safety-enable',
          label: 'Basınç Emniyet Valf Enable',
          icon: '🧯',
          value: system.pressureSafetyValvesEnable,
          description: 'Emniyet valflerinin devreye alınma bilgisi',
          severity: 'success',
          activeLabel: 'Devrede',
          inactiveLabel: 'Devre Dışı',
        },
        {
          id: 'pressure-safety-comm',
          label: 'Emniyet Valfi Haberleşmesi',
          icon: '📡',
          value: system.pressureSafetyValvesCommOk,
          description: 'Emniyet valf modülünden iletişim geri bildirimi',
          severity: 'info',
          activeLabel: 'Sağlam',
          inactiveLabel: 'Kesildi',
        },
        {
          id: 'tank-min',
          label: 'Tank Seviye Min',
          icon: '📉',
          value: system.tankMinLevel,
          description: 'Minimum yağ seviyesi şamandıra girişi',
          severity: 'warning',
          activeLabel: 'Aktif',
          inactiveLabel: 'Normal',
        },
        {
          id: 'tank-max',
          label: 'Tank Seviye Max',
          icon: '📈',
          value: system.tankMaxLevel,
          description: 'Maksimum yağ seviyesi şamandıra girişi',
          severity: 'warning',
          activeLabel: 'Aktif',
          inactiveLabel: 'Normal',
        },
        {
          id: 'chiller-flow',
          label: 'Soğutucu Su Akışı',
          icon: '💧',
          value: system.chillerWaterFlowStatus,
          description: 'Soğutucu su hattından gelen akış bilgisi',
          severity: 'info',
          activeLabel: 'Akış Var',
          inactiveLabel: 'Yetersiz',
        },
      ],
    },
    {
      id: 'communication',
      title: 'Haberleşme & Ağ',
      icon: '🛰️',
      description: 'CAN hatları ve sistem haberleşme geri bildirimleri',
      items: [
        {
          id: 'can-active',
          label: 'CAN Haberleşmesi Aktif',
          icon: '🔄',
          value: system.canCommunicationActive,
          description: 'CAN bus hattının genel çalışma durumu',
          severity: 'success',
          activeLabel: 'Aktif',
          inactiveLabel: 'Pasif',
        },
        {
          id: 'can-tcp',
          label: 'CAN TCP Bağlantısı',
          icon: '🌐',
          value: system.canTcpConnected,
          description: 'SCADA ile CAN gateway arasındaki bağlantı bilgisi',
          severity: 'success',
          activeLabel: 'Bağlı',
          inactiveLabel: 'Kopuk',
        },
        {
          id: 'can-error',
          label: 'CAN Sistem Hatası',
          icon: '🛑',
          value: system.canSystemError,
          description: 'CAN haberleşmesinden gelen genel hata kontağı',
          severity: 'critical',
          activeLabel: 'Hata',
          inactiveLabel: 'Normal',
        },
        {
          id: 'any-motor-error',
          label: 'Motor Hata Takibi',
          icon: '🧱',
          value: system.anyMotorError,
          description: 'Motorlardan herhangi birinde hata bilgisi',
          severity: 'warning',
          activeLabel: 'Aktif',
          inactiveLabel: 'Normal',
        },
      ],
    },
  ], [
    system.emergencyStop,
    system.systemEnable,
    system.systemErrorActive,
    system.criticalSafetyError,
    system.pressureSafetyValvesEnable,
    system.pressureSafetyValvesCommOk,
    system.tankMinLevel,
    system.tankMaxLevel,
    system.chillerWaterFlowStatus,
    system.canCommunicationActive,
    system.canTcpConnected,
    system.canSystemError,
    system.anyMotorError,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay digital-inputs-overlay" onClick={onClose}>
      <div
        className="modal-content digital-inputs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="digital-inputs-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header digital-inputs-header">
          <div>
            <h3 id="digital-inputs-title">Dijital Girişler İzleme</h3>
            <p className="digital-inputs-subtitle">
              Kritik sensör ve emniyet girişlerinin anlık durumları
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className="modal-body digital-inputs-body">
          <div className="digital-groups-grid">
            {digitalGroups.map((group) => (
              <section key={group.id} className="digital-group-card">
                <header className="digital-group-header">
                  <span className="digital-group-icon" aria-hidden="true">
                    {group.icon}
                  </span>
                  <div>
                    <h4 className="digital-group-title">{group.title}</h4>
                    <p className="digital-group-description">{group.description}</p>
                  </div>
                </header>

                <div className="digital-input-list">
                  {group.items.map((item) => {
                    const severity = item.severity ?? 'info';
                    const itemClassName = `digital-input-item ${
                      item.value ? 'is-active' : 'is-inactive'
                    } severity-${severity}`;
                    const stateClassName = `digital-input-state ${
                      item.value ? 'is-active' : 'is-inactive'
                    } severity-${severity}`;

                    return (
                      <article key={item.id} className={itemClassName}>
                        <div className="digital-input-info">
                          <span className="digital-input-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                          <div className="digital-input-text">
                            <span className="digital-input-name">{item.label}</span>
                            <span className="digital-input-desc">{item.description}</span>
                          </div>
                        </div>
                        <div className={stateClassName}>
                          <span className="digital-input-dot" aria-hidden="true" />
                          <span className="digital-input-state-label">
                            {item.value
                              ? item.activeLabel ?? 'Aktif'
                              : item.inactiveLabel ?? 'Pasif'}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="digital-motor-section">
            <header className="digital-section-header">
              <span className="digital-section-icon" aria-hidden="true">
                ⚙️
              </span>
              <div>
                <h4 className="digital-section-title">Motor Dijital Girişleri</h4>
                <p className="digital-section-description">
                  Her motor için enable, onay ve filtre sensör bilgileri
                </p>
              </div>
            </header>

            <div className="digital-motor-grid">
              {Object.entries(motors).map(([motorId, motor]) => (
                <article key={motorId} className="digital-motor-card">
                  <header className="digital-motor-header">
                    <div className="digital-motor-title">
                      <span className="digital-motor-name">Motor {motorId}</span>
                      <span
                        className={`digital-motor-status ${
                          motor.enabled ? 'is-enabled' : 'is-disabled'
                        }`}
                      >
                        {motor.enabled ? 'ÇALIŞMA İZNİ' : 'PASİF'}
                      </span>
                    </div>
                    <span className="digital-motor-subtitle">
                      {motor.manualValve ? 'Manuel mod aktif' : 'Otomatik kontrol'}
                    </span>
                  </header>

                  <div className="digital-motor-status-grid">
                    {motorStatusConfigs.map((config) => {
                      const value = motor[config.key];
                      const chipClass = `digital-motor-chip ${
                        value ? 'is-active' : 'is-inactive'
                      } severity-${config.severity}`;

                      return (
                        <div key={config.key} className={chipClass}>
                          <span className="digital-motor-chip-icon" aria-hidden="true">
                            {config.icon}
                          </span>
                          <div className="digital-motor-chip-text">
                            <span className="digital-motor-chip-label">{config.label}</span>
                            <span className="digital-motor-chip-state">
                              {value
                                ? config.activeLabel ?? 'Aktif'
                                : config.inactiveLabel ?? 'Pasif'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DigitalInputsModal;
