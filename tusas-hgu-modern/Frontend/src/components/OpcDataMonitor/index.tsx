import React, { useState, useEffect } from 'react';
import { opcApiService, OpcBatchResponse } from '../../services/opcApiService';
import { MOTOR_VARIABLES, SYSTEM_VARIABLES, OpcVariableDefinition } from '../../utils/opcVariableMapping';
import './OpcDataMonitor.css';

interface OpcVariableDisplay {
  variableName: string;
  displayName: string;
  value: any;
  quality: string;
  timestamp: string;
  unit?: string;
  category: 'motor' | 'system';
  motorId?: number;
}

const OpcDataMonitor: React.FC = () => {
  const [opcData, setOpcData] = useState<OpcVariableDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'motor' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch OPC data
  const fetchOpcData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: OpcBatchResponse = await opcApiService.getAllVariables();

      if (response.success && response.variables) {
        const displayData: OpcVariableDisplay[] = [];

        // Process motor variables
        MOTOR_VARIABLES.forEach(motorVar => {
          for (let motorId = 1; motorId <= 7; motorId++) {
            const variableName = motorVar.opcVariableName.replace('X', motorId.toString());
            const opcData = response.variables[variableName];

            if (opcData) {
              displayData.push({
                variableName,
                displayName: `${motorVar.displayName} (Motor ${motorId})`,
                value: opcData.value,
                quality: opcData.quality,
                timestamp: opcData.timestamp,
                unit: motorVar.unit,
                category: 'motor',
                motorId
              });
            }
          }
        });

        // Process system variables
        SYSTEM_VARIABLES.forEach(systemVar => {
          const opcData = response.variables[systemVar.opcVariableName];

          if (opcData) {
            displayData.push({
              variableName: systemVar.opcVariableName,
              displayName: systemVar.displayName,
              value: opcData.value,
              quality: opcData.quality,
              timestamp: opcData.timestamp,
              unit: systemVar.unit,
              category: 'system'
            });
          }
        });

        setOpcData(displayData);
        setLastUpdate(new Date());
      } else {
        setError(response.errors?.join(', ') || 'Failed to fetch OPC data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchOpcData();

    const interval = setInterval(fetchOpcData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter and search data
  const filteredData = opcData.filter(item => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const matchesSearch = item.variableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get quality status color
  const getQualityColor = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'good': return '#7ed321';
      case 'bad': return '#d0021b';
      case 'uncertain': return '#f5a623';
      default: return '#9b9b9b';
    }
  };

  // Format value for display
  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined) return 'N/A';

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (typeof value === 'number') {
      if (unit === '%' || unit === 'C' || unit === 'A') {
        return value.toFixed(1);
      }
      if (unit === 'Bar' || unit === 'L/Min' || unit === 'RPM') {
        return value.toFixed(1);
      }
      if (unit === 'hours') {
        return value.toFixed(0);
      }
      return value.toString();
    }

    return String(value);
  };

  return (
    <div className="opc-data-monitor">
      <div className="monitor-header">
        <div className="header-title">
          <h2>OPC Data Monitor</h2>
          <div className="header-subtitle">
            Real-time OPC UA Variable Monitoring
          </div>
        </div>

        <div className="header-controls">
          <div className="filter-controls">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'motor' | 'system')}
              className="filter-select"
            >
              <option value="all">All Variables</option>
              <option value="motor">Motor Variables</option>
              <option value="system">System Variables</option>
            </select>

            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="status-info">
            <button
              onClick={fetchOpcData}
              disabled={isLoading}
              className="refresh-button"
            >
              {isLoading ? '🔄' : '🔄'} Refresh
            </button>

            {lastUpdate && (
              <div className="last-update">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="data-table-container">
        <table className="opc-data-table">
          <thead>
            <tr>
              <th className="col-display">Variable</th>
              <th className="col-status">Status</th>
              <th className="col-value">Value</th>
              <th className="col-unit">Unit</th>
              <th className="col-timestamp">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={`${item.variableName}-${index}`} className={item.category}>
                <td className="col-display">{item.displayName}</td>
                <td className="col-status">
                  <div className="status-indicator">
                    <div
                      className="status-dot"
                      style={{ backgroundColor: getQualityColor(item.quality) }}
                    ></div>
                    <span className="status-text">{item.quality}</span>
                  </div>
                </td>
                <td className="col-value">
                  <span className="value-text">
                    {formatValue(item.value, item.unit)}
                  </span>
                </td>
                <td className="col-unit">{item.unit || '-'}</td>
                <td className="col-timestamp">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && !isLoading && (
          <div className="no-data">
            <span className="no-data-icon">📊</span>
            <div className="no-data-text">
              {searchTerm ? 'No variables match your search' : 'No OPC data available'}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Fetching OPC data...</div>
          </div>
        )}
      </div>

      <div className="monitor-footer">
        <div className="stats-info">
          <span className="stats-item">
            Total Variables: {opcData.length}
          </span>
          <span className="stats-item">
            Motor Variables: {opcData.filter(item => item.category === 'motor').length}
          </span>
          <span className="stats-item">
            System Variables: {opcData.filter(item => item.category === 'system').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpcDataMonitor;