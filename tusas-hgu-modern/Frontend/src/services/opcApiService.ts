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

  constructor(baseUrl: string = 'http://localhost:5000/api/Opc') {
    this.baseUrl = baseUrl;
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
      
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: variables,
          pageContext: pageKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpcBatchResponse = await response.json();
      this.setCacheData(cacheKey, data);
      
      return data;
      
    } catch (error) {
      console.error(`Error fetching batch variables for page ${pageKey}:`, error);
      
      // Return mock data for development
      return this.getMockDataForPage(pageKey);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: Array.from(allVariables),
          pageContext: 'all'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpcBatchResponse = await response.json();
      this.setCacheData(cacheKey, data);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching all variables:', error);
      return this.getMockAllVariables();
    }
  }

  // Write single variable
  async writeVariable(variableName: string, value: any, dataType?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variableName,
          value,
          dataType
        })
      });

      if (!response.ok) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: writes
        })
      });

      if (!response.ok) {
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
        leakageVariables.push(`MOTOR_${i}_PUMP_LEAK_EXECUTION`);
      }
      
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: leakageVariables,
          pageContext: 'leakage_only'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpcBatchResponse = await response.json();
      this.setCacheData(cacheKey, data);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching leakage variables:', error);
      
      // Return mock leakage data
      return this.getMockLeakageData();
    }
  }

  // Check OPC server connection
  async checkConnection(): Promise<{ connected: boolean; serverInfo?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error checking OPC connection:', error);
      return { connected: false };
    }
  }

  // Mock data for development (when backend is not available)
  private getMockDataForPage(pageKey: keyof typeof PAGE_VARIABLE_SETS): OpcBatchResponse {
    const variables = getVariablesForPage(pageKey);
    const mockVariables: Record<string, any> = {};

    variables.forEach(varName => {
      if (varName.includes('MOTOR_')) {
        const motorId = parseInt(varName.split('_')[1]);
        mockVariables[varName] = {
          value: this.generateMockMotorValue(varName, motorId),
          quality: 'Good',
          timestamp: new Date().toISOString()
        };
      } else {
        mockVariables[varName] = {
          value: this.generateMockSystemValue(varName),
          quality: 'Good', 
          timestamp: new Date().toISOString()
        };
      }
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      variables: mockVariables
    };
  }

  private generateMockMotorValue(varName: string, motorId: number): any {
    if (varName.includes('RPM')) return 1450 + Math.random() * 100;
    if (varName.includes('PRESSURE')) return 120 + Math.random() * 15;
    if (varName.includes('FLOW')) return 75 + Math.random() * 10;
    if (varName.includes('CURRENT')) return 120 + Math.random() * 20;
    if (varName.includes('TEMPERATURE')) return 45 + Math.random() * 10;
    if (varName.includes('STATUS')) return Math.random() > 0.8 ? 1 : 0;
    if (varName.includes('ENABLED')) return Math.random() > 0.3 ? 1 : 0;
    if (varName.includes('VALVE')) return Math.random() > 0.5 ? 1 : 0;
    if (varName.includes('FILTER')) return 2; // OK
    if (varName.includes('LEAK')) return Math.random() * 0.05;
    return 0;
  }

  private generateMockSystemValue(varName: string): any {
    if (varName.includes('FLOW')) return 450 + Math.random() * 50;
    if (varName.includes('PRESSURE')) return 125 + Math.random() * 10;
    if (varName.includes('TEMPERATURE')) return 55 + Math.random() * 5;
    if (varName.includes('LEVEL')) return 75 + Math.random() * 10;
    if (varName.includes('AQUA')) return Math.random() * 0.5;
    return 0;
  }

  private getMockAllVariables(): OpcBatchResponse {
    // Return mock data for all system variables
    return this.getMockDataForPage('main');
  }

  private getMockLeakageData(): OpcBatchResponse {
    const mockVariables: Record<string, any> = {};

    // Generate mock leakage data for all 7 motors
    for (let i = 1; i <= 7; i++) {
      mockVariables[`MOTOR_${i}_PUMP_LEAK_EXECUTION`] = {
        value: Math.random() * 0.05, // Random leak between 0-0.05 L/min
        quality: 'Good',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      variables: mockVariables
    };
  }
}

// Export singleton instance
export const opcApiService = new OpcApiService();
export default opcApiService;