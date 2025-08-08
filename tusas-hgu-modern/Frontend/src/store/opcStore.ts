import { create } from 'zustand';
import { opcApiService, OpcBatchResponse } from '../services/opcApiService';
import { PAGE_VARIABLE_SETS } from '../utils/opcVariableMapping';

// Motor data interface
interface MotorData {
  rpm: number;
  current: number;
  targetRpm: number;
  leak: number;
  temperature: number;
  status: number; // 0=Ready, 1=Run, 2=Warning, 3=Error
  valve: boolean;
  lineFilter: number; // 0=Error, 1=Warning, 2=Normal
  suctionFilter: number; // 0=Error, 1=Warning, 2=Normal
  flow: number;
  pressure: number;
  flowSetpoint: number;
  pressureSetpoint: number;
  enabled: boolean;
  vibration?: number; // Optional vibration monitoring
  powerFactor?: number; // Optional power factor
  power?: number; // Calculated power (current * voltage)
}

// System data interface
interface SystemData {
  totalFlow: number;
  totalPressure: number;
  oilTemperature: number;
  tankLevel: number;
  aquaSensor: number;
  totalFlowSetpoint: number;
  pressureSetpoint: number;
  statusExecution: number;
  activePumps: number;
}

// Store interface
interface OpcStore {
  motors: Record<number, MotorData>;
  system: SystemData;
  isConnected: boolean;
  lastUpdate: Date | null;
  currentPage: keyof typeof PAGE_VARIABLE_SETS;
  isLoading: boolean;
  errors: string[];
  
  // Actions
  updateAll: (data: any) => void;
  updateFromBatchResponse: (response: OpcBatchResponse) => void;
  updateMotor: (id: number, data: Partial<MotorData>) => void;
  updateSystem: (data: Partial<SystemData>) => void;
  setConnection: (status: boolean) => void;
  setCurrentPage: (page: keyof typeof PAGE_VARIABLE_SETS) => void;
  setLoading: (loading: boolean) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  
  // API Actions
  fetchPageData: (page: keyof typeof PAGE_VARIABLE_SETS) => Promise<void>;
  fetchAllData: () => Promise<void>;
  writeVariable: (varName: string, value: any) => Promise<boolean>;
}

// Initialize empty motor data
const createEmptyMotor = (): MotorData => ({
  rpm: 0,
  current: 0,
  targetRpm: 0,
  leak: 0,
  temperature: 0,
  status: 0,
  valve: false,
  lineFilter: 2,
  suctionFilter: 2,
  flow: 0,
  pressure: 0,
  flowSetpoint: 0,
  pressureSetpoint: 0,
  enabled: false,
});

