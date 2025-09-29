import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './LogsPageEnhanced.css';

interface SystemLog {
  id: number;
  timestamp: string;
  username: string;
  category: string;
  action: string;
  target?: string;
  oldValue?: string;
  newValue?: string;
  result: string;
  ipAddress?: string;
  details?: string;
  errorMessage?: string;
}

interface LogFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  username?: string;
  action?: string;
  result?: string;
  searchTerm?: string;
  page: number;
  pageSize: number;
}

// Time range options
const TIME_RANGES = {
  ALL: { label: 'All Time', days: null },
  TODAY: { label: 'Today', days: 0 },
  LAST_24H: { label: 'Last 24 Hours', days: 1 },
  LAST_WEEK: { label: 'Last Week', days: 7 },
  LAST_MONTH: { label: 'Last Month', days: 30 }
};

// Default category configurations (fallback when API fails)
const DEFAULT_CATEGORY_CONFIG = {
  color: '#6b7280',
  icon: '📄',
  label: 'Unknown'
};

// Category color and icon mapping
const CATEGORY_STYLES = {
  AUTH: { color: '#a78bfa', icon: '🔐' },
  USER_MGMT: { color: '#8b5cf6', icon: '👥' },
  CALIBRATION: { color: '#f59e0b', icon: '🎯' },
  SYSTEM: { color: '#60a5fa', icon: '⚙️' },
  MAINTENANCE: { color: '#34d399', icon: '🔧' },
  ALARM: { color: '#f97316', icon: '🚨' },
  CONFIG: { color: '#06b6d4', icon: '⚙️' },
  AUDIT: { color: '#fbbf24', icon: '📋' },
  OPC: { color: '#10b981', icon: '🔌' },
  CONNECTION: { color: '#8b5cf6', icon: '🔗' }, // 📡 OPC UA Connection events
  BACKUP: { color: '#6b7280', icon: '💾' },
  SECURITY: { color: '#ef4444', icon: '🛡️' }
};

// Action icons
const ACTION_ICONS: Record<string, string> = {
  LOGIN: '🔑',
  LOGOUT: '🚪',
  MOTOR_START: '▶️',
  MOTOR_STOP: '⏹️',
  MOTOR_SPEED_CHANGE: '⚡',
  VALVE_OPEN: '🔓',
  VALVE_CLOSE: '🔒',
  ALARM_TRIGGERED: '🚨',
  ALARM_ACKNOWLEDGED: '✅',
  SETTING_CHANGED: '⚙️',
  EXPORT: '📥',
  VIEW_LOGS: '👁️',
  // 🔗 Connection-specific actions
  CONNECTION_LOST: '🔌',
  CONNECTION_RESTORED: '🔗',
  RECONNECT_ATTEMPT: '🔄',
  RECONNECT_SUCCESS: '✅',
  RECONNECT_FAILED: '❌',
  RECONNECT_ERROR: '💥',
  RECONNECT_EXHAUSTED: '💀',
  HEARTBEAT_CHECK: '❤️',
  HEARTBEAT_FAILED: '💔'
};

