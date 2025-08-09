import axios from 'axios';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Keep the original api const for backward compatibility
const api = apiClient;

// API service functions
export const opcApi = {
  // Get connection status
  getStatus: async () => {
    const response = await api.get('/opc/status');
    return response.data;
  },

  // Connect to OPC server
  connect: async () => {
    const response = await api.post('/opc/connect');
    return response.data;
  },

  // Get all variables in batch
  getBatchData: async (variables: string[]) => {
    // TODO: This endpoint needs to be added to backend
    // For now, we'll simulate with individual reads
    const response = await api.get(`/opc/batch?variables=${variables.join(',')}`);
    return response.data;
  },

  // Read single variable
  readVariable: async (displayName: string) => {
    const response = await api.get(`/opc/read/${displayName}`);
    return response.data;
  },

  // Write variable
  writeVariable: async (displayName: string, value: any) => {
    const response = await api.post('/opc/write', {
      displayName,
      value: value.toString(),
    });
    return response.data;
  },

  // Get all metadata
  getMetadata: async () => {
    const response = await api.get('/opc/metadata');
    return response.data;
  },
};

// Helper function to get all motor variables
export const getMotorVariables = (): string[] => {
  const variables: string[] = [];
  
  // For each motor (1-7)
  for (let i = 1; i <= 7; i++) {
    variables.push(
      `MOTOR_${i}_RPM_EXECUTION`,
      `MOTOR_${i}_CURRENT_EXECUTION`,
      `MOTOR_${i}_TARGET_EXECUTION`,
      `MOTOR_${i}_LEAK_EXECUTION`,
      `MOTOR_${i}_TEMPERATURE_EXECUTION`,
      `MOTOR_${i}_STATUS_EXECUTION`,
      `MOTOR_${i}_VALVE_EXECUTION`,
      `MOTOR_${i}_LINE_FILTER_EXECUTION`,
      `MOTOR_${i}_SUCTION_FILTER_EXECUTION`,
      `MOTOR_${i}_FLOW_FLOWMETER`,
      `MOTOR_${i}_PRESSURE_SETPOINT`,
      `MOTOR_${i}_FLOW_SETPOINT`,
      `MOTOR_${i}_ENABLE_EXECUTION`
    );
  }
  
  // Add system variables
  variables.push(
    'SYSTEM_TOTAL_FLOW',
    'SYSTEM_TOTAL_PRESSURE',
    'OIL_TEMPERATURE',
    'TANK_LEVEL',
    'AQUA_SENSOR'
  );
  
  return variables;
};

// Data polling service
export const startDataPolling = (callback: (data: any) => void, interval = 1000) => {
  let isPolling = true;
  
  const poll = async () => {
    if (!isPolling) return;
    
    try {
      const variables = getMotorVariables();
      const data = await opcApi.getBatchData(variables);
      callback(data);
    } catch (error) {
      console.error('Polling error:', error);
    }
    
    if (isPolling) {
      setTimeout(poll, interval);
    }
  };
  
  poll();
  
  // Return stop function
  return () => {
    isPolling = false;
  };
};