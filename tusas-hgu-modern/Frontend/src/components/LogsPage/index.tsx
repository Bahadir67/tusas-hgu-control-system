import React, { useState, useMemo } from 'react';
import './LogsPage.css';

interface LogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  value: string;
  result: 'SUCCESS' | 'ERROR' | 'WARNING';
}

const LogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');
  const [dateRange, setDateRange] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPassword, setSelectedPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const logsPerPage = 50;

  // Mock log data
  const mockLogs: LogEntry[] = [
    { id: 1, timestamp: '2024-08-07 14:23:45', user: 'Operator1', action: 'CHANGE_SETPOINT', target: 'MOTOR_3_PRESSURE', value: '85', result: 'SUCCESS' },
    { id: 2, timestamp: '2024-08-07 14:22:12', user: 'Remote', action: 'SYSTEM_ENABLE', target: 'MAIN_PUMP', value: '1', result: 'SUCCESS' },
    { id: 3, timestamp: '2024-08-07 14:21:33', user: 'Supervisor', action: 'EMERGENCY_STOP', target: 'MOTOR_5', value: '0', result: 'SUCCESS' },
    { id: 4, timestamp: '2024-08-07 14:20:15', user: 'Operator2', action: 'LEAK_TEST', target: 'MOTOR_2', value: '1', result: 'SUCCESS' },
    { id: 5, timestamp: '2024-08-07 14:19:28', user: 'System', action: 'AUTO_STOP', target: 'MOTOR_5', value: 'High Temperature', result: 'WARNING' },
    { id: 6, timestamp: '2024-08-07 14:18:45', user: 'Technician_01', action: 'FILTER_REPLACE', target: 'MOTOR_1_LINE_FILTER', value: 'Completed', result: 'SUCCESS' },
    { id: 7, timestamp: '2024-08-07 14:17:22', user: 'Operator1', action: 'CALIBRATION', target: 'MOTOR_4_PRESSURE_SENSOR', value: '125.5', result: 'SUCCESS' },
    { id: 8, timestamp: '2024-08-07 14:16:11', user: 'Remote', action: 'CHANGE_SETPOINT', target: 'MOTOR_6_FLOW', value: '78', result: 'SUCCESS' },
    { id: 9, timestamp: '2024-08-07 14:15:33', user: 'System', action: 'ALARM_ACKNOWLEDGE', target: 'HIGH_PRESSURE_ALARM', value: 'Motor 3', result: 'SUCCESS' },
    { id: 10, timestamp: '2024-08-07 14:14:45', user: 'Operator2', action: 'MOTOR_START', target: 'MOTOR_2', value: '1', result: 'SUCCESS' },
    { id: 11, timestamp: '2024-08-07 14:13:12', user: 'Maintenance', action: 'SERVICE_COMPLETE', target: 'MOTOR_7', value: 'Routine Service', result: 'SUCCESS' },
    { id: 12, timestamp: '2024-08-07 14:12:28', user: 'Operator1', action: 'RESET_FAULT', target: 'MOTOR_1', value: 'Overcurrent', result: 'SUCCESS' },
    { id: 13, timestamp: '2024-08-07 14:11:45', user: 'System', action: 'CONNECTION_LOST', target: 'OPC_SERVER', value: 'Timeout', result: 'ERROR' },
    { id: 14, timestamp: '2024-08-07 14:10:33', user: 'Remote', action: 'SYSTEM_SHUTDOWN', target: 'ALL_MOTORS', value: 'Scheduled', result: 'SUCCESS' },
    { id: 15, timestamp: '2024-08-07 14:09:22', user: 'Operator2', action: 'TANK_REFILL', target: 'MAIN_TANK', value: '95%', result: 'SUCCESS' },
    // Add more mock data...
    { id: 16, timestamp: '2024-08-07 13:58:45', user: 'Operator1', action: 'CHANGE_SETPOINT', target: 'MOTOR_1_PRESSURE', value: '120', result: 'SUCCESS' },
    { id: 17, timestamp: '2024-08-07 13:57:12', user: 'System', action: 'AUTO_START', target: 'MOTOR_6', value: 'Schedule', result: 'SUCCESS' },
    { id: 18, timestamp: '2024-08-07 13:56:33', user: 'Technician_02', action: 'SENSOR_CHECK', target: 'MOTOR_3_TEMPERATURE', value: '58.5°C', result: 'SUCCESS' },
    { id: 19, timestamp: '2024-08-07 13:55:28', user: 'Operator2', action: 'VALVE_OPEN', target: 'MOTOR_4_MAIN_VALVE', value: '1', result: 'SUCCESS' },
    { id: 20, timestamp: '2024-08-07 13:54:45', user: 'Remote', action: 'PRESSURE_CHECK', target: 'SYSTEM_TOTAL', value: '125.8 bar', result: 'SUCCESS' },
  ];

  // Get unique values for filters
  const uniqueUsers = ['All', ...Array.from(new Set(mockLogs.map(log => log.user)))];
  const uniqueActions = ['All', ...Array.from(new Set(mockLogs.map(log => log.action)))];
  const uniqueResults = ['All', ...Array.from(new Set(mockLogs.map(log => log.result)))];

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return mockLogs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.value.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser = userFilter === 'All' || log.user === userFilter;
      const matchesAction = actionFilter === 'All' || log.action === actionFilter;
      const matchesResult = resultFilter === 'All' || log.result === resultFilter;

      // Date range filter (simplified for demo)
      const matchesDate = true; // In real implementation, filter by actual date

      return matchesSearch && matchesUser && matchesAction && matchesResult && matchesDate;
    });
  }, [mockLogs, searchTerm, userFilter, actionFilter, resultFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Target', 'Value', 'Result'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.user,
        log.action,
        log.target,
        log.value,
        log.result
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete logs
  const handleDeleteLogs = () => {
    if (selectedPassword === 'admin123') {
      console.log('Deleting logs...');
      setShowDeleteModal(false);
      setSelectedPassword('');
      // In real implementation, call API to delete logs
    } else {
      alert('Incorrect password!');
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'SUCCESS': return '✅';
      case 'ERROR': return '❌';
      case 'WARNING': return '⚠️';
      default: return '❓';
    }
  };

  const getResultClass = (result: string) => {
    switch (result) {
      case 'SUCCESS': return 'result-success';
      case 'ERROR': return 'result-error';
      case 'WARNING': return 'result-warning';
      default: return 'result-unknown';
    }
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="page-title">
          <span className="title-icon">📋</span>
          <h2>System Logs</h2>
          <div className="logs-count">
            Showing {paginatedLogs.length} of {filteredLogs.length} logs
          </div>
        </div>

        <div className="logs-actions">
          <button className="export-btn" onClick={handleExportCSV}>
            📁 Export CSV
          </button>
          <button 
            className="delete-btn" 
            onClick={() => setShowDeleteModal(true)}
          >
            🗑️ Delete Logs
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search logs... (user, action, target, value)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Date Range</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          <div className="filter-group">
            <label>User</label>
            <select 
              value={userFilter} 
              onChange={(e) => setUserFilter(e.target.value)}
              className="filter-select"
            >
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Action Type</label>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)}
              className="filter-select"
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Result</label>
            <select 
              value={resultFilter} 
              onChange={(e) => setResultFilter(e.target.value)}
              className="filter-select"
            >
              {uniqueResults.map(result => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setUserFilter('All');
              setActionFilter('All');
              setResultFilter('All');
              setDateRange('Today');
              setCurrentPage(1);
            }}
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>Value</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map(log => (
              <tr key={log.id} className={`log-row ${getResultClass(log.result)}`}>
                <td className="timestamp">{log.timestamp}</td>
                <td className="user">
                  <span className="user-badge">{log.user}</span>
                </td>
                <td className="action">{log.action}</td>
                <td className="target">{log.target}</td>
                <td className="value">{log.value}</td>
                <td className="result">
                  <span className={`result-badge ${getResultClass(log.result)}`}>
                    {getResultIcon(log.result)} {log.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedLogs.length === 0 && (
          <div className="no-logs">
            <span className="no-logs-icon">📋</span>
            <span className="no-logs-text">No logs found matching current filters</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="pagination-pages">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
              return (
                <button
                  key={pageNum}
                  className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete System Logs</h3>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <p>⚠️ This action will permanently delete all system logs and cannot be undone.</p>
              <p>Enter administrator password to continue:</p>
              <input
                type="password"
                placeholder="Administrator password"
                value={selectedPassword}
                onChange={(e) => setSelectedPassword(e.target.value)}
                className="password-input"
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="confirm-delete-btn" onClick={handleDeleteLogs}>
                🗑️ Delete All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;