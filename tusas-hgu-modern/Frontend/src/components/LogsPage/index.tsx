import React, { useState, useEffect } from 'react';
import './LogsPage.css';

interface SystemLog {
  id: number;
  timestamp: string;
  username: string;
  category: string;
  action: string;
  target?: string;
  result: string;
  ipAddress?: string;
  details?: string;
}

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs function
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Make API request
      const response = await fetch('http://localhost:5000/api/logs?page=1&pageSize=50', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
          // Redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_expires');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setLogs(data.data);
      } else {
        setError('Invalid response format');
      }
      
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  // Load logs on component mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Refresh function
  const handleRefresh = () => {
    fetchLogs();
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  // Get status badge color
  const getStatusColor = (result: string) => {
    switch (result.toUpperCase()) {
      case 'SUCCESS': return 'green';
      case 'ERROR': return 'red';
      case 'WARNING': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h1>System Logs</h1>
        <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>❌ Error: {error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-message">
          <span>🔄 Loading logs...</span>
        </div>
      )}

      {!loading && !error && (
        <div className="logs-container">
          <div className="logs-count">
            <span>📊 Total logs: {logs.length}</span>
          </div>

          <div className="logs-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Category</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Result</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>{log.username}</td>
                    <td>
                      <span className={`category-badge category-${log.category.toLowerCase()}`}>
                        {log.category}
                      </span>
                    </td>
                    <td>{log.action}</td>
                    <td>{log.target || '-'}</td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(log.result) }}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td>{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="no-logs">
              <span>📝 No logs found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};