import { apiClient } from './api';

export interface SystemLog {
  id: number;
  timestamp: string;
  userId?: number;
  username: string;
  category: string;
  action: string;
  target?: string;
  oldValue?: string;
  newValue?: string;
  result: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  details?: string;
}

export interface LogFilter {
  startDate?: string;
  endDate?: string;
  username?: string;
  category?: string;
  action?: string;
  result?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export const logService = {
  // Get logs with filters
  async getLogs(filter: LogFilter = {}): Promise<SystemLog[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      // Only add non-empty filter parameters
      if (filter.username) params.append('username', filter.username);
      if (filter.category) params.append('category', filter.category);
      if (filter.action) params.append('action', filter.action);
      if (filter.result) params.append('result', filter.result);
      if (filter.searchTerm) params.append('searchTerm', filter.searchTerm);
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.pageSize) params.append('pageSize', filter.pageSize.toString());

      const response = await apiClient.get(`/logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  },

  // Get log count  
  async getLogCount(filter: LogFilter = {}): Promise<number> {
    try {
      const params = new URLSearchParams();
      
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      // Only add non-empty filter parameters
      if (filter.username) params.append('username', filter.username);
      if (filter.category) params.append('category', filter.category);
      if (filter.action) params.append('action', filter.action);
      if (filter.result) params.append('result', filter.result);
      if (filter.searchTerm) params.append('searchTerm', filter.searchTerm);

      const response = await apiClient.get(`/logs/count?${params.toString()}`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Error fetching log count:', error);
      return 0;
    }
  },

  // Export logs to CSV
  async exportLogs(filter: LogFilter = {}): Promise<Blob | null> {
    try {
      const params = new URLSearchParams();
      
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      // Only add non-empty filter parameters
      if (filter.username) params.append('username', filter.username);
      if (filter.category) params.append('category', filter.category);
      if (filter.action) params.append('action', filter.action);
      if (filter.result) params.append('result', filter.result);
      if (filter.searchTerm) params.append('searchTerm', filter.searchTerm);

      const response = await apiClient.get(`/logs/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  },

  // Delete logs
  async deleteLogs(beforeDate?: string): Promise<boolean> {
    try {
      const params = beforeDate ? { beforeDate } : {};
      const response = await apiClient.delete('/logs', { params });
      return response.data.success === true;
    } catch (error) {
      console.error('Error deleting logs:', error);
      return false;
    }
  },

  // Get unique categories
  getCategories(): string[] {
    return [
      'AUTH',
      'USER_MGMT',
      'CALIBRATION',
      'SYSTEM',
      'MAINTENANCE',
      'ALARM',
      'CONFIG',
      'AUDIT',
      'OPC',
      'CONNECTION', // 🔗 OPC UA Connection events
      'BACKUP',
      'SECURITY'
    ];
  },

  // Get result types
  getResultTypes(): string[] {
    return ['SUCCESS', 'ERROR', 'WARNING', 'INFO'];
  }
};