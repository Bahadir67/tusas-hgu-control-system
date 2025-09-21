import React, { useEffect, useState } from 'react';
import './MaintenanceHistoryDisplay.css';

interface MaintenanceRecord {
  Id: number;
  MotorId: number;
  TechnicianId: string;
  MaintenanceType: string;
  Description: string;
  OperatingHoursAtMaintenance: number;
  MaintenanceDate: string;
  CreatedAt: string;
  Status: string;
  FormattedDate: string;
}

interface MaintenanceHistoryResponse {
  motorId: number;
  history: MaintenanceRecord[];
  count: number;
  timestamp: string;
}

interface MaintenanceHistoryDisplayProps {
  motorId: number;
  refreshTrigger?: number; // Used to trigger refresh after new maintenance entry
}

export const MaintenanceHistoryDisplay: React.FC<MaintenanceHistoryDisplayProps> = ({ 
  motorId, 
  refreshTrigger = 0 
}) => {
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get authentication token from localStorage (optional for history viewing)
      const token = localStorage.getItem('auth_token');
      
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json'
      };
      
      // Include auth token if available (for logging endpoint that requires auth)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`http://localhost:5000/api/maintenance/history/${motorId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(`Failed to fetch maintenance history: ${response.status} ${response.statusText}`);
      }

      const data: MaintenanceHistoryResponse = await response.json();
      setHistory(data.history || []);
      
    } catch (err) {
      console.error('Error fetching maintenance history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [motorId, refreshTrigger]); // Refresh when motorId or refreshTrigger changes

  const getMaintenanceTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'routine': return '📋';
      case 'filter': return '🔽';
      case 'calibration': return '⚙️';
      case 'inspection': return '🔍';
      case 'lubrication': return '🛢️';
      case 'testing': return '🧪';
      case 'emergency': return '🚨';
      default: return '🔧';
    }
  };

  const getMaintenanceTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'routine': return '#06b6d4';
      case 'filter': return '#8b5cf6';
      case 'calibration': return '#f59e0b';
      case 'inspection': return '#10b981';
      case 'lubrication': return '#3b82f6';
      case 'testing': return '#6366f1';
      case 'emergency': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatMaintenanceType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="maintenance-history-loading">
        <div className="loading-spinner"></div>
        <span>Loading maintenance history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="maintenance-history-error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">
          <h4>Failed to load maintenance history</h4>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={fetchHistory}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-history-container">
      <div className="history-header">
        <h4>
          <span className="history-icon">📜</span>
          Maintenance History
        </h4>
        <div className="history-stats">
          <span className="record-count">{history.length} records</span>
          <button 
            className="refresh-button"
            onClick={fetchHistory}
            title="Refresh history"
          >
            🔄
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="no-history">
          <div className="no-history-icon">📋</div>
          <h5>No Maintenance Records</h5>
          <p>No maintenance activities have been logged for this motor yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((record) => (
            <div key={record.Id} className="history-record">
              <div className="record-header">
                <div className="record-type">
                  <span 
                    className="type-icon"
                    style={{ color: getMaintenanceTypeColor(record.MaintenanceType) }}
                  >
                    {getMaintenanceTypeIcon(record.MaintenanceType)}
                  </span>
                  <span 
                    className="type-name"
                    style={{ color: getMaintenanceTypeColor(record.MaintenanceType) }}
                  >
                    {formatMaintenanceType(record.MaintenanceType)}
                  </span>
                </div>
                <div className="record-date">
                  {record.FormattedDate}
                </div>
              </div>

              <div className="record-details">
                <div className="detail-row">
                  <span className="detail-label">Technician:</span>
                  <span className="detail-value">{record.TechnicianId}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Operating Hours:</span>
                  <span className="detail-value">
                    {record.OperatingHoursAtMaintenance?.toFixed(1) || 'N/A'} hrs
                  </span>
                </div>

                {record.Description && (
                  <div className="detail-row description">
                    <span className="detail-label">Description:</span>
                    <span className="detail-value">{record.Description}</span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-${record.Status.toLowerCase()}`}>
                    {record.Status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceHistoryDisplay;