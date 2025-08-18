import { create } from 'zustand';
import { opcApiService, OpcBatchResponse } from '../services/opcApiService';
import { PAGE_VARIABLE_SETS } from '../utils/opcVariableMapping';

// Motor data interface - UPDATED TO MATCH REAL PLC DB VARIABLES
interface MotorData {
  // Actual values
  rpm: number;                    // MOTOR_X_RPM_ACTUAL
  current: number;                // MOTOR_X_CURRENT_A
  temperature: number;            // MOTOR_X_TEMPERATURE_C
  status: number;                 // MOTOR_X_STATUS (0=Ready, 1=Run, 2=Warning, 3=Error)
  enabled: boolean;               // MOTOR_X_ENABLE
  flow: number;                   // PUMP_X_FLOW_ACTUAL
  pressure: number;               // PUMP_X_PRESSURE_ACTUAL
  leak: number;                   // PUMP_X_LEAK_RATE
  
  // Setpoints
  targetRpm: number;              // MOTOR_X_RPM_SETPOINT
  flowSetpoint: number;           // PUMP_X_FLOW_SETPOINT
  pressureSetpoint: number;       // PUMP_X_PRESSURE_SETPOINT
  
  // Status indicators
  lineFilter: boolean;            // PUMP_X_LINE_FILTER_STATUS
  suctionFilter: boolean;         // PUMP_X_SUCTION_FILTER_STATUS
  manualValve: boolean;           // PUMP_X_MANUAL_VALVE_STATUS
  errorCode: number;              // MOTOR_X_ERROR_CODE
  
  // Command/Acknowledgment
  startCmd: boolean;              // MOTOR_X_START_CMD
  stopCmd: boolean;               // MOTOR_X_STOP_CMD
  resetCmd: boolean;              // MOTOR_X_RESET_CMD
  startAck: boolean;              // MOTOR_X_START_ACK
  stopAck: boolean;               // MOTOR_X_STOP_ACK
  resetAck: boolean;              // MOTOR_X_RESET_ACK
  
  // Maintenance
  operatingHours: number;         // MOTOR_X_OPERATING_HOURS
  maintenanceDue: boolean;        // MOTOR_X_MAINTENANCE_DUE
  maintenanceHours: number;       // MOTOR_X_MAINTENANCE_HOURS
  
  // Optional calculated values
  vibration?: number;
  powerFactor?: number;
  power?: number;
}

// System data interface - UPDATED TO MATCH REAL PLC DB VARIABLES
interface SystemData {
  // System Status
  systemStatus: number;              // SYSTEM_STATUS
  systemSafetyStatus: number;        // SYSTEM_SAFETY_STATUS
  emergencyStop: boolean;            // EMERGENCY_STOP
  
  // Flow & Pressure
  totalFlow: number;                 // TOTAL_SYSTEM_FLOW
  totalPressure: number;             // TOTAL_SYSTEM_PRESSURE
  pressureAverage: number;           // SYSTEM_PRESSURE_AVERAGE
  activePumps: number;               // SYSTEM_ACTIVE_PUMPS
  systemEfficiency: number;          // SYSTEM_EFFICIENCY
  
  // Setpoints
  pressureSetpoint: number;          // SYSTEM_PRESSURE_SETPOINT
  flowSetpoint: number;              // SYSTEM_FLOW_SETPOINT
  
  // Temperature & Tank
  oilTemperature: number;            // SYSTEM_TEMPERATURE
  tankLevel: number;                 // TANK_LEVEL_PERCENT
  aquaSensor: number;                // AQUA_SENSOR_LEVEL
  chillerInletTemp: number;          // CHILLER_INLET_TEMPERATURE
  chillerOutletTemp: number;         // CHILLER_OUTLET_TEMPERATURE
  
  // Tank Status
  tankMinLevel: boolean;             // TANK_MIN_LEVEL
  tankMaxLevel: boolean;             // TANK_MAX_LEVEL
  chillerWaterFlowStatus: boolean;   // CHILLER_WATER_FLOW_STATUS
  
  // Communication
  canCommunicationActive: boolean;   // CAN_COMMUNICATION_ACTIVE
  canTcpConnected: boolean;          // CAN_TCP_CONNECTED
  canActiveDeviceCount: number;      // CAN_ACTIVE_DEVICE_COUNT
  canSystemError: boolean;           // CAN_SYSTEM_ERROR
  
