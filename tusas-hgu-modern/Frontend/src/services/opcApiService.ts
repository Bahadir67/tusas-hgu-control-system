// OPC API Service - Batch request handling
import { getVariablesForPage, PAGE_VARIABLE_SETS, generateMotorVariableName, MOTOR_VARIABLES, SYSTEM_VARIABLES } from '../utils/opcVariableMapping';

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
    window.addEventListener('auth-required', this.handleAuthRequired.bind(this));
  }
  
  // Handle authentication required events
  private handleAuthRequired(event: CustomEvent): void {
    console.warn('🔐 Authentication required for OPC operations:', event.detail.message);
    // The AuthGuard will handle redirecting to login
  }

  // Set authentication token
  setAuthToken(token: string | null): void {
    this.authToken = token;
    // Clear cache when auth token changes
    this.cache.clear();
  }

  // Get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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

  // Batch read variables for a specific page
  async getBatchVariablesForPage(pageKey: keyof typeof PAGE_VARIABLE_SETS): Promise<OpcBatchResponse> {
    const cacheKey = `page_${pageKey}`;
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const variables = getVariablesForPage(pageKey);
      console.log('📋 OpcApiService: Variables for', pageKey, ':', variables);
      
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
      
    } catch (error) {
      console.error(`Error fetching batch variables for page ${pageKey}:`, error);
      
      // NO MOCK DATA - Return error structure
      return {
        success: false,
        timestamp: new Date().toISOString(),
        variables: {},
        errors: [`Failed to fetch OPC data for page ${pageKey}: ${error.message}`]
      };
    }
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
        errors: [`Failed to fetch all OPC variables: ${error.message}`]
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
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
        errors: [`Failed to fetch leakage data: ${error.message}`]
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
    try {
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
      
    } catch (error) {
      console.error('Error triggering OPC refresh:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // NO MOCK DATA FUNCTIONS - ALL REMOVED
}

// Export singleton instance
export const opcApiService = new OpcApiService();
export default opcApiService;