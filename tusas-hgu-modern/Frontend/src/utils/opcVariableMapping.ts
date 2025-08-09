// OPC Variable Mapping - CSV'den alınan gerçek değişken adları
// Frontend-OPC-Binding-Table-final.csv dosyasına göre

export interface OpcVariableDefinition {
  frontendKey: string;
  displayName: string;
  opcVariableName: string;
  dataType: string;
  unit?: string;
  isMotorSpecific: boolean;
}

// Motor-specific variables (X = motor number 1-7)
export const MOTOR_VARIABLES: OpcVariableDefinition[] = [
  {
    frontendKey: 'rpm',
    displayName: 'RPM göstergesi',
    opcVariableName: 'MOTOR_X_MOTOR_RPM_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'RPM',
    isMotorSpecific: true
  },
  {
    frontendKey: 'pressure',
    displayName: 'Basınç göstergesi',
    opcVariableName: 'MOTOR_X_PUMP_PRESSURE_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'Bar',
    isMotorSpecific: true
  },
  {
    frontendKey: 'flow',
    displayName: 'Debi göstergesi',
    opcVariableName: 'MOTOR_X_PUMP_FLOW_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'L/Min',
    isMotorSpecific: true
  },
  {
    frontendKey: 'current',
    displayName: 'Akım göstergesi',
    opcVariableName: 'MOTOR_X_MOTOR_CURRENT_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'A',
    isMotorSpecific: true
  },
  {
    frontendKey: 'temperature',
    displayName: 'Sıcaklık göstergesi',
    opcVariableName: 'MOTOR_X_MOTOR_TEMPERATURE_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'C',
    isMotorSpecific: true
  },
  {
    frontendKey: 'status',
    displayName: 'Motor durumu',
    opcVariableName: 'MOTOR_X_MOTOR_STATUS_EXECUTION',
    dataType: 'ShortInt',
    isMotorSpecific: true
  },
  {
    frontendKey: 'enabled',
    displayName: 'Motor aktif/pasif',
    opcVariableName: 'MOTOR_X_ENABLED_EXECUTION',
    dataType: 'Bool',
    isMotorSpecific: true
  },
  {
    frontendKey: 'valve',
    displayName: 'Vana durumu',
    opcVariableName: 'MOTOR_X_VALVE_EXECUTION',
    dataType: 'ShortInt',
    isMotorSpecific: true
  },
  {
    frontendKey: 'lineFilter',
    displayName: 'Hat filtresi',
    opcVariableName: 'MOTOR_X_LINE_FILTER_EXECUTION',
    dataType: 'ShortInt',
    isMotorSpecific: true
  },
  {
    frontendKey: 'suctionFilter',
    displayName: 'Emme filtresi',
    opcVariableName: 'MOTOR_X_SUCTION_FILTER_EXECUTION',
    dataType: 'ShortInt',
    isMotorSpecific: true
  },
  {
    frontendKey: 'targetRpm',
    displayName: 'Hedef RPM',
    opcVariableName: 'MOTOR_X_MOTOR_TARGET_RPM_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'RPM',
    isMotorSpecific: true
  },
  {
    frontendKey: 'pressureSetpoint',
    displayName: 'Basınç setpoint',
    opcVariableName: 'MOTOR_X_PUMP_PRESSURE_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'Bar',
    isMotorSpecific: true
  },
  {
    frontendKey: 'flowSetpoint',
    displayName: 'Debi setpoint',
    opcVariableName: 'MOTOR_X_PUMP_FLOW_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'L/Min',
    isMotorSpecific: true
  },
  {
    frontendKey: 'leak',
    displayName: 'Sızıntı miktarı',
    opcVariableName: 'MOTOR_X_PUMP_LEAK_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'L/Min',
    isMotorSpecific: true
  }
];

// System-wide variables
export const SYSTEM_VARIABLES: OpcVariableDefinition[] = [
  {
    frontendKey: 'totalFlow',
    displayName: 'Toplam sistem debisi',
    opcVariableName: 'SYSTEM_TOTAL_FLOW_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'L/Min',
    isMotorSpecific: false
  },
  {
    frontendKey: 'totalPressure',
    displayName: 'Toplam sistem basıncı',
    opcVariableName: 'SYSTEM_PRESSURE_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'Bar',
    isMotorSpecific: false
  },
  {
    frontendKey: 'oilTemperature',
    displayName: 'Yağ sıcaklığı',
    opcVariableName: 'COOLING_OIL_TEMPERATURE_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'tankLevel',
    displayName: 'Tank seviyesi',
    opcVariableName: 'COOLING_OIL_LEVEL_PERCENT_EXECUTION',
    dataType: 'REAL-Float',
    unit: '%',
    isMotorSpecific: false
  },
  {
    frontendKey: 'aquaSensor',
    displayName: 'Su sensörü',
    opcVariableName: 'COOLING_AQUA_SENSOR_EXECUTION',
    dataType: 'REAL-Float',
    unit: '%',
    isMotorSpecific: false
  },
  {
    frontendKey: 'waterTemperature',
    displayName: 'Su sıcaklığı',
    opcVariableName: 'COOLING_WATER_TEMPERATURE_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'coolingFlowRate',
    displayName: 'Soğutma debisi',
    opcVariableName: 'COOLING_FLOW_RATE_EXECUTION',
    dataType: 'REAL-Float',
    unit: 'L/Min',
    isMotorSpecific: false
  },
  {
    frontendKey: 'coolingSystemStatus',
    displayName: 'Soğutma sistemi durumu',
    opcVariableName: 'COOLING_SYSTEM_STATUS_EXECUTION',
    dataType: 'DINT-Int',
    unit: '',
    isMotorSpecific: false
  },
  {
    frontendKey: 'coolingPumpStatus',
    displayName: 'Soğutma pompası durumu',
    opcVariableName: 'COOLING_PUMP_STATUS_EXECUTION',
    dataType: 'Bool',
    unit: '',
    isMotorSpecific: false
  },
  {
    frontendKey: 'minOilTempSetpoint',
    displayName: 'Min yağ sıcaklığı setpoint',
    opcVariableName: 'COOLING_MIN_OIL_TEMP_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'maxOilTempSetpoint',
    displayName: 'Max yağ sıcaklığı setpoint',
    opcVariableName: 'COOLING_MAX_OIL_TEMP_SETPOINT',
    dataType: 'REAL-Float',
    unit: 'C',
    isMotorSpecific: false
  }
];