  // Safety Valves
  pressureSafetyValvesEnable: boolean;    // PRESSURE_SAFETY_VALVES_ENABLE
  pressureSafetyValvesCommOk: boolean;    // PRESSURE_SAFETY_VALVES_COMM_OK
  
  // Error Management
  systemErrorActive: boolean;        // SYSTEM_ERROR_ACTIVE
  criticalSafetyError: boolean;      // CRITICAL_SAFETY_ERROR
  anyMotorError: boolean;            // ANY_MOTOR_ERROR
  
  // System Control
  systemEnable: boolean;             // SYSTEM_ENABLE
  
  // Backward compatibility (deprecated - will be removed)
  statusExecution?: number;          // Deprecated: use systemStatus
  totalFlowSetpoint?: number;        // Deprecated: use flowSetpoint
  waterTemperature?: number;         // Deprecated: use chillerInletTemp
  coolingFlowRate?: number;          // Deprecated: use chillerWaterFlowStatus
  coolingSystemStatus?: number;      // Deprecated: use systemStatus
  coolingPumpStatus?: boolean;       // Deprecated: use chillerWaterFlowStatus
  minOilTempSetpoint?: number;       // Deprecated - not in PLC
  maxOilTempSetpoint?: number;       // Deprecated - not in PLC
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
  fetchLeakageOnly: () => Promise<void>;
  writeVariable: (varName: string, value: any) => Promise<boolean>;
}

