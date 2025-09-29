// OPC API Service - Batch request handling
import { getVariablesForPage, PAGE_VARIABLE_SETS, generateMotorVariableName, MOTOR_VARIABLES, SYSTEM_VARIABLES } from '../utils/opcVariableMapping';
import { TrackPerformance, LogApiCall } from '../utils/decorators';

export interface OpcBatchResponse {
  success: boolean;
  timestamp: string;
  variables: Record<string, {
    value: any;
    quality: string;
    timestamp: string;
  }>;
  errors?: string[];
}

export interface OpcWriteRequest {
  variableName: string;
  value: any;
  dataType?: string;
}

class OpcApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 500; // 500ms cache for rapid requests
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:5000/api/Opc') {
    this.baseUrl = baseUrl;
    
    // Listen for auth events from middleware
    window.addEventListener('auth-required', this.handleAuthRequired);
  }
  
  // Handle authentication required events
  private handleAuthRequired = (event: Event): void => {
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    console.warn('🔐 Authentication required for OPC operations:', detail?.message ?? 'Authentication required');
    // The AuthGuard will handle redirecting to login
  };

  // Set authentication token
  setAuthToken(token: string | null): void {
    // Always try to get token from localStorage as fallback
    if (!token) {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.authToken = storedToken;
      } else {
        this.authToken = null;
      }
    } else {
      this.authToken = token;
    }

    // Clear cache when auth token changes
    this.cache.clear();
  }

  // Force refresh token from localStorage
  refreshTokenFromStorage(): void {
    const storedToken = localStorage.getItem('auth_token');

    if (storedToken) {
      this.authToken = storedToken;
    } else {
      this.authToken = null;
    }

    this.cache.clear();
  }

  // Get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Always check localStorage as fallback
    if (!this.authToken) {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.authToken = storedToken;
      }
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Handle authentication errors
  private handleAuthError(response: Response): void {
    if (response.status === 401) {
      // Token expired or invalid - clear local token
      this.authToken = null;
      this.cache.clear();
      
      // Dispatch custom event for auth failure
      window.dispatchEvent(new CustomEvent('auth-required', {
        detail: { message: 'Authentication required for OPC operations' }
      }));
    }
  }

  // Get cached data if available and fresh
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Set cache data
  private setCacheData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // Batch read variables for a specific page with cross-cutting concerns
  async getBatchVariablesForPage(pageKey: keyof typeof PAGE_VARIABLE_SETS): Promise<OpcBatchResponse> {
    return await this.executeWithCrossCuttingConcerns(
      `getBatchVariablesForPage_${pageKey}`,
      async () => {
        const cacheKey = `page_${pageKey}`;
        const cachedData = this.getCachedData(cacheKey);

        if (cachedData) {
          return cachedData;
        }

        const variables = getVariablesForPage(pageKey);

        const response = await fetch(`${this.baseUrl}/batch`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            variables: variables,
            pageContext: pageKey
          })
        });

        if (!response.ok) {
          this.handleAuthError(response);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: OpcBatchResponse = await response.json();
        this.setCacheData(cacheKey, data);

        return data;
      },
      { includeArgs: false, includeResult: false }
    );
  }

  // Cross-cutting concerns wrapper - Eliminates logging and error handling duplication
  private async executeWithCrossCuttingConcerns<T>(
    operationName: string,
    operation: () => Promise<T>,
    config: { includeArgs?: boolean; includeResult?: boolean } = {}
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Execute operation
      const result = await operation();
      const executionTime = performance.now() - startTime;

      // Track performance metrics
      this.trackPerformance({
        methodName: operationName,
        executionTime,
        timestamp: new Date(),
        success: true
      });

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Track error performance
      this.trackPerformance({
        methodName: operationName,
        executionTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  // Performance tracking store
  private performanceMetrics: Array<{
    methodName: string;
    executionTime: number;
    timestamp: Date;
    success: boolean;
    error?: string;
  }> = [];

  private trackPerformance(data: {
    methodName: string;
    executionTime: number;
    timestamp: Date;
    success: boolean;
    error?: string;
  }) {
    this.performanceMetrics.push(data);

    // Keep only recent metrics to prevent memory leaks
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - 1000);
    }
  }

  // Get performance metrics (for debugging)
  getPerformanceMetrics() {
    return [...this.performanceMetrics];
  }

  // Get performance summary
  getPerformanceSummary() {
    if (this.performanceMetrics.length === 0) {
      return { totalCalls: 0, averageExecutionTime: 0, successRate: 0 };
    }

    const totalCalls = this.performanceMetrics.length;
    const successfulCalls = this.performanceMetrics.filter(m => m.success).length;
    const averageExecutionTime = this.performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalCalls;

    return {
      totalCalls,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      successRate: Math.round((successfulCalls / totalCalls) * 100 * 100) / 100
    };
  }

  // Get all variables (for full system sync)
  async getAllVariables(): Promise<OpcBatchResponse> {
    const cacheKey = 'all_variables';
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      // Combine all page variables
      const allVariables = new Set<string>();
      
      Object.keys(PAGE_VARIABLE_SETS).forEach(pageKey => {
        const pageVars = getVariablesForPage(pageKey as keyof typeof PAGE_VARIABLE_SETS);
        pageVars.forEach(v => allVariables.add(v));
      });

      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          variables: Array.from(allVariables),
          pageContext: 'all'
        })
      });

      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpcBatchResponse = await response.json();
      this.setCacheData(cacheKey, data);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching all variables:', error);
      
      // NO MOCK DATA - Return error structure
      return {
        success: false,
        timestamp: new Date().toISOString(),
        variables: {},
        errors: [`Failed to fetch all OPC variables: ${this.getErrorMessage(error)}`]
      };
    }
  }

  // Write single variable
  async writeVariable(variableName: string, value: any, dataType?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/write`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          DisplayName: variableName,
          Value: value,
          DataType: dataType
        })
      });

      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear relevant cache entries
      this.cache.clear();
      
      return { success: true };
      
    } catch (error) {
      console.error('Error writing variable:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Write multiple variables atomically
  async writeBatchVariables(writes: OpcWriteRequest[]): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch-write`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          operations: writes
        })
      });

      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after writes
      this.cache.clear();
      
      return data;
      
    } catch (error) {
      console.error('Error writing batch variables:', error);
      return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Get only leakage variables for all motors (for continuous updates)
  async getLeakageVariables(): Promise<OpcBatchResponse> {
    const cacheKey = 'leakage_only';
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      // Generate leakage variables for all 7 motors
      const leakageVariables = [];
      for (let i = 1; i <= 7; i++) {
        leakageVariables.push(`PUMP_${i}_LEAK_RATE`);
      }
      
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          variables: leakageVariables,
          pageContext: 'leakage_only'
        })
      });

      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpcBatchResponse = await response.json();
      this.setCacheData(cacheKey, data);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching leakage variables:', error);
      
      // NO MOCK DATA - Return error structure
      return {
        success: false,
        timestamp: new Date().toISOString(),
        variables: {},
        errors: [`Failed to fetch leakage data: ${this.getErrorMessage(error)}`]
      };
    }
  }

  // Check OPC server connection
  async checkConnection(): Promise<{ connected: boolean; serverInfo?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error checking OPC connection:', error);
      return { connected: false };
    }
  }

  // Trigger immediate OPC refresh - fresh data collection without waiting for timer
  async triggerOpcRefresh(): Promise<{ success: boolean; data?: any; error?: string }> {
    return await this.executeWithCrossCuttingConcerns(
      'triggerOpcRefresh',
      async () => {
        const response = await fetch(`${this.baseUrl}/refresh`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });

        if (!response.ok) {
          this.handleAuthError(response);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Clear cache to force fresh data on next requests
        this.cache.clear();

        return {
          success: data.Success || data.success,
          data: data
        };
      }
    );
  }

  // 🔄 Manual OPC reconnect - Force reconnection to OPC UA server
  async reconnectOpc(): Promise<{ success: boolean; message: string; error?: string }> {
    return await this.executeWithCrossCuttingConcerns(
      'reconnectOpc',
      async () => {
        const response = await fetch(`${this.baseUrl}/connect`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });

        if (!response.ok) {
          this.handleAuthError(response);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Clear cache after reconnect
        this.cache.clear();

        return {
          success: data.Success || data.success,
          message: data.Message || 'Reconnection completed'
        };
      }
    );
  }

  // Get detailed connection status with reconnect info
  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    lastConnected?: string;
    reconnectAttempts?: number;
    isReconnecting?: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        isConnected: data.IsConnected,
        lastConnected: data.LastConnected,
        reconnectAttempts: data.ReconnectAttempts,
        isReconnecting: data.IsReconnecting,
        message: data.Message
      };
    } catch (error) {
      console.error('Error getting connection status:', error);
      return {
        isConnected: false,
        message: error instanceof Error ? error.message : 'Connection check failed'
      };
    }
  }

  // NO MOCK DATA FUNCTIONS - ALL REMOVED
}

// Export singleton instance
export const opcApiService = new OpcApiService();
export default opcApiService;