// Control commands (motor-specific)
export const MOTOR_COMMANDS: OpcVariableDefinition[] = [
  {
    frontendKey: 'enableCommand',
    displayName: 'Motor Enable/Disable',
    opcVariableName: 'MOTOR_X_ENABLE_CONTROL_EXECUTION',
    dataType: 'Bool',
    isMotorSpecific: true
  },
  // Note: Start/Stop/Reset commands seem to be motor 1 specific in CSV
  // We'll need to clarify if these should be MOTOR_X_* pattern
];

// Page-based variable grouping
export const PAGE_VARIABLE_SETS = {
  main: {
    name: 'Main Dashboard',
    systemVariables: ['totalFlow', 'totalPressure', 'oilTemperature', 'tankLevel', 'aquaSensor', 'waterTemperature', 'coolingFlowRate', 'coolingSystemStatus', 'coolingPumpStatus', 'minOilTempSetpoint', 'maxOilTempSetpoint'],
    motorVariables: ['status', 'enabled', 'pressure', 'flow', 'temperature'], // Basic overview
    motors: [1, 2, 3, 4, 5, 6, 7] // All motors
  },
  
  motors: {
    name: 'Motors Page',
    systemVariables: ['totalFlow', 'totalPressure'],
    motorVariables: ['rpm', 'targetRpm', 'pressure', 'pressureSetpoint', 'flow', 'flowSetpoint', 'current', 'temperature', 'status', 'enabled', 'valve', 'lineFilter', 'suctionFilter', 'leak'],
    motors: [1, 2, 3, 4, 5, 6, 7] // All motors, all details
  },
  
  logs: {
    name: 'Logs',
    systemVariables: ['totalFlow', 'totalPressure'],
    motorVariables: ['status', 'enabled'], // Basic info for logs
    motors: [1, 2, 3, 4, 5, 6, 7]
  },
  
  alarms: {
    name: 'Alarms',
    systemVariables: ['totalFlow', 'totalPressure', 'oilTemperature', 'tankLevel', 'aquaSensor'],
    motorVariables: ['status', 'temperature', 'lineFilter', 'suctionFilter', 'leak'], // Alarm-related
    motors: [1, 2, 3, 4, 5, 6, 7]
  },
  
  stats: {
    name: 'Statistics', 
    systemVariables: ['totalFlow', 'totalPressure', 'oilTemperature'],
    motorVariables: ['rpm', 'current', 'pressure', 'flow', 'temperature', 'status'], // Performance metrics
    motors: [1, 2, 3, 4, 5, 6, 7]
  }
} as const;

// Utility functions
export const generateMotorVariableName = (variablePattern: string, motorId: number): string => {
  return variablePattern.replace('MOTOR_X_', `MOTOR_${motorId}_`);
};

export const getVariablesForPage = (pageKey: keyof typeof PAGE_VARIABLE_SETS): string[] => {
  const pageConfig = PAGE_VARIABLE_SETS[pageKey];
  const variables: string[] = [];
  
  // Add system variables
  pageConfig.systemVariables.forEach(sysVar => {
    const systemVar = SYSTEM_VARIABLES.find(v => v.frontendKey === sysVar);
    if (systemVar) {
      variables.push(systemVar.opcVariableName);
    }
  });
  
  // Add motor variables for specified motors
  pageConfig.motors.forEach(motorId => {
    pageConfig.motorVariables.forEach(motorVar => {
      const motorVarDef = MOTOR_VARIABLES.find(v => v.frontendKey === motorVar);
      if (motorVarDef) {
        variables.push(generateMotorVariableName(motorVarDef.opcVariableName, motorId));
      }
    });
  });
  
  return variables;
};

export const createVariableRequestMap = (): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  
  Object.keys(PAGE_VARIABLE_SETS).forEach(pageKey => {
    result[pageKey] = getVariablesForPage(pageKey as keyof typeof PAGE_VARIABLE_SETS);
  });
  
  return result;
};