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
  triggerOpcRefresh: () => Promise<{ success: boolean; error?: string }>;

  // 🔄 Connection Management
  setConnectionStatus: (status: { isConnected: boolean; isReconnecting?: boolean; message: string }) => void;
  handleConnectionLost: () => void;
  handleConnectionRestored: () => void;
}

// Motor Data Mapping Factory - Eliminates code duplication
class MotorDataMapper {
  private static readonly MOTOR_VARIABLES = {
    // Motor-specific variables
    rpm: (id: number) => `MOTOR_${id}_RPM_ACTUAL`,
    current: (id: number) => `MOTOR_${id}_CURRENT_A`,
    temperature: (id: number) => `MOTOR_${id}_TEMPERATURE_C`,
    status: (id: number) => `MOTOR_${id}_STATUS`,
    enabled: (id: number) => `MOTOR_${id}_ENABLE`,
    targetRpm: (id: number) => `MOTOR_${id}_RPM_SETPOINT`,
    errorCode: (id: number) => `MOTOR_${id}_ERROR_CODE`,

    // Pump-specific variables
    flow: (id: number) => `PUMP_${id}_FLOW_ACTUAL`,
    pressure: (id: number) => `PUMP_${id}_PRESSURE_ACTUAL`,
    leak: (id: number) => `PUMP_${id}_LEAK_RATE`,
    flowSetpoint: (id: number) => `PUMP_${id}_FLOW_SETPOINT`,
    pressureSetpoint: (id: number) => `PUMP_${id}_PRESSURE_SETPOINT`,
    lineFilter: (id: number) => `PUMP_${id}_LINE_FILTER_STATUS`,
    suctionFilter: (id: number) => `PUMP_${id}_SUCTION_FILTER_STATUS`,
    manualValve: (id: number) => `PUMP_${id}_MANUAL_VALVE_STATUS`,

    // Command/Acknowledgment variables
    startCmd: (id: number) => `MOTOR_${id}_START_CMD`,
    stopCmd: (id: number) => `MOTOR_${id}_STOP_CMD`,
    resetCmd: (id: number) => `MOTOR_${id}_RESET_CMD`,
    startAck: (id: number) => `MOTOR_${id}_START_ACK`,
    stopAck: (id: number) => `MOTOR_${id}_STOP_ACK`,
    resetAck: (id: number) => `MOTOR_${id}_RESET_ACK`,

    // Maintenance variables
    operatingHours: (id: number) => `MOTOR_${id}_OPERATING_HOURS`,
    maintenanceDue: (id: number) => `MOTOR_${id}_MAINTENANCE_DUE`,
    maintenanceHours: (id: number) => `MOTOR_${id}_MAINTENANCE_HOURS`,
  };

