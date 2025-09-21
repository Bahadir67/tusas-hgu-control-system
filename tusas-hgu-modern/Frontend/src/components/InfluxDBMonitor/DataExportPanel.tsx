import React, { useState } from 'react';

interface DataExportPanelProps {
  selectedMotors: number[];
  selectedMetrics: string[];
  timeRange: string;
  dataCount: number;
}

const DataExportPanel: React.FC<DataExportPanelProps> = ({
  selectedMotors,
  selectedMetrics,
  timeRange,
  dataCount
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    includeTimestamp: true,
    includeMotorId: true,
    compressOutput: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([
    {
      id: 1,
      filename: 'motor_data_2024-01-15_14-30.csv',
      timestamp: new Date(Date.now() - 3600000),
      size: '2.4 MB',
      records: 15420,
      format: 'CSV'
    },
    {
      id: 2,
      filename: 'system_metrics_2024-01-15_13-00.json',
      timestamp: new Date(Date.now() - 7200000),
      size: '1.8 MB',
      records: 8640,
      format: 'JSON'
    },
    {
      id: 3,
      filename: 'performance_report_2024-01-15.xlsx',
      timestamp: new Date(Date.now() - 10800000),
      size: '3.1 MB',
      records: 25200,
      format: 'Excel'
    }
  ]);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `hgu_data_${timestamp}.${exportFormat}`;

      // Add to export history
      const newExport = {
        id: exportHistory.length + 1,
        filename,
        timestamp: new Date(),
        size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
        records: dataCount,
        format: exportFormat.toUpperCase()
      };

      setExportHistory(prev => [newExport, ...prev.slice(0, 4)]);

      // In real implementation, this would trigger actual file download
      console.log('Export completed:', {
        filename,
        format: exportFormat,
        motors: selectedMotors,
        metrics: selectedMetrics,
        timeRange,
        options: exportOptions
      });

    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedSize = () => {
    const baseSize = dataCount * selectedMetrics.length * selectedMotors.length;
    const sizeInMB = (baseSize * 50) / (1024 * 1024); // Rough estimation
    return sizeInMB < 1 ? `${(sizeInMB * 1024).toFixed(0)} KB` : `${sizeInMB.toFixed(1)} MB`;
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleDateString('tr-TR') + ' ' +
           timestamp.toLocaleTimeString('tr-TR', {
             hour: '2-digit',
             minute: '2-digit'
           });
  };

  return (
    <div className="data-export-panel">
      <h3 className="panel-title">
        <span className="panel-icon">💾</span>
        Data Export
      </h3>

      {/* Export Configuration */}
      <div className="export-config-section">
        <div className="config-group">
          <label className="config-label">Export Format:</label>
          <div className="format-selector">
            {(['csv', 'json', 'excel'] as const).map(format => (
              <button
                key={format}
                className={`format-button ${exportFormat === format ? 'active' : ''}`}
                onClick={() => setExportFormat(format)}
                disabled={isExporting}
              >
                <span className="format-icon">
                  {format === 'csv' && '📄'}
                  {format === 'json' && '📋'}
                  {format === 'excel' && '📊'}
                </span>
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <label className="config-label">Export Options:</label>
          <div className="options-grid">
            {Object.entries(exportOptions).map(([key, value]) => (
              <label key={key} className="option-checkbox">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="industrial-checkbox"
                  disabled={isExporting}
                />
                <span className="option-label">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Export Summary */}
      <div className="export-summary">
        <div className="summary-title">Export Summary:</div>
        <div className="summary-details">
          <div className="summary-row">
            <span className="summary-label">Motors:</span>
            <span className="summary-value">
              {selectedMotors.length > 0 ? selectedMotors.join(', ') : 'None selected'}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Metrics:</span>
            <span className="summary-value">
              {selectedMetrics.length > 0 ? selectedMetrics.join(', ') : 'None selected'}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Time Range:</span>
            <span className="summary-value">{timeRange}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Records:</span>
            <span className="summary-value">{dataCount.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Est. Size:</span>
            <span className="summary-value">{getEstimatedSize()}</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        className={`export-button ${isExporting ? 'exporting' : ''}`}
        onClick={handleExport}
        disabled={isExporting || selectedMotors.length === 0 || selectedMetrics.length === 0}
      >
        {isExporting ? (
          <>
            <span className="loading-spinner">⟳</span>
            Exporting...
          </>
        ) : (
          <>
            <span className="export-icon">📥</span>
            Export Data
          </>
        )}
      </button>

      {/* Export History */}
      <div className="export-history-section">
        <h4 className="section-title">Recent Exports:</h4>
        <div className="export-history-list">
          {exportHistory.length > 0 ? (
            exportHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-header">
                  <span className="history-filename">{item.filename}</span>
                  <div className="history-actions">
                    <button
                      className="download-button"
                      title="Download again"
                      onClick={() => console.log('Download:', item.filename)}
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
                <div className="history-details">
                  <span className="history-timestamp">
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span className="history-separator">•</span>
                  <span className="history-size">{item.size}</span>
                  <span className="history-separator">•</span>
                  <span className="history-records">{item.records.toLocaleString()} records</span>
                  <span className="history-separator">•</span>
                  <span className="history-format">{item.format}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-exports">
              <div className="no-exports-icon">📦</div>
              <div className="no-exports-text">No exports yet</div>
              <div className="no-exports-subtitle">
                Create your first data export
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .data-export-panel {
          background: rgba(22, 32, 38, 0.85);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(96, 160, 255, 0.3);
          padding-bottom: var(--spacing-xs);
        }

        .panel-icon {
          font-size: 16px;
          filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.5));
        }

        .export-config-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .config-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .config-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .format-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-xs);
        }

        .format-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .format-button.active {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: white;
        }

        .format-button:hover:not(:disabled):not(.active) {
          background: rgba(96, 160, 255, 0.2);
          border-color: rgba(96, 160, 255, 0.4);
        }

        .format-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .format-icon {
          font-size: 12px;
        }

        .options-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .option-checkbox {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 11px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .option-label {
          font-weight: 500;
        }

        .export-summary {
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
        }

        .summary-title {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-label {
          font-size: 11px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .summary-value {
          font-size: 11px;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-weight: 600;
        }

        .export-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          background: var(--color-running);
          border: 1px solid var(--color-running);
          border-radius: var(--radius-sm);
          padding: var(--spacing-md);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-button:hover:not(:disabled) {
          background: rgba(0, 255, 136, 0.8);
          box-shadow: 0 0 12px rgba(0, 255, 136, 0.3);
        }

        .export-button:disabled {
          background: var(--color-disabled);
          border-color: var(--color-disabled);
          cursor: not-allowed;
        }

        .export-button.exporting {
          background: var(--color-warning);
          border-color: var(--color-warning);
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        .export-icon {
          font-size: 16px;
        }

        .section-title {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .export-history-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          max-height: 200px;
          overflow-y: auto;
        }

        .history-item {
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .history-filename {
          font-size: 11px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .history-actions {
          display: flex;
          gap: var(--spacing-xs);
        }

        .download-button {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: var(--radius-sm);
          padding: 2px 4px;
          color: var(--color-running);
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .download-button:hover {
          background: rgba(0, 255, 136, 0.3);
          border-color: var(--color-running);
        }

        .history-details {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 10px;
          color: var(--color-text-dim);
          font-family: var(--font-mono);
        }

        .history-separator {
          color: var(--color-border);
        }

        .no-exports {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl);
          color: var(--color-text-secondary);
        }

        .no-exports-icon {
          font-size: 32px;
          opacity: 0.5;
          margin-bottom: var(--spacing-sm);
        }

        .no-exports-text {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .no-exports-subtitle {
          font-size: 12px;
          opacity: 0.7;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .format-selector {
            grid-template-columns: 1fr;
          }

          .summary-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .history-item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .history-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .history-separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DataExportPanel;
