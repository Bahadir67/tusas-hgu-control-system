import { create } from 'zustand';

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
}

// System data interface
interface SystemData {
  totalFlow: number;
  totalPressure: number;
  oilTemperature: number;
  tankLevel: number;
  aquaSensor: number;
}

// Store interface
interface OpcStore {
  motors: Record<number, MotorData>;
  system: SystemData;
  isConnected: boolean;
  lastUpdate: Date | null;
  updateAll: (data: any) => void;
  updateMotor: (id: number, data: Partial<MotorData>) => void;
  updateSystem: (data: Partial<SystemData>) => void;
  setConnection: (status: boolean) => void;
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
  },
  
  isConnected: false,
  lastUpdate: null,
  
  // Update all data from batch API
  updateAll: (data) => set((state) => {
    const motors: Record<number, MotorData> = {};
    
    // Parse motor data from API response
    for (let i = 1; i <= 7; i++) {
      motors[i] = {
        rpm: data[`MOTOR_${i}_RPM_EXECUTION`]?.value || 0,
        current: data[`MOTOR_${i}_CURRENT_EXECUTION`]?.value || 0,
        targetRpm: data[`MOTOR_${i}_TARGET_EXECUTION`]?.value || 0,
        leak: data[`MOTOR_${i}_LEAK_EXECUTION`]?.value || 0,
        temperature: data[`MOTOR_${i}_TEMPERATURE_EXECUTION`]?.value || 0,
        status: data[`MOTOR_${i}_STATUS_EXECUTION`]?.value || 0,
        valve: data[`MOTOR_${i}_VALVE_EXECUTION`]?.value === 1,
        lineFilter: data[`MOTOR_${i}_LINE_FILTER_EXECUTION`]?.value || 2,
        suctionFilter: data[`MOTOR_${i}_SUCTION_FILTER_EXECUTION`]?.value || 2,
        flow: data[`MOTOR_${i}_FLOW_FLOWMETER`]?.value || 0,
        pressure: data[`MOTOR_${i}_PRESSURE_VALUE`]?.value || 0,
        flowSetpoint: data[`MOTOR_${i}_FLOW_SETPOINT`]?.value || 0,
        pressureSetpoint: data[`MOTOR_${i}_PRESSURE_SETPOINT`]?.value || 0,
        enabled: data[`MOTOR_${i}_ENABLE_EXECUTION`]?.value === 1,
      };
    }
    
    // Parse system data
    const system = {
      totalFlow: data['SYSTEM_TOTAL_FLOW']?.value || 0,
      totalPressure: data['SYSTEM_TOTAL_PRESSURE']?.value || 0,
      oilTemperature: data['OIL_TEMPERATURE']?.value || 0,
      tankLevel: data['TANK_LEVEL']?.value || 0,
      aquaSensor: data['AQUA_SENSOR']?.value || 0,
    };
    
    return {
      motors,
      system,
      lastUpdate: new Date(),
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
}));