  static mapMotorData(data: any, currentMotor: MotorData, motorId: number): MotorData {
    const variables = this.MOTOR_VARIABLES;

    return {
      ...currentMotor,
      // Motor variables
      rpm: data[variables.rpm(motorId)]?.value ?? currentMotor.rpm,
      current: data[variables.current(motorId)]?.value ?? currentMotor.current,
      temperature: data[variables.temperature(motorId)]?.value ?? currentMotor.temperature,
      status: data[variables.status(motorId)]?.value ?? currentMotor.status,
      enabled: data[variables.enabled(motorId)]?.value === true || false,
      targetRpm: data[variables.targetRpm(motorId)]?.value ?? currentMotor.targetRpm,
      errorCode: data[variables.errorCode(motorId)]?.value ?? currentMotor.errorCode,

      // Pump variables
      flow: data[variables.flow(motorId)]?.value ?? currentMotor.flow,
      pressure: data[variables.pressure(motorId)]?.value ?? currentMotor.pressure,
      leak: data[variables.leak(motorId)]?.value ?? currentMotor.leak,
      flowSetpoint: data[variables.flowSetpoint(motorId)]?.value ?? currentMotor.flowSetpoint,
      pressureSetpoint: data[variables.pressureSetpoint(motorId)]?.value ?? currentMotor.pressureSetpoint,
      lineFilter: data[variables.lineFilter(motorId)]?.value ?? currentMotor.lineFilter,
      suctionFilter: data[variables.suctionFilter(motorId)]?.value ?? currentMotor.suctionFilter,
      manualValve: data[variables.manualValve(motorId)]?.value === true || false,

      // Command/Acknowledgment variables
      startCmd: data[variables.startCmd(motorId)]?.value ?? currentMotor.startCmd,
      stopCmd: data[variables.stopCmd(motorId)]?.value ?? currentMotor.stopCmd,
      resetCmd: data[variables.resetCmd(motorId)]?.value ?? currentMotor.resetCmd,
      startAck: data[variables.startAck(motorId)]?.value ?? currentMotor.startAck,
      stopAck: data[variables.stopAck(motorId)]?.value ?? currentMotor.stopAck,
      resetAck: data[variables.resetAck(motorId)]?.value ?? currentMotor.resetAck,

      // Maintenance variables
      operatingHours: data[variables.operatingHours(motorId)]?.value ?? currentMotor.operatingHours,
      maintenanceDue: data[variables.maintenanceDue(motorId)]?.value ?? currentMotor.maintenanceDue,
      maintenanceHours: data[variables.maintenanceHours(motorId)]?.value ?? currentMotor.maintenanceHours,
    };
  }

  static mapMotor7Special(data: any, currentMotor: MotorData): MotorData {
    // Motor 7 special handling for softstarter
    const baseMotor = this.mapMotorData(data, currentMotor, 7);
    return {
      ...baseMotor,
      // Override with correct values for softstarter
      rpm: 1500, // Always 1500 RPM (fixed speed softstarter)
      current: 0, // Not measurable in softstarter
      temperature: 0, // Not measurable in softstarter
      status: 0, // No status feedback from softstarter
      errorCode: 0, // No error codes from softstarter
      targetRpm: 1500, // Fixed RPM, not adjustable
      startAck: false, // No ACK feedback from softstarter
      stopAck: false,
      resetAck: false,
    };
  }
}

// Helper function to get default flow setpoint by motor ID
const getDefaultFlowSetpoint = (motorId?: number): number => {
  if (!motorId) return 16; // Default fallback

  switch (motorId) {
    case 1: return 16; // Actual PLC value for PUMP_1_FLOW_SETPOINT
    case 2: return 30; // DB default for PUMP_2_FLOW_SETPOINT (adjust if different)
    case 3: return 30; // DB default for PUMP_3_FLOW_SETPOINT (adjust if different)
    case 4: return 30; // DB default for PUMP_4_FLOW_SETPOINT (adjust if different)
    case 5: return 30; // DB default for PUMP_5_FLOW_SETPOINT (adjust if different)
    case 6: return 30; // DB default for PUMP_6_FLOW_SETPOINT (adjust if different)
    case 7: return 34; // DB default for PUMP_7_FLOW_SETPOINT (fixed displacement)
    default: return 30; // Fallback
  }
};

