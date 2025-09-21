import React from 'react';

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastQuery: Date;
  recordCount: number;
  dataRate: string;
}

interface InfluxDBConnectionPanelProps {
  connectionStatus: ConnectionStatus;
  onReconnect: () => void;
  bucketName?: string;
  organization?: string;
  url?: string;
}

const InfluxDBConnectionPanel: React.FC<InfluxDBConnectionPanelProps> = ({
  connectionStatus,
  onReconnect,
  bucketName,
  organization,
  url
}) => {
  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'var(--color-running)';
      case 'connecting': return 'var(--color-warning)';
      case 'disconnected': return 'var(--color-disabled)';
      case 'error': return 'var(--color-error)';
      default: return 'var(--color-disabled)';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'CONNECTED';
      case 'connecting': return 'CONNECTING...';
      case 'disconnected': return 'DISCONNECTED';
      case 'error': return 'CONNECTION ERROR';
      default: return 'UNKNOWN';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '⚪';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="influxdb-connection-panel">
      <div className="connection-status-display">
        <div
          className={`connection-indicator ${connectionStatus.status}`}
          style={{ backgroundColor: getStatusColor() }}
        />
        <div className="connection-info">
          <div className="connection-text">
            <span className="connection-icon">{getStatusIcon()}</span>
            <span className="connection-label">InfluxDB OSS v2.7.12</span>
            <span
              className="connection-status"
              style={{ color: getStatusColor() }}
            >
              {getStatusText()}
            </span>
          </div>
          <div className="connection-details">
            <span className="detail-item">
              Last Query: {connectionStatus.lastQuery.toLocaleTimeString()}
            </span>
            <span className="detail-separator">•</span>
            <span className="detail-item">
              Records: {connectionStatus.recordCount.toLocaleString()}
            </span>
            <span className="detail-separator">•</span>
            <span className="detail-item">
              Rate: {connectionStatus.dataRate}
            </span>
          </div>
        </div>
      </div>

      <div className="connection-actions">
        <button
          className={`connection-button ${connectionStatus.status === 'connecting' ? 'disabled' : ''}`}
          onClick={onReconnect}
          disabled={connectionStatus.status === 'connecting'}
          title="Reconnect to InfluxDB"
        >
          {connectionStatus.status === 'connecting' ? (
            <>
              <span className="loading-spinner">⟳</span>
              Connecting...
            </>
          ) : (
            <>
              <span className="reconnect-icon">🔄</span>
              Reconnect
            </>
          )}
        </button>

        <div className="server-info">
          <div className="server-detail">
            <span className="server-label">Bucket:</span>
            <span className="server-value">{bucketName ?? 'Pending'}</span>
          </div>
          <div className="server-detail">
            <span className="server-label">Org:</span>
            <span className="server-value">{organization ?? 'Pending'}</span>
          </div>
          {url && (
            <div className="server-detail">
              <span className="server-label">URL:</span>
              <span className="server-value">{url}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .influxdb-connection-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-lg);
          flex: 1;
        }

        .connection-status-display {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .connection-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          animation: pulse 2s infinite;
          filter: drop-shadow(0 0 4px currentColor);
        }

        .connection-indicator.connecting {
          animation: pulse 1s infinite;
        }

        .connection-indicator.error {
          animation: blink 1s infinite;
        }

        .connection-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .connection-text {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .connection-icon {
          font-size: 14px;
        }

        .connection-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
        }

        .connection-status {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: var(--font-mono);
        }

        .connection-details {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 11px;
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
        }

        .detail-item {
          white-space: nowrap;
        }

        .detail-separator {
          color: var(--color-border);
        }

        .connection-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .connection-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: rgba(15, 20, 25, 0.8);
          border: 1px solid rgba(96, 160, 255, 0.3);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          color: var(--color-text-primary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-mono);
        }

        .connection-button:hover:not(.disabled) {
          background: var(--color-accent);
          border-color: var(--color-accent);
          box-shadow: 0 0 8px rgba(0, 153, 255, 0.3);
        }

        .connection-button.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        .reconnect-icon {
          font-size: 12px;
        }

        .server-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .server-detail {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .server-label {
          font-size: 10px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 40px;
        }

        .server-value {
          font-size: 11px;
          color: var(--color-value-normal);
          font-family: var(--font-mono);
          font-weight: 600;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .influxdb-connection-panel {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }

          .connection-actions {
            width: 100%;
            justify-content: space-between;
          }

          .connection-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .detail-separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default InfluxDBConnectionPanel;