export const LogsPageEnhanced: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [tableHeight, setTableHeight] = useState<number>(400);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Refs for measuring components
  const filtersRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  
  // Filter states
  const [filters, setFilters] = useState<LogFilter>({
    page: 1,
    pageSize: 25  // 25 satır default
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  // Connection-specific state
  const [showConnectionLogs, setShowConnectionLogs] = useState(false);
  const [connectionLogsOnly, setConnectionLogsOnly] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token for categories');
        return;
      }

      const response = await fetch('http://localhost:5000/api/logs/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.data || []);
        console.log('✅ Categories loaded from API:', data.data);
      } else {
        console.warn('Failed to fetch categories, using fallback');
        // Fallback to hardcoded categories
        setAvailableCategories(Object.keys(CATEGORY_STYLES));
      }
    } catch (error) {
      console.warn('Categories API error, using fallback:', error);
      setAvailableCategories(Object.keys(CATEGORY_STYLES));
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('pageSize', filters.pageSize.toString());
      
      // Apply time range
      if (selectedTimeRange !== 'ALL') {
        const timeRange = TIME_RANGES[selectedTimeRange as keyof typeof TIME_RANGES];
        if (timeRange.days !== null) {
          const endDate = new Date();
          const startDate = new Date();
          if (timeRange.days === 0) {
            // Today
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
          } else {
            startDate.setDate(startDate.getDate() - timeRange.days);
          }
          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());
        }
      }
      
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedResult !== 'ALL') params.append('result', selectedResult);
      if (selectedUser !== 'ALL') params.append('username', selectedUser);
      if (searchTerm) params.append('searchTerm', searchTerm);

      const response = await fetch(`http://localhost:5000/api/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
          return;
        }
        // Log error details for debugging
        console.error('HTTP Error:', response.status, response.statusText);
        throw new Error(`❌ HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLogs(data.data || []);
      setTotalCount(data.totalCount || 0);
      
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCategory, selectedResult, selectedUser, searchTerm, selectedTimeRange]);

  // Calculate table height using viewport and fixed positioning
  const calculateTableHeight = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const headerHeight = 220; // 50 pixel daha aşağı (170 + 50)
    const filtersHeight = filtersRef.current?.offsetHeight || 80;
    const paginationHeight = paginationRef.current?.offsetHeight || 60;
    const containerPadding = 4; // Container padding
    const margins = 8; // Margins between sections
    
    // Container spans from 170px to bottom of viewport
    const containerHeight = viewportHeight - headerHeight;
    
    // Available space for table (5 satır için yeterli)
    const availableHeight = containerHeight - filtersHeight - paginationHeight - containerPadding - margins;
    const finalHeight = Math.max(availableHeight, 200); // Min height reduced
    
    console.log('🎯 5-row optimized calculation:', {
      viewportHeight,
      headerHeight,
      containerHeight,
      filtersHeight,
      paginationHeight,
      availableHeight,
      finalHeight
    });
    
    setTableHeight(finalHeight);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      calculateTableHeight();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateTableHeight]);

  // Initial calculation and recalculation when components change
  useEffect(() => {
    // Multiple calculations to ensure accuracy as DOM loads
    const timers = [
      setTimeout(() => calculateTableHeight(), 50),   // Quick first pass
      setTimeout(() => calculateTableHeight(), 200),  // After components render
      setTimeout(() => calculateTableHeight(), 500)   // After everything settles
    ];
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [calculateTableHeight, error, logs.length]); // Recalculate when error banner or data changes

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Load logs on mount and filter changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh logic for connection logs
  useEffect(() => {
    if (autoRefresh && connectionLogsOnly) {
      const interval = window.setInterval(() => {
        fetchLogs();
      }, 5000); // 5 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) {
          window.clearInterval(interval);
        }
      };
    } else if (refreshInterval) {
      window.clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, connectionLogsOnly, fetchLogs]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedTimeRange('ALL');
    setSelectedCategory('ALL');
    setSelectedResult('ALL');
    setSelectedUser('ALL');
    setSearchTerm('');
    setFilters({ ...filters, page: 1 });
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Category', 'Action', 'Target', 'Result', 'IP', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString('tr-TR'),
      log.username,
      log.category,
      log.action,
      log.target || '',
      log.result,
      log.ipAddress || '',
      log.details || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.username)));
  }, [logs]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] || '📝';
  };

  // Get category config (dynamic from API + style mapping)
  const getCategoryConfig = (category: string) => {
    const style = CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES] || DEFAULT_CATEGORY_CONFIG;
    return {
      ...style,
      label: category // Use the actual category name from API
    };
  };

  // Get result color
  const getResultColor = (result: string) => {
    switch (result.toUpperCase()) {
      case 'SUCCESS': return '#10b981';
      case 'ERROR': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="logs-page-enhanced">
      {/* Filters */}
      <div className="filters-section" ref={filtersRef}>
        {error && (
          <div className="error-banner">
            <span>❌ {error}</span>
          </div>
        )}
        
        <div className="filter-controls">
          <div className="filter-group">
            <label>Time Range</label>
            <select 
              value={selectedTimeRange} 
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="filter-select"
            >
              {Object.entries(TIME_RANGES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
              disabled={categoriesLoading}
            >
              <option value="ALL">
                {categoriesLoading ? 'Loading...' : 'All Categories'}
              </option>
              {availableCategories.map((category) => {
                const config = getCategoryConfig(category);
                return (
                  <option key={category} value={category}>
                    {config.icon} {config.label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-group">
            <label>User</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Result</label>
            <select 
              value={selectedResult} 
              onChange={(e) => setSelectedResult(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Results</option>
              <option value="SUCCESS">✅ Success</option>
              <option value="ERROR">❌ Error</option>
              <option value="WARNING">⚠️ Warning</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="action-controls">
            <button onClick={clearFilters} className="action-btn">
              🔄 Clear
            </button>
            <button onClick={exportToCSV} className="action-btn">
              📥 Export
            </button>
            <button onClick={fetchLogs} disabled={loading} className="action-btn">
              {loading ? '⏳' : '🔄'} Refresh
            </button>

            {/* 🔗 Connection Logs Toggle */}
            <button
              onClick={() => {
                setConnectionLogsOnly(!connectionLogsOnly);
                if (!connectionLogsOnly) {
                  setSelectedCategory('CONNECTION');
                } else {
                  setSelectedCategory('ALL');
                }
              }}
              className={`action-btn ${connectionLogsOnly ? 'active' : ''}`}
              title="Show only OPC UA connection logs"
            >
              🔗 {connectionLogsOnly ? 'All Logs' : 'Connection Logs'}
            </button>

            {/* 🔄 Auto-refresh Toggle (only for connection logs) */}
            {connectionLogsOnly && (
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`action-btn ${autoRefresh ? 'active' : ''}`}
                title="Auto-refresh connection logs every 5 seconds"
              >
                🔄 {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="logs-table-container" style={{ height: tableHeight }}>
        <div className="table-body-container">
          <table className="logs-table-enhanced">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Timestamp</th>
                <th>Category</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Result</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const categoryConfig = getCategoryConfig(log.category);
                const isExpanded = expandedRows.has(log.id);
                
                return (
                  <React.Fragment key={log.id}>
                    <tr onClick={() => toggleRowExpansion(log.id)}>
                      <td width="40">
                        <span className="expand-icon">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </td>
                      <td>{formatTimestamp(log.timestamp)}</td>
                      <td>
                        <span 
                          className="category-badge"
                          style={{ 
                            backgroundColor: `${categoryConfig.color}20`,
                            color: categoryConfig.color,
                            border: `1px solid ${categoryConfig.color}`
                          }}
                        >
                          {categoryConfig.icon} {log.category}
                        </span>
                      </td>
                      <td>
                        <span className="user-badge">
                          👤 {log.username}
                        </span>
                      </td>
                      <td>
                        <span className="action-text">
                          {getActionIcon(log.action)} {log.action}
                        </span>
                      </td>
                      <td>{log.target || '-'}</td>
                      <td>
                        <span 
                          className="result-badge"
                          style={{ backgroundColor: getResultColor(log.result) }}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td>{log.ipAddress || '-'}</td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={8}>
                          <div className="expanded-content">
                            <div className="detail-item">
                              <span className="detail-label">Full Timestamp:</span>
                              <span className="detail-value">{formatTimestamp(log.timestamp)}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">User ID:</span>
                              <span className="detail-value">{log.id}</span>
                            </div>

                            {log.target && (
                              <div className="detail-item">
                                <span className="detail-label">Target:</span>
                                <span className="detail-value">{log.target}</span>
                              </div>
                            )}

                            {log.oldValue && (
                              <div className="detail-item">
                                <span className="detail-label">Old Value:</span>
                                <span className="detail-value">{log.oldValue}</span>
                              </div>
                            )}
                            
                            {log.newValue && (
                              <div className="detail-item">
                                <span className="detail-label">New Value:</span>
                                <span className="detail-value">{log.newValue}</span>
                              </div>
                            )}

                            {log.ipAddress && (
                              <div className="detail-item">
                                <span className="detail-label">IP Address:</span>
                                <span className="detail-value">{log.ipAddress}</span>
                              </div>
                            )}
                            
                            {log.errorMessage && (
                              <div className="detail-item error">
                                <span className="detail-label">Error Message:</span>
                                <span className="detail-value">{log.errorMessage}</span>
                              </div>
                            )}
                            
                            {log.details && (
                              <div className="detail-item full-width">
                                <span className="detail-label">Additional Details:</span>
                                <span className="detail-value">{log.details}</span>
                              </div>
                            )}

                            {/* Her zaman gösterilecek temel bilgiler */}
                            <div className="detail-item">
                              <span className="detail-label">Action Type:</span>
                              <span className="detail-value">{log.action}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Category:</span>
                              <span className="detail-value">{log.category}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Result Status:</span>
                              <span className="detail-value" style={{ 
                                color: getResultColor(log.result),
                                fontWeight: 'bold'
                              }}>
                                {log.result}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {logs.length === 0 && !loading && (
            <div className="no-logs-message">
              <span>📝 No logs found matching the filters</span>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="pagination-controls" ref={paginationRef}>
        <div className="page-size-control">
          <label>Show</label>
          <select 
            value={filters.pageSize} 
            onChange={(e) => setFilters({...filters, pageSize: Number(e.target.value), page: 1})}
            className="page-size-select"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25 (Default)</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>

        <div className="page-navigation">
          <button 
            onClick={() => setFilters({...filters, page: 1})}
            disabled={filters.page === 1}
            className="page-btn"
          >
            ⏮️ First
          </button>
          <button 
            onClick={() => setFilters({...filters, page: filters.page - 1})}
            disabled={filters.page === 1}
            className="page-btn"
          >
            ◀️ Previous
          </button>
          
          <span className="page-info">
            Page {filters.page} of {Math.ceil(totalCount / filters.pageSize)}
          </span>
          
          <button 
            onClick={() => setFilters({...filters, page: filters.page + 1})}
            disabled={filters.page >= Math.ceil(totalCount / filters.pageSize)}
            className="page-btn"
          >
            Next ▶️
          </button>
          <button 
            onClick={() => {
              if (totalCount === 0) {
                console.log('⚠️ Cannot go to last page: no data available');
                return;
              }
              const calculatedLastPage = Math.ceil(totalCount / filters.pageSize);
              const lastPage = Math.max(1, calculatedLastPage);
              // Debug: Last page calculation
              console.log('Last page:', lastPage, 'from total:', totalCount);
              if (lastPage !== filters.page) {
                setFilters({...filters, page: lastPage});
              }
            }}
            disabled={filters.page >= Math.ceil(totalCount / filters.pageSize) || totalCount === 0}
            className="page-btn"
          >
            Last ⏭️
          </button>
        </div>

        <div className="total-info">
          Showing {((filters.page - 1) * filters.pageSize) + 1} to {Math.min(filters.page * filters.pageSize, totalCount)} of {totalCount} entries
        </div>
      </div>
    </div>
  );
};