// Initialize empty motor data - UPDATED FOR NEW INTERFACE
const createEmptyMotor = (): MotorData => ({
  // Actual values
  rpm: 0,
  current: 0,
  temperature: 0,
  status: 0,
  enabled: false,
  flow: 0,
  pressure: 0,
  leak: 0,
  
  // Setpoints
  targetRpm: 0,
  flowSetpoint: 0,
  pressureSetpoint: 0,
  
  // Status indicators
  lineFilter: false,
  suctionFilter: false,
  manualValve: false,
  errorCode: 0,
  
  // Command/Acknowledgment
  startCmd: false,
  stopCmd: false,
  resetCmd: false,
  startAck: false,
  stopAck: false,
  resetAck: false,
  
  // Maintenance
  operatingHours: 0,
  maintenanceDue: false,
  maintenanceHours: 8760, // Default 1 year
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
  
  // System data - UPDATED TO MATCH NEW INTERFACE
  system: {
    // System Status
    systemStatus: 1,
    systemSafetyStatus: 0,
    emergencyStop: false,
    
    // Flow & Pressure
    totalFlow: 0,
    totalPressure: 0,
    pressureAverage: 0,
    activePumps: 3,
    systemEfficiency: 0,
    
    // Setpoints - NO DUMMY VALUES
    pressureSetpoint: undefined,
    flowSetpoint: undefined,
    
    // Temperature & Tank
    oilTemperature: 0,
    tankLevel: 0,
    aquaSensor: 0,
    chillerInletTemp: 0,
    chillerOutletTemp: 0,
    
    // Tank Status
    tankMinLevel: false,
    tankMaxLevel: false,
    chillerWaterFlowStatus: false,
    
    // Communication
    canCommunicationActive: false,
    canTcpConnected: false,
    canActiveDeviceCount: 0,
    canSystemError: false,
    
    // Safety Valves
    pressureSafetyValvesEnable: false,
    pressureSafetyValvesCommOk: false,
    
    // Error Management
    systemErrorActive: false,
    criticalSafetyError: false,
    anyMotorError: false,
    
    // System Control
    systemEnable: false,
    
    // Backward compatibility (deprecated)
    statusExecution: 1,
    totalFlowSetpoint: undefined,
    waterTemperature: 0,
    coolingFlowRate: 0,
    coolingSystemStatus: 0,
    coolingPumpStatus: false,
    minOilTempSetpoint: 30.0,
    maxOilTempSetpoint: 60.0,
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
        rpm: data[`MOTOR_${i}_RPM_ACTUAL`]?.value ?? motors[i].rpm,
        current: data[`MOTOR_${i}_CURRENT_A`]?.value ?? motors[i].current,
        targetRpm: data[`MOTOR_${i}_RPM_SETPOINT`]?.value ?? motors[i].targetRpm,
        leak: data[`PUMP_${i}_LEAK_RATE`]?.value ?? motors[i].leak,
        temperature: data[`MOTOR_${i}_TEMPERATURE_C`]?.value ?? motors[i].temperature,
        status: data[`MOTOR_${i}_STATUS`]?.value ?? motors[i].status,
        manualValve: data[`PUMP_${i}_MANUAL_VALVE_STATUS`]?.value === true || false,
        lineFilter: data[`PUMP_${i}_LINE_FILTER_STATUS`]?.value ?? motors[i].lineFilter,
        suctionFilter: data[`PUMP_${i}_SUCTION_FILTER_STATUS`]?.value ?? motors[i].suctionFilter,
        flow: data[`PUMP_${i}_FLOW_ACTUAL`]?.value ?? motors[i].flow,
        pressure: data[`PUMP_${i}_PRESSURE_ACTUAL`]?.value ?? motors[i].pressure,
        flowSetpoint: data[`PUMP_${i}_FLOW_SETPOINT`]?.value ?? motors[i].flowSetpoint,
        pressureSetpoint: data[`PUMP_${i}_PRESSURE_SETPOINT`]?.value ?? motors[i].pressureSetpoint,
        enabled: data[`MOTOR_${i}_ENABLE`]?.value === true || false,
        errorCode: data[`MOTOR_${i}_ERROR_CODE`]?.value ?? motors[i].errorCode,
        startCmd: data[`MOTOR_${i}_START_CMD`]?.value ?? motors[i].startCmd,
        stopCmd: data[`MOTOR_${i}_STOP_CMD`]?.value ?? motors[i].stopCmd,
        resetCmd: data[`MOTOR_${i}_RESET_CMD`]?.value ?? motors[i].resetCmd,
        startAck: data[`MOTOR_${i}_START_ACK`]?.value ?? motors[i].startAck,
        stopAck: data[`MOTOR_${i}_STOP_ACK`]?.value ?? motors[i].stopAck,
        resetAck: data[`MOTOR_${i}_RESET_ACK`]?.value ?? motors[i].resetAck,
        operatingHours: data[`MOTOR_${i}_OPERATING_HOURS`]?.value ?? motors[i].operatingHours,
        maintenanceDue: data[`MOTOR_${i}_MAINTENANCE_DUE`]?.value ?? motors[i].maintenanceDue,
        maintenanceHours: data[`MOTOR_${i}_MAINTENANCE_HOURS`]?.value ?? motors[i].maintenanceHours,
      };
    }
    
    // Parse system data using real CSV variable names
    const system = {
      ...state.system,
      systemStatus: data['SYSTEM_STATUS']?.value ?? state.system.systemStatus,
      systemSafetyStatus: data['SYSTEM_SAFETY_STATUS']?.value ?? state.system.systemSafetyStatus,
      emergencyStop: data['EMERGENCY_STOP']?.value ?? state.system.emergencyStop,
      totalFlow: data['TOTAL_SYSTEM_FLOW']?.value ?? state.system.totalFlow,
      totalPressure: data['TOTAL_SYSTEM_PRESSURE']?.value ?? state.system.totalPressure,
      pressureAverage: data['SYSTEM_PRESSURE_AVERAGE']?.value ?? state.system.pressureAverage,
      activePumps: data['SYSTEM_ACTIVE_PUMPS']?.value ?? state.system.activePumps,
      systemEfficiency: data['SYSTEM_EFFICIENCY']?.value ?? state.system.systemEfficiency,
      pressureSetpoint: data['SYSTEM_PRESSURE_SETPOINT']?.value ?? state.system.pressureSetpoint,
      flowSetpoint: data['SYSTEM_FLOW_SETPOINT']?.value ?? state.system.flowSetpoint,
      oilTemperature: data['TANK_OIL_TEMPERATURE']?.value ?? state.system.oilTemperature,
      tankLevel: data['TANK_LEVEL_PERCENT']?.value ?? state.system.tankLevel,
      aquaSensor: data['AQUA_SENSOR_LEVEL']?.value ?? state.system.aquaSensor,
      chillerInletTemp: data['CHILLER_INLET_TEMPERATURE']?.value ?? state.system.chillerInletTemp,
      chillerOutletTemp: data['CHILLER_OUTLET_TEMPERATURE']?.value ?? state.system.chillerOutletTemp,
      tankMinLevel: data['TANK_MIN_LEVEL']?.value ?? state.system.tankMinLevel,
      tankMaxLevel: data['TANK_MAX_LEVEL']?.value ?? state.system.tankMaxLevel,
      chillerWaterFlowStatus: data['CHILLER_WATER_FLOW_STATUS']?.value ?? state.system.chillerWaterFlowStatus,
      canCommunicationActive: data['CAN_COMMUNICATION_ACTIVE']?.value ?? state.system.canCommunicationActive,
      canTcpConnected: data['CAN_TCP_CONNECTED']?.value ?? state.system.canTcpConnected,
      canActiveDeviceCount: data['CAN_ACTIVE_DEVICE_COUNT']?.value ?? state.system.canActiveDeviceCount,
      canSystemError: data['CAN_SYSTEM_ERROR']?.value ?? state.system.canSystemError,
      pressureSafetyValvesEnable: data['PRESSURE_SAFETY_VALVES_ENABLE']?.value ?? state.system.pressureSafetyValvesEnable,
      pressureSafetyValvesCommOk: data['PRESSURE_SAFETY_VALVES_COMM_OK']?.value ?? state.system.pressureSafetyValvesCommOk,
      systemErrorActive: data['SYSTEM_ERROR_ACTIVE']?.value ?? state.system.systemErrorActive,
      criticalSafetyError: data['CRITICAL_SAFETY_ERROR']?.value ?? state.system.criticalSafetyError,
      anyMotorError: data['ANY_MOTOR_ERROR']?.value ?? state.system.anyMotorError,
      
      // System Control
      systemEnable: data['SYSTEM_ENABLE']?.value ?? state.system.systemEnable,
      
      // Oil Temperature Control Setpoints
      minOilTempSetpoint: data['COOLING_MIN_OIL_TEMP_SETPOINT']?.value ?? state.system.minOilTempSetpoint,
      maxOilTempSetpoint: data['COOLING_MAX_OIL_TEMP_SETPOINT']?.value ?? state.system.maxOilTempSetpoint,
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
    
    console.log('🔄 Store Update - Batch Response:', response);
    console.log('📊 Variable Count:', Object.keys(response.variables).length);
    
    const motors: Record<number, MotorData> = { ...state.motors };
    const data = response.variables;
    
    // Update motors with new data
    for (let i = 1; i <= 7; i++) {
      motors[i] = {
        ...motors[i],
        rpm: data[`MOTOR_${i}_RPM_ACTUAL`]?.value ?? motors[i].rpm,
        current: data[`MOTOR_${i}_CURRENT_A`]?.value ?? motors[i].current,
        targetRpm: data[`MOTOR_${i}_RPM_SETPOINT`]?.value ?? motors[i].targetRpm,
        leak: data[`PUMP_${i}_LEAK_RATE`]?.value ?? motors[i].leak,
        temperature: data[`MOTOR_${i}_TEMPERATURE_C`]?.value ?? motors[i].temperature,
        status: data[`MOTOR_${i}_STATUS`]?.value ?? motors[i].status,
        manualValve: data[`PUMP_${i}_MANUAL_VALVE_STATUS`]?.value === true || false,
        lineFilter: data[`PUMP_${i}_LINE_FILTER_STATUS`]?.value ?? motors[i].lineFilter,
        suctionFilter: data[`PUMP_${i}_SUCTION_FILTER_STATUS`]?.value ?? motors[i].suctionFilter,
        flow: data[`PUMP_${i}_FLOW_ACTUAL`]?.value ?? motors[i].flow,
        pressure: data[`PUMP_${i}_PRESSURE_ACTUAL`]?.value ?? motors[i].pressure,
        flowSetpoint: data[`PUMP_${i}_FLOW_SETPOINT`]?.value ?? motors[i].flowSetpoint,
        pressureSetpoint: data[`PUMP_${i}_PRESSURE_SETPOINT`]?.value ?? motors[i].pressureSetpoint,
        enabled: data[`MOTOR_${i}_ENABLE`]?.value === true || false,
        errorCode: data[`MOTOR_${i}_ERROR_CODE`]?.value ?? motors[i].errorCode,
        startCmd: data[`MOTOR_${i}_START_CMD`]?.value ?? motors[i].startCmd,
        stopCmd: data[`MOTOR_${i}_STOP_CMD`]?.value ?? motors[i].stopCmd,
        resetCmd: data[`MOTOR_${i}_RESET_CMD`]?.value ?? motors[i].resetCmd,
        startAck: data[`MOTOR_${i}_START_ACK`]?.value ?? motors[i].startAck,
        stopAck: data[`MOTOR_${i}_STOP_ACK`]?.value ?? motors[i].stopAck,
        resetAck: data[`MOTOR_${i}_RESET_ACK`]?.value ?? motors[i].resetAck,
        operatingHours: data[`MOTOR_${i}_OPERATING_HOURS`]?.value ?? motors[i].operatingHours,
        maintenanceDue: data[`MOTOR_${i}_MAINTENANCE_DUE`]?.value ?? motors[i].maintenanceDue,
        maintenanceHours: data[`MOTOR_${i}_MAINTENANCE_HOURS`]?.value ?? motors[i].maintenanceHours,
      };
    }
    
    // Update system data
    const system = {
      ...state.system,
      systemStatus: data['SYSTEM_STATUS']?.value ?? state.system.systemStatus,
      systemSafetyStatus: data['SYSTEM_SAFETY_STATUS']?.value ?? state.system.systemSafetyStatus,
      emergencyStop: data['EMERGENCY_STOP']?.value ?? state.system.emergencyStop,
      totalFlow: data['TOTAL_SYSTEM_FLOW']?.value ?? state.system.totalFlow,
      totalPressure: data['TOTAL_SYSTEM_PRESSURE']?.value ?? state.system.totalPressure,
      pressureAverage: data['SYSTEM_PRESSURE_AVERAGE']?.value ?? state.system.pressureAverage,
      activePumps: data['SYSTEM_ACTIVE_PUMPS']?.value ?? state.system.activePumps,
      systemEfficiency: data['SYSTEM_EFFICIENCY']?.value ?? state.system.systemEfficiency,
      pressureSetpoint: data['SYSTEM_PRESSURE_SETPOINT']?.value ?? state.system.pressureSetpoint,
      flowSetpoint: data['SYSTEM_FLOW_SETPOINT']?.value ?? state.system.flowSetpoint,
      oilTemperature: data['TANK_OIL_TEMPERATURE']?.value ?? state.system.oilTemperature,
      tankLevel: data['TANK_LEVEL_PERCENT']?.value ?? state.system.tankLevel,
      aquaSensor: data['AQUA_SENSOR_LEVEL']?.value ?? state.system.aquaSensor,
      chillerInletTemp: data['CHILLER_INLET_TEMPERATURE']?.value ?? state.system.chillerInletTemp,
      chillerOutletTemp: data['CHILLER_OUTLET_TEMPERATURE']?.value ?? state.system.chillerOutletTemp,
      tankMinLevel: data['TANK_MIN_LEVEL']?.value ?? state.system.tankMinLevel,
      tankMaxLevel: data['TANK_MAX_LEVEL']?.value ?? state.system.tankMaxLevel,
      chillerWaterFlowStatus: data['CHILLER_WATER_FLOW_STATUS']?.value ?? state.system.chillerWaterFlowStatus,
      canCommunicationActive: data['CAN_COMMUNICATION_ACTIVE']?.value ?? state.system.canCommunicationActive,
      canTcpConnected: data['CAN_TCP_CONNECTED']?.value ?? state.system.canTcpConnected,
      canActiveDeviceCount: data['CAN_ACTIVE_DEVICE_COUNT']?.value ?? state.system.canActiveDeviceCount,
      canSystemError: data['CAN_SYSTEM_ERROR']?.value ?? state.system.canSystemError,
      pressureSafetyValvesEnable: data['PRESSURE_SAFETY_VALVES_ENABLE']?.value ?? state.system.pressureSafetyValvesEnable,
      pressureSafetyValvesCommOk: data['PRESSURE_SAFETY_VALVES_COMM_OK']?.value ?? state.system.pressureSafetyValvesCommOk,
      systemErrorActive: data['SYSTEM_ERROR_ACTIVE']?.value ?? state.system.systemErrorActive,
      criticalSafetyError: data['CRITICAL_SAFETY_ERROR']?.value ?? state.system.criticalSafetyError,
      anyMotorError: data['ANY_MOTOR_ERROR']?.value ?? state.system.anyMotorError,
      
      // System Control
      systemEnable: data['SYSTEM_ENABLE']?.value ?? state.system.systemEnable,
      
      // Oil Temperature Control Setpoints
      minOilTempSetpoint: data['COOLING_MIN_OIL_TEMP_SETPOINT']?.value ?? state.system.minOilTempSetpoint,
      maxOilTempSetpoint: data['COOLING_MAX_OIL_TEMP_SETPOINT']?.value ?? state.system.maxOilTempSetpoint,
    };
    
    console.log('✅ Motors Updated:', {
      motor1: motors[1],
      motor2: motors[2],
      motor3: motors[3]
    });
    
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
    console.log('🔄 Store: fetchPageData called for page:', page);
    set({ isLoading: true, currentPage: page });
    try {
      console.log('📡 Store: Calling opcApiService.getBatchVariablesForPage');
      const response = await opcApiService.getBatchVariablesForPage(page);
      console.log('📊 Store: OPC response received:', response.success, 'variables:', Object.keys(response.variables || {}).length);
      
      // Call updateFromBatchResponse directly through the store
      const { updateFromBatchResponse } = useOpcStore.getState();
      updateFromBatchResponse(response);
    } catch (error) {
      console.error('❌ Store: fetchPageData error:', error);
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
      // Call updateFromBatchResponse directly through the store
      const { updateFromBatchResponse } = useOpcStore.getState();
      updateFromBatchResponse(response);
    } catch (error) {
      set((state) => ({ 
        isLoading: false,
        errors: [...state.errors, `Failed to fetch all data: ${error}`]
      }));
    }
  },
  
  fetchLeakageOnly: async () => {
    try {
      const response = await opcApiService.getLeakageVariables();
      if (response.success) {
        set((state) => {
          const motors: Record<number, MotorData> = { ...state.motors };
          const data = response.variables;
          
          // Update only leakage values for all motors
          for (let i = 1; i <= 7; i++) {
            const leakValue = data[`PUMP_${i}_LEAK_RATE`]?.value;
            if (leakValue !== undefined) {
              motors[i] = {
                ...motors[i],
                leak: leakValue
              };
            }
          }
          
          return {
            motors,
            lastUpdate: new Date()
          };
        });
      }
    } catch (error) {
      set((state) => ({ 
        errors: [...state.errors, `Failed to fetch leakage data: ${error}`]
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

  // Trigger immediate OPC refresh - fresh data without waiting for timer
  triggerOpcRefresh: async () => {
    try {
      set((state) => ({ isLoading: true }));
      
      const result = await opcApiService.triggerOpcRefresh();
      
      if (result.success && result.data?.Values) {
        // Update store with fresh data
        const freshData = result.data.Values;
        const currentState = get();
        
        // Update system data
        const updatedSystem = mapOpcDataToSystem(freshData, currentState.system);
        
        // Update motors data
        const updatedMotors = { ...currentState.motors };
        for (let i = 1; i <= 7; i++) {
          updatedMotors[i] = mapOpcDataToMotor(freshData, i, updatedMotors[i]);
        }
        
        set({
          system: updatedSystem,
          motors: updatedMotors,
          isLoading: false,
          lastUpdated: new Date().toISOString()
        });
        
        console.log('✅ OPC refresh successful - Fresh data loaded');
        return { success: true, valuesCount: Object.keys(freshData).length };
      } else {
        set((state) => ({ 
          errors: [...state.errors, `OPC refresh failed: ${result.error}`],
          isLoading: false
        }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      set((state) => ({ 
        errors: [...state.errors, `OPC refresh error: ${error}`],
        isLoading: false
      }));
      console.error('❌ OPC refresh error:', error);
      return { success: false, error: String(error) };
    }
  },
}));