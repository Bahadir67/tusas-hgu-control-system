import React, { useState, useEffect } from 'react';
import { LogsPageEnhanced } from './LogsPageEnhanced';
import './LogsPageEnhanced.css';

// Mock data for demonstration
const generateMockLogs = () => {
  const categories = ['AUTH', 'SYSTEM', 'MOTOR', 'AUDIT', 'ERROR', 'ALARM', 'CONFIG', 'OPC', 'MAINTENANCE', 'BACKUP'];
  const actions = ['LOGIN', 'LOGOUT', 'MOTOR_START', 'MOTOR_STOP', 'CALIBRATION', 'CONFIG_CHANGE', 'ALARM_ACK', 'BACKUP_CREATED'];
  const users = ['operator1', 'admin', 'maintenance', 'system', 'engineer1'];
  const results = ['SUCCESS', 'ERROR', 'WARNING', 'INFO'];
  const targets = ['MOTOR_1', 'MOTOR_2', 'MOTOR_3', 'SYSTEM_CONFIG', 'USER_ACCOUNT', 'OPC_SERVER'];
  
  const logs = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now.getTime() - (i * 15 * 60 * 1000)); // Every 15 minutes
    const category = categories[Math.floor(Math.random() * categories.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const result = results[Math.floor(Math.random() * results.length)];
    const target = targets[Math.floor(Math.random() * targets.length)];
    
    logs.push({
      id: i + 1,
      timestamp: timestamp.toISOString(),
      userId: Math.floor(Math.random() * 10) + 1,
      username: user,
      category,
      action,
      target,
      oldValue: result === 'SUCCESS' && Math.random() > 0.7 ? 'OFF' : undefined,
      newValue: result === 'SUCCESS' && Math.random() > 0.7 ? 'ON' : undefined,
      result,
      errorMessage: result === 'ERROR' ? `${action} operation failed on ${target}` : undefined,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      duration: Math.floor(Math.random() * 5000) + 100,
      details: `${action} performed by ${user} on ${target} - ${result.toLowerCase()}`
    });
  }
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Override logService for demo
const mockLogService = {
  getLogs: async (filters: any = {}) => {
    const allLogs = generateMockLogs();
    let filteredLogs = allLogs;
    
    // Apply filters
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    if (filters.username) {
      filteredLogs = filteredLogs.filter(log => log.username === filters.username);
    }
    if (filters.result) {
      filteredLogs = filteredLogs.filter(log => log.result === filters.result);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(term) ||
        log.target.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        log.details?.toLowerCase().includes(term)
      );
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    
    return filteredLogs.slice(startIndex, endIndex);
  },
  
  getLogCount: async (filters: any = {}) => {
    const allLogs = generateMockLogs();
    let filteredLogs = allLogs;
    
    // Apply same filters as getLogs
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    if (filters.username) {
      filteredLogs = filteredLogs.filter(log => log.username === filters.username);
    }
    if (filters.result) {
      filteredLogs = filteredLogs.filter(log => log.result === filters.result);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(term) ||
        log.target.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        log.details?.toLowerCase().includes(term)
      );
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
    
    return filteredLogs.length;
  },
  
  exportLogs: async (filters: any = {}) => {
    const logs = await mockLogService.getLogs(filters);
    
    const csvContent = [
      'Timestamp,Username,Category,Action,Target,Result,IP Address,Details',
      ...logs.map(log => 
        `"${log.timestamp}","${log.username}","${log.category}","${log.action}","${log.target || ''}","${log.result}","${log.ipAddress || ''}","${log.details || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  },
  
  getCategories: () => [
    'AUTH', 'USER_MGMT', 'CALIBRATION', 'SYSTEM', 'MAINTENANCE', 
    'ALARM', 'CONFIG', 'AUDIT', 'OPC', 'BACKUP', 'SECURITY', 'MOTOR'
  ],
  
  getResultTypes: () => ['SUCCESS', 'ERROR', 'WARNING', 'INFO']
};

// Mock the logService module
(window as any).mockLogService = mockLogService;

export const LogsDemo: React.FC = () => {
  const [demoMode, setDemoMode] = useState(true);
  
  useEffect(() => {
    // Override the logService for demo
    if (demoMode) {
      const originalModule = require('../../services/logService');
      Object.assign(originalModule.logService, mockLogService);
    }
  }, [demoMode]);
  
  return (
    <div>
      <div style={{ 
        padding: '16px', 
        background: 'rgba(0, 212, 255, 0.1)', 
        border: '1px solid rgba(0, 212, 255, 0.3)', 
        borderRadius: '8px', 
        marginBottom: '16px',
        color: '#00d4ff'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>🚀 Demo Mode - Enhanced SCADA Log Viewer</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          This is a demonstration with mock data showing all the professional SCADA/HMI features:
          advanced filtering, real-time updates, export capabilities, and industrial styling.
        </p>
        <button 
          onClick={() => setDemoMode(!demoMode)}
          style={{
            marginTop: '8px',
            padding: '4px 12px',
            background: 'rgba(0, 212, 255, 0.2)',
            border: '1px solid rgba(0, 212, 255, 0.5)',
            borderRadius: '4px',
            color: '#00d4ff',
            cursor: 'pointer'
          }}
        >
          {demoMode ? 'Switch to Live Data' : 'Switch to Demo Mode'}
        </button>
      </div>
      
      <LogsPageEnhanced />
    </div>
  );
};