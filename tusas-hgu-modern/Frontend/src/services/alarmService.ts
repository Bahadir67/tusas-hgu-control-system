import { authService } from './authService';

// Backend alarm API ile ISA-101 compliant communication
export interface BackendAlarmEntry {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  source: string;
  description: string;
  state: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SHELVED' | 'SUPPRESSED';
  priority: number;
  category: 'PROCESS' | 'SAFETY' | 'EQUIPMENT' | 'COMMUNICATION' | 'SECURITY' | 'MAINTENANCE';
  requiresOperatorAction: boolean;
  consequence?: string;
  correctiveAction?: string;
  acknowledgedTimestamp?: string;
  resolvedTimestamp?: string;
  shelvedTimestamp?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  notes?: string;
  relatedData?: Record<string, any>;
}

export interface AlarmSummary {
  totalActive: number;
  criticalCount: number;
  highCount: number;
  warningCount: number;
  infoCount: number;
  unacknowledgedCount: number;
  lastUpdate: string;
  mostCritical: BackendAlarmEntry[];
}

export interface AlarmFilter {
  severity?: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  state?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SHELVED' | 'SUPPRESSED';
  category?: 'PROCESS' | 'SAFETY' | 'EQUIPMENT' | 'COMMUNICATION' | 'SECURITY' | 'MAINTENANCE';
  source?: string;
  startTime?: string;
  endTime?: string;
  requiresOperatorAction?: boolean;
  maxResults?: number;
  skip?: number;
}

export interface AlarmAcknowledgmentRequest {
  alarmId: string;
  notes?: string;
  acknowledgedBy: string;
}

class AlarmService {
  private baseUrl = 'http://localhost:5000/api/alarm';

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = authService.getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get active alarms with optional filtering
  async getActiveAlarms(filter?: AlarmFilter): Promise<BackendAlarmEntry[]> {
    const params = new URLSearchParams();
    if (filter?.severity) params.append('Severity', filter.severity);
    if (filter?.state) params.append('State', filter.state);
    if (filter?.category) params.append('Category', filter.category);
    if (filter?.source) params.append('Source', filter.source);
    if (filter?.startTime) params.append('StartTime', filter.startTime);
    if (filter?.endTime) params.append('EndTime', filter.endTime);
    if (filter?.requiresOperatorAction !== undefined) {
      params.append('RequiresOperatorAction', filter.requiresOperatorAction.toString());
    }
    if (filter?.maxResults) params.append('MaxResults', filter.maxResults.toString());
    if (filter?.skip) params.append('Skip', filter.skip.toString());

    const queryString = params.toString();
    const endpoint = `/active${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<BackendAlarmEntry[]>(endpoint);
  }

  // Get alarm history with pagination
  async getAlarmHistory(filter?: AlarmFilter): Promise<BackendAlarmEntry[]> {
    const params = new URLSearchParams();
    if (filter?.severity) params.append('Severity', filter.severity);
    if (filter?.state) params.append('State', filter.state);
    if (filter?.category) params.append('Category', filter.category);
    if (filter?.source) params.append('Source', filter.source);
    if (filter?.startTime) params.append('StartTime', filter.startTime);
    if (filter?.endTime) params.append('EndTime', filter.endTime);
    if (filter?.requiresOperatorAction !== undefined) {
      params.append('RequiresOperatorAction', filter.requiresOperatorAction.toString());
    }
    if (filter?.maxResults) params.append('MaxResults', filter.maxResults.toString());
    if (filter?.skip) params.append('Skip', filter.skip.toString());

    const queryString = params.toString();
    const endpoint = `/history${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<BackendAlarmEntry[]>(endpoint);
  }

  // Get alarm summary for dashboard
  async getAlarmSummary(): Promise<AlarmSummary> {
    return this.makeRequest<AlarmSummary>('/summary');
  }

  // Acknowledge an alarm
  async acknowledgeAlarm(request: AlarmAcknowledgmentRequest): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>('/acknowledge', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get alarms by source (motor, system, etc.)
  async getAlarmsBySource(source: string): Promise<BackendAlarmEntry[]> {
    return this.makeRequest<BackendAlarmEntry[]>(`/source/${encodeURIComponent(source)}`);
  }

  // Get alarm statistics by category
  async getAlarmsByCategory(): Promise<Record<string, { 
    Total: number; 
    Critical: number; 
    High: number; 
    Warning: number; 
    Info: number; 
  }>> {
    return this.makeRequest<Record<string, { 
      Total: number; 
      Critical: number; 
      High: number; 
      Warning: number; 
      Info: number; 
    }>>('/categories');
  }

  // Get comprehensive alarm statistics
  async getAlarmStatistics(): Promise<{
    Current: {
      Total: number;
      Critical: number;
      High: number;
      Warning: number;
      Info: number;
    };
    Today: {
      Total: number;
      Resolved: number;
    };
    TopSources: Record<string, number>;
    ByCategory: Record<string, number>;
  }> {
    return this.makeRequest('/stats');
  }

  // Health check for alarm system
  async getAlarmSystemHealth(): Promise<{
    Status: string;
    ActiveAlarms: number;
    CriticalAlarms: number;
    Timestamp: string;
    SystemStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
  }> {
    return this.makeRequest('/health');
  }

  // Convert backend alarm entry to frontend format
  convertToFrontendAlarm(backendAlarm: BackendAlarmEntry): any {
    return {
      id: backendAlarm.id,
      timestamp: new Date(backendAlarm.timestamp),
      severity: backendAlarm.severity,
      source: backendAlarm.source,
      description: backendAlarm.description,
      state: backendAlarm.state,
      priority: backendAlarm.priority,
      category: backendAlarm.category,
      requiresOperatorAction: backendAlarm.requiresOperatorAction,
      consequence: backendAlarm.consequence,
      correctiveAction: backendAlarm.correctiveAction,
      acknowledgedBy: backendAlarm.acknowledgedBy,
      acknowledgedAt: backendAlarm.acknowledgedTimestamp ? new Date(backendAlarm.acknowledgedTimestamp) : undefined,
      shelvedBy: backendAlarm.resolvedBy, // Backend doesn't have shelvedBy, using resolvedBy as fallback
      shelvedAt: backendAlarm.resolvedTimestamp ? new Date(backendAlarm.resolvedTimestamp) : undefined,
      autoAck: false, // Default value, could be derived from relatedData
      alarmGroup: backendAlarm.category,
      occurenceCount: 1, // Default value, could be derived from relatedData
      notes: backendAlarm.notes
    };
  }
}

export const alarmService = new AlarmService();