// System Data Mapping Factory - Eliminates system data mapping duplication
class SystemDataMapper {
  private static readonly SYSTEM_VARIABLES = {
    // System Status
    systemStatus: 'SYSTEM_STATUS',
    systemSafetyStatus: 'SYSTEM_SAFETY_STATUS',
    emergencyStop: 'EMERGENCY_STOP',

    // Flow & Pressure
    totalFlow: 'TOTAL_SYSTEM_FLOW',
    totalPressure: 'TOTAL_SYSTEM_PRESSURE',
    pressureAverage: 'SYSTEM_PRESSURE_AVERAGE',
    activePumps: 'SYSTEM_ACTIVE_PUMPS',
    systemEfficiency: 'SYSTEM_EFFICIENCY',

    // Setpoints
    pressureSetpoint: 'SYSTEM_PRESSURE_SETPOINT',
    flowSetpoint: 'SYSTEM_FLOW_SETPOINT',

    // Temperature & Tank
    oilTemperature: 'TANK_OIL_TEMPERATURE',
    tankLevel: 'TANK_LEVEL_PERCENT',
    aquaSensor: 'AQUA_SENSOR_LEVEL',
    chillerInletTemp: 'CHILLER_INLET_TEMPERATURE',
    chillerOutletTemp: 'CHILLER_OUTLET_TEMPERATURE',

    // Tank Status
    tankMinLevel: 'TANK_MIN_LEVEL',
    tankMaxLevel: 'TANK_MAX_LEVEL',
    chillerWaterFlowStatus: 'CHILLER_WATER_FLOW_STATUS',

    // Communication
    canCommunicationActive: 'CAN_COMMUNICATION_ACTIVE',
    canTcpConnected: 'CAN_TCP_CONNECTED',
    canActiveDeviceCount: 'CAN_ACTIVE_DEVICE_COUNT',
    canSystemError: 'CAN_SYSTEM_ERROR',

    // Safety Valves
    pressureSafetyValvesEnable: 'PRESSURE_SAFETY_VALVES_ENABLE',
    pressureSafetyValvesCommOk: 'PRESSURE_SAFETY_VALVES_COMM_OK',

    // Error Management
    systemErrorActive: 'SYSTEM_ERROR_ACTIVE',
    criticalSafetyError: 'CRITICAL_SAFETY_ERROR',
    anyMotorError: 'ANY_MOTOR_ERROR',

    // System Control
    systemEnable: 'SYSTEM_ENABLE',

    // Oil Temperature Control Setpoints
    minOilTempSetpoint: 'COOLING_MIN_OIL_TEMP_SETPOINT',
    maxOilTempSetpoint: 'COOLING_MAX_OIL_TEMP_SETPOINT',
  };

  static mapSystemData(data: any, currentSystem: SystemData): SystemData {
    const variables = this.SYSTEM_VARIABLES;

    return {
      ...currentSystem,
      // System Status
      systemStatus: data[variables.systemStatus]?.value ?? currentSystem.systemStatus,
      systemSafetyStatus: data[variables.systemSafetyStatus]?.value ?? currentSystem.systemSafetyStatus,
      emergencyStop: data[variables.emergencyStop]?.value ?? currentSystem.emergencyStop,

      // Flow & Pressure
      totalFlow: data[variables.totalFlow]?.value ?? currentSystem.totalFlow,
      totalPressure: data[variables.totalPressure]?.value ?? currentSystem.totalPressure,
      pressureAverage: data[variables.pressureAverage]?.value ?? currentSystem.pressureAverage,
      activePumps: data[variables.activePumps]?.value ?? currentSystem.activePumps,
      systemEfficiency: data[variables.systemEfficiency]?.value ?? currentSystem.systemEfficiency,

      // Setpoints
      pressureSetpoint: data[variables.pressureSetpoint]?.value ?? currentSystem.pressureSetpoint,
      flowSetpoint: data[variables.flowSetpoint]?.value ?? currentSystem.flowSetpoint,

      // Temperature & Tank
      oilTemperature: data[variables.oilTemperature]?.value ?? currentSystem.oilTemperature,
      tankLevel: data[variables.tankLevel]?.value ?? currentSystem.tankLevel,
      aquaSensor: data[variables.aquaSensor]?.value ?? currentSystem.aquaSensor,
      chillerInletTemp: data[variables.chillerInletTemp]?.value ?? currentSystem.chillerInletTemp,
      chillerOutletTemp: data[variables.chillerOutletTemp]?.value ?? currentSystem.chillerOutletTemp,

      // Tank Status
      tankMinLevel: data[variables.tankMinLevel]?.value ?? currentSystem.tankMinLevel,
      tankMaxLevel: data[variables.tankMaxLevel]?.value ?? currentSystem.tankMaxLevel,
      chillerWaterFlowStatus: data[variables.chillerWaterFlowStatus]?.value ?? currentSystem.chillerWaterFlowStatus,

      // Communication
      canCommunicationActive: data[variables.canCommunicationActive]?.value ?? currentSystem.canCommunicationActive,
      canTcpConnected: data[variables.canTcpConnected]?.value ?? currentSystem.canTcpConnected,
      canActiveDeviceCount: data[variables.canActiveDeviceCount]?.value ?? currentSystem.canActiveDeviceCount,
      canSystemError: data[variables.canSystemError]?.value ?? currentSystem.canSystemError,

      // Safety Valves
      pressureSafetyValvesEnable: data[variables.pressureSafetyValvesEnable]?.value ?? currentSystem.pressureSafetyValvesEnable,
      pressureSafetyValvesCommOk: data[variables.pressureSafetyValvesCommOk]?.value ?? currentSystem.pressureSafetyValvesCommOk,

      // Error Management
      systemErrorActive: data[variables.systemErrorActive]?.value ?? currentSystem.systemErrorActive,
      criticalSafetyError: data[variables.criticalSafetyError]?.value ?? currentSystem.criticalSafetyError,
      anyMotorError: data[variables.anyMotorError]?.value ?? currentSystem.anyMotorError,

      // System Control
      systemEnable: data[variables.systemEnable]?.value ?? currentSystem.systemEnable,

      // Oil Temperature Control Setpoints
      minOilTempSetpoint: data[variables.minOilTempSetpoint]?.value ?? currentSystem.minOilTempSetpoint,
      maxOilTempSetpoint: data[variables.maxOilTempSetpoint]?.value ?? currentSystem.maxOilTempSetpoint,
    };
  }
}

