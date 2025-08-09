import React, { useState, useEffect, useMemo } from 'react';
import { logService, SystemLog, LogFilter } from '../../services/logService';
import './LogsPage.css';

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');
  const [dateRange, setDateRange] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPassword, setSelectedPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const logsPerPage = 50;

  // Get filter dates based on selected range
  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'Today':
        return { 
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'Yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { 
          startDate: yesterday.toISOString(),
          endDate: today.toISOString()
        };
      case 'This Week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { 
          startDate: weekStart.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'This Month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { 
          startDate: monthStart.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      default:
        return {};
    }
  };

  // Fetch logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const dateFilter = getDateFilter();
        const filter: LogFilter = {
          ...dateFilter,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          result: resultFilter !== 'All' ? resultFilter : undefined,
          searchTerm: searchTerm || undefined,
          page: currentPage,
          pageSize: logsPerPage
        };

        const [logsData, count] = await Promise.all([
          logService.getLogs(filter),
          logService.getLogCount(filter)
        ]);

        setLogs(logsData);
        setTotalCount(count);
      } catch (error) {
        console.error('Error fetching logs:', error);
        // Fallback to empty array if API fails
        setLogs([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [categoryFilter, resultFilter, dateRange, searchTerm, currentPage, refreshTrigger]);

  // Get unique categories and results
  const categories = ['All', ...logService.getCategories()];
  const results = ['All', ...logService.getResultTypes()];

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / logsPerPage);

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const dateFilter = getDateFilter();
      const filter: LogFilter = {
        ...dateFilter,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        result: resultFilter !== 'All' ? resultFilter : undefined,
        searchTerm: searchTerm || undefined
      };

      const blob = await logService.exportLogs(filter);
      if (blob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  };

  // Delete logs
  const handleDeleteLogs = async () => {
    if (selectedPassword === 'admin123') {
      try {
        const success = await logService.deleteLogs();
        if (success) {
          console.log('Logs deleted successfully');
          setShowDeleteModal(false);
          setSelectedPassword('');
          setRefreshTrigger(prev => prev + 1); // Trigger refresh
        } else {
          alert('Failed to delete logs');
        }
      } catch (error) {
        console.error('Error deleting logs:', error);
        alert('Error deleting logs');
      }
    } else {
      alert('Incorrect password!');
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'SUCCESS': return '✅';
      case 'ERROR': return '❌';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      default: return '❓';
    }
  };

  const getResultClass = (result: string) => {
    switch (result) {
      case 'SUCCESS': return 'result-success';
      case 'ERROR': return 'result-error';
      case 'WARNING': return 'result-warning';
      case 'INFO': return 'result-info';
      default: return 'result-unknown';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AUTH': return '🔐';
      case 'USER_MGMT': return '👤';
      case 'CALIBRATION': return '⚖️';
      case 'SYSTEM': return '⚙️';
      case 'MAINTENANCE': return '🔧';
      case 'ALARM': return '🚨';
      case 'CONFIG': return '⚙️';
      case 'AUDIT': return '📋';
      case 'OPC': return '🔌';
      case 'BACKUP': return '💾';
      case 'SECURITY': return '🛡️';
      default: return '📄';
    }
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="page-title">
          <span className="title-icon">📋</span>
          <h2>System Logs</h2>
          <div className="logs-count">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>Showing {logs.length} of {totalCount} logs</span>
            )}
          </div>
        </div>

        <div className="logs-actions">
          <button className="export-btn" onClick={handleExportCSV} disabled={loading}>
            📁 Export CSV
          </button>
          <button 
            className="delete-btn" 
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Date Range</label>
            <select 
              value={dateRange} 
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Result</label>
            <select 
              value={resultFilter} 
              onChange={(e) => {
                setResultFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {results.map(result => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('All');
              setResultFilter('All');
              setDateRange('Today');
              setCurrentPage(1);
            }}
          >
            🔄 Clear Filters
          </button>

          <button 
            className="refresh-btn"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">⏳</div>
            <div>Loading logs...</div>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Category</th>
                <th>Action</th>
                <th>Target</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className={`log-row ${getResultClass(log.result)}`}>
                  <td className="timestamp">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </td>
                  <td className="user">
                    <span className="user-badge">{log.username}</span>
                  </td>
                  <td className="category">
                    <span className="category-badge">
                      {getCategoryIcon(log.category)} {log.category}
                    </span>
                  </td>
                  <td className="action">{log.action}</td>
                  <td className="target">{log.target || '-'}</td>
                  <td className="old-value">{log.oldValue || '-'}</td>
                  <td className="new-value">{log.newValue || '-'}</td>
                  <td className="result">
                    <span className={`result-badge ${getResultClass(log.result)}`}>
                      {getResultIcon(log.result)} {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && logs.length === 0 && (
          <div className="no-logs">
            <span className="no-logs-icon">📋</span>
            <span className="no-logs-text">No logs found matching current filters</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
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
              let pageNum = currentPage - 2 + i;
              if (pageNum < 1) pageNum = 1 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              if (pageNum < 1 || pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            }).filter(Boolean)}
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