// Create store
export const useOpcStore = create<OpcStore>((set) => ({
  // Initialize 7 motors
  motors: {
    1: createEmptyMotor(),
    2: createEmptyMotor(),
    3: createEmptyMotor(),
    4: createEmptyMotor(),
    5: createEmptyMotor(),
    6: createEmptyMotor(),
    7: createEmptyMotor(), // Special fixed-flow pump
  },
  
  // System data
  system: {
    totalFlow: 0,
    totalPressure: 0,
    oilTemperature: 0,
    tankLevel: 0,
    aquaSensor: 0,
    totalFlowSetpoint: 450,
    pressureSetpoint: 125.5,
    statusExecution: 1,
    activePumps: 3,
  },
  
  isConnected: false,
  lastUpdate: null,
  currentPage: 'main',
  isLoading: false,
  errors: [],
  
  // Legacy update (for compatibility)
  updateAll: (data) => set((state) => {
    const motors: Record<number, MotorData> = { ...state.motors };
    
    // Parse motor data from API response using real CSV variable names
    for (let i = 1; i <= 7; i++) {
      motors[i] = {
        ...motors[i],
        rpm: data[`MOTOR_${i}_MOTOR_RPM_EXECUTION`]?.value ?? motors[i].rpm,
        current: data[`MOTOR_${i}_MOTOR_CURRENT_EXECUTION`]?.value ?? motors[i].current,
        targetRpm: data[`MOTOR_${i}_MOTOR_TARGET_RPM_EXECUTION`]?.value ?? motors[i].targetRpm,
        leak: data[`MOTOR_${i}_PUMP_LEAK_EXECUTION`]?.value ?? motors[i].leak,
        temperature: data[`MOTOR_${i}_MOTOR_TEMPERATURE_EXECUTION`]?.value ?? motors[i].temperature,
        status: data[`MOTOR_${i}_MOTOR_STATUS_EXECUTION`]?.value ?? motors[i].status,
        valve: data[`MOTOR_${i}_VALVE_EXECUTION`]?.value === 1 || false,
        lineFilter: data[`MOTOR_${i}_LINE_FILTER_EXECUTION`]?.value ?? motors[i].lineFilter,
        suctionFilter: data[`MOTOR_${i}_SUCTION_FILTER_EXECUTION`]?.value ?? motors[i].suctionFilter,
        flow: data[`MOTOR_${i}_PUMP_FLOW_EXECUTION`]?.value ?? motors[i].flow,
        pressure: data[`MOTOR_${i}_PUMP_PRESSURE_EXECUTION`]?.value ?? motors[i].pressure,
        flowSetpoint: data[`MOTOR_${i}_PUMP_FLOW_SETPOINT`]?.value ?? motors[i].flowSetpoint,
        pressureSetpoint: data[`MOTOR_${i}_PUMP_PRESSURE_SETPOINT`]?.value ?? motors[i].pressureSetpoint,
        enabled: data[`MOTOR_${i}_ENABLED_EXECUTION`]?.value === 1 || false,
      };
    }
    
    // Parse system data using real CSV variable names
    const system = {
      ...state.system,
      totalFlow: data['SYSTEM_TOTAL_FLOW_SETPOINT']?.value ?? state.system.totalFlow,
      totalPressure: data['SYSTEM_PRESSURE_SETPOINT']?.value ?? state.system.totalPressure,
      oilTemperature: data['COOLING_OIL_TEMPERATURE_EXECUTION']?.value ?? state.system.oilTemperature,
      tankLevel: data['COOLING_OIL_LEVEL_PERCENT_EXECUTION']?.value ?? state.system.tankLevel,
      aquaSensor: data['COOLING_AQUA_SENSOR_EXECUTION']?.value ?? state.system.aquaSensor,
    };
    
    return {
      motors,
      system,
      lastUpdate: new Date(),
    };
  }),
  
  // New batch response handler
  updateFromBatchResponse: (response) => set((state) => {
    if (!response.success) {
      return { 
        errors: [...state.errors, ...(response.errors || ['Batch request failed'])],
        isLoading: false 
      };
    }
    
    const motors: Record<number, MotorData> = { ...state.motors };
    const data = response.variables;
    
    // Update motors with new data
    for (let i = 1; i <= 7; i++) {
      motors[i] = {
        ...motors[i],
        rpm: data[`MOTOR_${i}_MOTOR_RPM_EXECUTION`]?.value ?? motors[i].rpm,
        current: data[`MOTOR_${i}_MOTOR_CURRENT_EXECUTION`]?.value ?? motors[i].current,
        targetRpm: data[`MOTOR_${i}_MOTOR_TARGET_RPM_EXECUTION`]?.value ?? motors[i].targetRpm,
        leak: data[`MOTOR_${i}_PUMP_LEAK_EXECUTION`]?.value ?? motors[i].leak,
        temperature: data[`MOTOR_${i}_MOTOR_TEMPERATURE_EXECUTION`]?.value ?? motors[i].temperature,
        status: data[`MOTOR_${i}_MOTOR_STATUS_EXECUTION`]?.value ?? motors[i].status,
        valve: data[`MOTOR_${i}_VALVE_EXECUTION`]?.value === 1 || false,
        lineFilter: data[`MOTOR_${i}_LINE_FILTER_EXECUTION`]?.value ?? motors[i].lineFilter,
        suctionFilter: data[`MOTOR_${i}_SUCTION_FILTER_EXECUTION`]?.value ?? motors[i].suctionFilter,
        flow: data[`MOTOR_${i}_PUMP_FLOW_EXECUTION`]?.value ?? motors[i].flow,
        pressure: data[`MOTOR_${i}_PUMP_PRESSURE_EXECUTION`]?.value ?? motors[i].pressure,
        flowSetpoint: data[`MOTOR_${i}_PUMP_FLOW_SETPOINT`]?.value ?? motors[i].flowSetpoint,
        pressureSetpoint: data[`MOTOR_${i}_PUMP_PRESSURE_SETPOINT`]?.value ?? motors[i].pressureSetpoint,
        enabled: data[`MOTOR_${i}_ENABLED_EXECUTION`]?.value === 1 || false,
      };
    }
    
    // Update system data
    const system = {
      ...state.system,
      totalFlow: data['SYSTEM_TOTAL_FLOW_SETPOINT']?.value ?? state.system.totalFlow,
      totalPressure: data['SYSTEM_PRESSURE_SETPOINT']?.value ?? state.system.totalPressure,
      oilTemperature: data['COOLING_OIL_TEMPERATURE_EXECUTION']?.value ?? state.system.oilTemperature,
      tankLevel: data['COOLING_OIL_LEVEL_PERCENT_EXECUTION']?.value ?? state.system.tankLevel,
      aquaSensor: data['COOLING_AQUA_SENSOR_EXECUTION']?.value ?? state.system.aquaSensor,
    };
    
    return {
      motors,
      system,
      lastUpdate: new Date(),
      isLoading: false,
      isConnected: true
    };
  }),
  
  // Update single motor
  updateMotor: (id, data) => set((state) => ({
    motors: {
      ...state.motors,
      [id]: { ...state.motors[id], ...data },
    },
  })),
  
  // Update system data
  updateSystem: (data) => set((state) => ({
    system: { ...state.system, ...data },
  })),
  
  // Set connection status
  setConnection: (status) => set({ isConnected: status }),
  
  // Set current page
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Set loading state
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Add error
  addError: (error) => set((state) => ({ 
    errors: [...state.errors, error] 
  })),
  
  // Clear errors
  clearErrors: () => set({ errors: [] }),
  
  // API Actions
  fetchPageData: async (page) => {
    set({ isLoading: true, currentPage: page });
    try {
      const response = await opcApiService.getBatchVariablesForPage(page);
      set((state) => {
        state.updateFromBatchResponse(response);
        return { isLoading: false };
      });
    } catch (error) {
      set((state) => ({ 
        isLoading: false,
        errors: [...state.errors, `Failed to fetch ${page} data: ${error}`]
      }));
    }
  },
  
  fetchAllData: async () => {
    set({ isLoading: true });
    try {
      const response = await opcApiService.getAllVariables();
      set((state) => {
        state.updateFromBatchResponse(response);
        return { isLoading: false };
      });
    } catch (error) {
      set((state) => ({ 
        isLoading: false,
        errors: [...state.errors, `Failed to fetch all data: ${error}`]
      }));
    }
  },
  
  writeVariable: async (varName, value) => {
    try {
      const result = await opcApiService.writeVariable(varName, value);
      if (!result.success) {
        set((state) => ({ 
          errors: [...state.errors, `Write failed for ${varName}: ${result.error}`]
        }));
      }
      return result.success;
    } catch (error) {
      set((state) => ({ 
        errors: [...state.errors, `Write error for ${varName}: ${error}`]
      }));
      return false;
    }
  },
}));