// Helper function to get default pressure setpoint by motor ID
const getDefaultPressureSetpoint = (motorId?: number): number => {
  if (!motorId) return 280; // Default fallback

  switch (motorId) {
    case 1: return 0; // TEMP: Use 0 to clearly show when OPC data is missing
    case 2: return 280; // DB default - adjust if actual PLC value is different
    case 3: return 280; // DB default - adjust if actual PLC value is different
    case 4: return 280; // DB default - adjust if actual PLC value is different
    case 5: return 280; // DB default - adjust if actual PLC value is different
    case 6: return 280; // DB default - adjust if actual PLC value is different
    case 7: return 280; // DB default - adjust if actual PLC value is different
    default: return 280; // Fallback
  }
};

// Initialize empty motor data - UPDATED FOR NEW INTERFACE
const createEmptyMotor = (motorId?: number): MotorData => ({
  // Actual values
  rpm: 0,
  current: 0,
  temperature: 0,
  status: 0,
  enabled: false,
  flow: 0,
  pressure: 0,
  leak: 0,
  
  // Setpoints - Set reasonable defaults matching actual PLC values
  targetRpm: motorId === 7 ? 1500 : 1000, // Motor 7: 1500 (softstarter), Others: 1000
  flowSetpoint: getDefaultFlowSetpoint(motorId), // Motor-specific flow setpoints
  pressureSetpoint: getDefaultPressureSetpoint(motorId), // Motor-specific pressure setpoints
  
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
export const useOpcStore = create<OpcStore>((set, get) => ({
  // Initialize 7 motors with proper defaults
  motors: {
    1: createEmptyMotor(1),
    2: createEmptyMotor(2),
    3: createEmptyMotor(3),
    4: createEmptyMotor(4),
    5: createEmptyMotor(5),
    6: createEmptyMotor(6),
    7: createEmptyMotor(7), // Special fixed-flow pump
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
    pressureSetpoint: 0,
    flowSetpoint: 0,
    
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
    totalFlowSetpoint: 0,
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
    
    // Parse motor data from API response using MotorDataMapper factory
    for (let i = 1; i <= 7; i++) {
      if (i === 7) {
        // MOTOR_7 special handling using factory
        motors[i] = MotorDataMapper.mapMotor7Special(data, motors[i]);
      } else {
        // MOTOR_1-6: Normal G120C motors using factory
        motors[i] = MotorDataMapper.mapMotorData(data, motors[i], i);
      }
    }
    
    // Parse system data using SystemDataMapper factory
    const system = SystemDataMapper.mapSystemData(data, state.system);
    
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
    
    // Update motors with new data using MotorDataMapper factory
    for (let i = 1; i <= 7; i++) {
      if (i === 7) {
        // MOTOR_7 special handling using factory
        motors[i] = MotorDataMapper.mapMotor7Special(data, motors[i]);
      } else {
        // MOTOR_1-6: Normal G120C motors using factory
        motors[i] = MotorDataMapper.mapMotorData(data, motors[i], i);
      }
    }
    
    // Update system data using SystemDataMapper factory
    const system = SystemDataMapper.mapSystemData(data, state.system);
    
    console.log('✅ Motors Updated:', {
      motor1: {
        targetRpm: motors[1].targetRpm,
        pressureSetpoint: motors[1].pressureSetpoint,
        flowSetpoint: motors[1].flowSetpoint,
        rpm: motors[1].rpm,
        status: motors[1].status
      },
      motor2: {
        targetRpm: motors[2].targetRpm,
        pressureSetpoint: motors[2].pressureSetpoint,
        flowSetpoint: motors[2].flowSetpoint
      }
    });
    
    // Debug: Show what OPC data we received
    console.log('🔍 OPC Data Received - Setpoints for Motor 1:', {
      rpmSetpoint: data['MOTOR_1_RPM_SETPOINT']?.value,
      pressureSetpoint: data['PUMP_1_PRESSURE_SETPOINT']?.value,
      flowSetpoint: data['PUMP_1_FLOW_SETPOINT']?.value,
      rpmActual: data['MOTOR_1_RPM_ACTUAL']?.value
    });
    
    // Debug: Before/After comparison for Motor 1 pressure setpoint
    console.log('🔍 Motor 1 Pressure Setpoint Debug:', {
      beforeUpdate: state.motors[1]?.pressureSetpoint,
      opcValue: data['PUMP_1_PRESSURE_SETPOINT']?.value,
      afterUpdate: motors[1].pressureSetpoint,
      defaultValue: getDefaultPressureSetpoint(1)
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
      set({ isLoading: true });
      const page = get().currentPage;
      await get().fetchPageData(page);
      set({ isLoading: false, lastUpdate: new Date() });
      return { success: true };
    } catch (error) {
      set((state) => ({
        isLoading: false,
        errors: [...state.errors, `OPC refresh error: ${error}`]
      }));
      return { success: false, error: String(error) };
    }
  },

  // 🔄 Connection Management - Graceful Degradation
  setConnectionStatus: (status) => set((state) => ({
    ...state,
    isConnected: status.isConnected,
    isLoading: status.isReconnecting ? true : state.isLoading,
    errors: status.isConnected
      ? state.errors.filter(e => !e.includes('connection'))
      : [...state.errors.filter(e => !e.includes('connection')), status.message]
  })),

  handleConnectionLost: () => set((state) => {
    console.warn('🔌 OPC Connection lost - Switching to graceful degradation mode');

    // Add connection error to errors list
    const connectionError = `OPC UA Connection Lost - ${new Date().toLocaleTimeString()}`;

    return {
      ...state,
      isConnected: false,
      isLoading: false,
      errors: [...state.errors.filter(e => !e.includes('connection')), connectionError],
      // Keep last known good values for graceful degradation
      lastUpdate: state.lastUpdate
    };
  }),

  handleConnectionRestored: () => set((state) => {
    console.log('✅ OPC Connection restored - Resuming normal operations');

    // Clear connection-related errors
    const filteredErrors = state.errors.filter(e => !e.includes('connection'));

    return {
      ...state,
      isConnected: true,
      isLoading: false,
      errors: filteredErrors,
      lastUpdate: new Date()
    };
  }),
}));
