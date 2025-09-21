import React, { useState } from 'react';

interface QueryHistoryItem {
  id: number;
  query: string;
  timestamp: Date;
  duration: string;
  results: number;
}

interface QueryManagementPanelProps {
  queryHistory: QueryHistoryItem[];
  onExecuteQuery: (query: string) => void;
}

const QueryManagementPanel: React.FC<QueryManagementPanelProps> = ({
  queryHistory,
  onExecuteQuery
}) => {
  const [currentQuery, setCurrentQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const predefinedQueries = [
    {
      name: 'Last Hour Motor Data',
      query: 'SELECT pressure, flow, temperature FROM motor_data WHERE time > now() - 1h',
      description: 'All motor metrics from last hour'
    },
    {
      name: 'System Efficiency Trend',
      query: 'SELECT mean(efficiency) FROM system_metrics WHERE time > now() - 24h GROUP BY time(1h)',
      description: 'Hourly efficiency averages for 24h'
    },
    {
      name: 'High Pressure Events',
      query: 'SELECT * FROM motor_data WHERE pressure > 300 AND time > now() - 7d',
      description: 'Pressure events above 300 bar in last week'
    },
    {
      name: 'Motor Performance Summary',
      query: 'SELECT motor_id, mean(pressure), mean(flow), mean(temperature) FROM motor_data WHERE time > now() - 1d GROUP BY motor_id',
      description: 'Daily averages per motor'
    },
    {
      name: 'Tank Level History',
      query: 'SELECT tank_level, oil_temperature FROM system_metrics WHERE time > now() - 6h',
      description: 'Tank and temperature data for 6 hours'
    }
  ];

  const handleExecuteQuery = async () => {
    if (!currentQuery.trim() || isExecuting) return;

    setIsExecuting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate query execution
      onExecuteQuery(currentQuery);
      setCurrentQuery('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePredefinedQuery = (query: string) => {
    setCurrentQuery(query);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatQueryDisplay = (query: string) => {
    // Truncate long queries for display
    return query.length > 80 ? query.substring(0, 80) + '...' : query;
  };

  return (
    <div className="query-management-panel">
      <h3 className="panel-title">
        <span className="panel-icon">🔍</span>
        Query Management
      </h3>

      {/* Query Input */}
      <div className="query-input-section">
        <div className="query-input-header">
          <label className="input-label">InfluxQL Query:</label>
          <div className="query-actions">
            <button
              className="clear-button"
              onClick={() => setCurrentQuery('')}
              disabled={!currentQuery || isExecuting}
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          className="query-textarea"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          placeholder="Enter InfluxQL query (e.g., SELECT * FROM motor_data WHERE time > now() - 1h)"
          rows={3}
          disabled={isExecuting}
        />
        <div className="query-input-footer">
          <div className="query-hint">
            Tip: Use time filters like "time &gt; now() - 1h" for better performance
          </div>
          <button
            className={`execute-button ${isExecuting ? 'executing' : ''}`}
            onClick={handleExecuteQuery}
            disabled={!currentQuery.trim() || isExecuting}
          >
            {isExecuting ? (
              <>
                <span className="loading-spinner">⟳</span>
                Executing...
              </>
            ) : (
              <>
                <span className="execute-icon">▶️</span>
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      {/* Predefined Queries */}
      <div className="predefined-queries-section">
        <h4 className="section-title">Quick Queries:</h4>
        <div className="predefined-queries-grid">
          {predefinedQueries.map((item, index) => (
            <div key={index} className="predefined-query-item">
              <div className="query-item-header">
                <span className="query-name">{item.name}</span>
                <button
                  className="use-query-button"
                  onClick={() => handlePredefinedQuery(item.query)}
                  disabled={isExecuting}
                >
                  Use
                </button>
              </div>
              <div className="query-description">{item.description}</div>
              <div className="query-preview">
                {formatQueryDisplay(item.query)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query History */}
      <div className="query-history-section">
        <h4 className="section-title">Recent Queries:</h4>
        <div className="query-history-list">
          {queryHistory.length > 0 ? (
            queryHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-header">
                  <span className="history-timestamp">
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <div className="history-stats">
                    <span className="history-duration">{item.duration}</span>
                    <span className="history-separator">•</span>
                    <span className="history-results">{item.results} rows</span>
                  </div>
                  <button
                    className="rerun-button"
                    onClick={() => handlePredefinedQuery(item.query)}
                    disabled={isExecuting}
                    title="Run this query again"
                  >
                    ↻
                  </button>
                </div>
                <div className="history-query">
                  {formatQueryDisplay(item.query)}
                </div>
              </div>
            ))
          ) : (
            <div className="no-history">
              <div className="no-history-icon">📜</div>
              <div className="no-history-text">No query history yet</div>
              <div className="no-history-subtitle">
                Execute queries to see them here
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .query-management-panel {
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
          filter: drop-shadow(0 0 4px rgba(0, 153, 255, 0.5));
        }

        .query-input-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .query-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .query-actions {
          display: flex;
          gap: var(--spacing-xs);
        }

        .clear-button {
          background: rgba(255, 107, 53, 0.2);
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
          color: #ff6b35;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-button:hover:not(:disabled) {
          background: rgba(255, 107, 53, 0.3);
          border-color: #ff6b35;
        }

        .clear-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .query-textarea {
          background: rgba(15, 20, 25, 0.8);
          border: 1px solid rgba(96, 160, 255, 0.3);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-size: 12px;
          resize: vertical;
          min-height: 60px;
        }

        .query-textarea:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px rgba(0, 153, 255, 0.2);
        }

        .query-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .query-input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .query-hint {
          font-size: 10px;
          color: var(--color-text-dim);
          font-style: italic;
        }

        .execute-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: var(--color-accent);
          border: 1px solid var(--color-accent);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .execute-button:hover:not(:disabled) {
          background: var(--color-accent-hover);
          box-shadow: 0 0 8px rgba(0, 153, 255, 0.3);
        }

        .execute-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .execute-button.executing {
          background: var(--color-warning);
          border-color: var(--color-warning);
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        .section-title {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .predefined-queries-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .predefined-query-item {
          background: rgba(15, 20, 25, 0.6);
          border: 1px solid rgba(96, 160, 255, 0.2);
          border-radius: var(--radius-sm);
          padding: var(--spacing-sm);
        }

        .query-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .query-name {
          font-size: 12px;
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .use-query-button {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
          color: var(--color-running);
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .use-query-button:hover:not(:disabled) {
          background: rgba(0, 255, 136, 0.3);
          border-color: var(--color-running);
        }

        .use-query-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .query-description {
          font-size: 10px;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .query-preview {
          font-size: 10px;
          color: var(--color-text-dim);
          font-family: var(--font-mono);
          background: rgba(0, 0, 0, 0.3);
          padding: var(--spacing-xs);
          border-radius: 2px;
          border-left: 2px solid rgba(0, 153, 255, 0.3);
        }

        .query-history-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          max-height: 300px;
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

        .history-timestamp {
          font-size: 11px;
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          font-weight: 600;
        }

        .history-stats {
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

        .rerun-button {
          background: rgba(96, 160, 255, 0.2);
          border: 1px solid rgba(96, 160, 255, 0.3);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
          color: var(--color-accent);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rerun-button:hover:not(:disabled) {
          background: rgba(96, 160, 255, 0.3);
          border-color: var(--color-accent);
        }

        .rerun-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .history-query {
          font-size: 10px;
          color: var(--color-text-dim);
          font-family: var(--font-mono);
          background: rgba(0, 0, 0, 0.3);
          padding: var(--spacing-xs);
          border-radius: 2px;
          border-left: 2px solid rgba(0, 255, 136, 0.3);
        }

        .no-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl);
          color: var(--color-text-secondary);
        }

        .no-history-icon {
          font-size: 32px;
          opacity: 0.5;
          margin-bottom: var(--spacing-sm);
        }

        .no-history-text {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .no-history-subtitle {
          font-size: 12px;
          opacity: 0.7;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .query-input-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .history-item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .history-stats {
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

export default QueryManagementPanel;
