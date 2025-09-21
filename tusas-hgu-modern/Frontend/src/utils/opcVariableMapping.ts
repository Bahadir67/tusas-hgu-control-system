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

// Motor-specific variables (X = motor number 1-7) - CORRECTED TO MATCH REAL PLC DB
export const MOTOR_VARIABLES: OpcVariableDefinition[] = [
  {
    frontendKey: 'rpm',
    displayName: 'RPM göstergesi',
    opcVariableName: 'MOTOR_X_RPM_ACTUAL',
    dataType: 'REAL',
    unit: 'RPM',
    isMotorSpecific: true
  },
  {
    frontendKey: 'pressure',
    displayName: 'Basınç göstergesi',
    opcVariableName: 'PUMP_X_PRESSURE_ACTUAL',
    dataType: 'REAL',
    unit: 'Bar',
    isMotorSpecific: true
  },
  {
    frontendKey: 'flow',
    displayName: 'Debi göstergesi',
    opcVariableName: 'PUMP_X_FLOW_ACTUAL',
    dataType: 'REAL',
    unit: 'L/Min',
    isMotorSpecific: true
  },
  {
    frontendKey: 'current',
    displayName: 'Akım göstergesi',
    opcVariableName: 'MOTOR_X_CURRENT_A',
    dataType: 'REAL',
    unit: 'A',
    isMotorSpecific: true
  },
  {
    frontendKey: 'temperature',
    displayName: 'Sıcaklık göstergesi',
    opcVariableName: 'MOTOR_X_TEMPERATURE_C',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: true
  },
  {
    frontendKey: 'status',
    displayName: 'Motor durumu',
    opcVariableName: 'MOTOR_X_STATUS',
    dataType: 'USINT',
    isMotorSpecific: true
  },
  {
    frontendKey: 'enabled',
    displayName: 'Motor aktif/pasif',
    opcVariableName: 'MOTOR_X_ENABLE',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'lineFilter',
    displayName: 'Hat filtresi',
    opcVariableName: 'PUMP_X_LINE_FILTER_STATUS',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'suctionFilter',
    displayName: 'Emme filtresi',
    opcVariableName: 'PUMP_X_SUCTION_FILTER_STATUS',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'manualValve',
    displayName: 'Manuel vana durumu',
    opcVariableName: 'PUMP_X_MANUAL_VALVE_STATUS',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'targetRpm',
    displayName: 'Hedef RPM',
    opcVariableName: 'MOTOR_X_RPM_SETPOINT',
    dataType: 'REAL',
    unit: 'RPM',
    isMotorSpecific: true
  },
  {
    frontendKey: 'pressureSetpoint',
    displayName: 'Basınç setpoint',
    opcVariableName: 'PUMP_X_PRESSURE_SETPOINT',
    dataType: 'REAL',
    unit: 'Bar',
    isMotorSpecific: true
  },
  {
    frontendKey: 'flowSetpoint',
    displayName: 'Debi setpoint',
    opcVariableName: 'PUMP_X_FLOW_SETPOINT',
    dataType: 'REAL',
    unit: 'L/Min',
    isMotorSpecific: true
  },
  {
    frontendKey: 'leak',
    displayName: 'Sızıntı miktarı',
    opcVariableName: 'PUMP_X_LEAK_RATE',
    dataType: 'REAL',
    unit: 'L/Min',
    isMotorSpecific: true
  },
  {
    frontendKey: 'errorCode',
    displayName: 'Motor hata kodu',
    opcVariableName: 'MOTOR_X_ERROR_CODE',
    dataType: 'USINT',
    isMotorSpecific: true
  },
  {
    frontendKey: 'startCmd',
    displayName: 'Motor başlatma komutu',
    opcVariableName: 'MOTOR_X_START_CMD',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'stopCmd',
    displayName: 'Motor durdurma komutu',
    opcVariableName: 'MOTOR_X_STOP_CMD',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'resetCmd',
    displayName: 'Motor reset komutu',
    opcVariableName: 'MOTOR_X_RESET_CMD',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'startAck',
    displayName: 'Motor başlatma onayı',
    opcVariableName: 'MOTOR_X_START_ACK',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'stopAck',
    displayName: 'Motor durdurma onayı',
    opcVariableName: 'MOTOR_X_STOP_ACK',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'resetAck',
    displayName: 'Motor reset onayı',
    opcVariableName: 'MOTOR_X_RESET_ACK',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'operatingHours',
    displayName: 'Çalışma saati',
    opcVariableName: 'MOTOR_X_OPERATING_HOURS',
    dataType: 'REAL',
    unit: 'hours',
    isMotorSpecific: true
  },
  {
    frontendKey: 'maintenanceDue',
    displayName: 'Bakım zamanı',
    opcVariableName: 'MOTOR_X_MAINTENANCE_DUE',
    dataType: 'BOOL',
    isMotorSpecific: true
  },
  {
    frontendKey: 'maintenanceHours',
    displayName: 'Bakım saati limiti',
    opcVariableName: 'MOTOR_X_MAINTENANCE_HOURS',
    dataType: 'REAL',
    unit: 'hours',
    isMotorSpecific: true
  }
];

// System-wide variables - CORRECTED TO MATCH REAL PLC DB
export const SYSTEM_VARIABLES: OpcVariableDefinition[] = [
  {
    frontendKey: 'systemStatus',
    displayName: 'Sistem durumu',
    opcVariableName: 'SYSTEM_STATUS',
    dataType: 'USINT',
    isMotorSpecific: false
  },
  {
    frontendKey: 'systemSafetyStatus',
    displayName: 'Sistem güvenlik durumu',
    opcVariableName: 'SYSTEM_SAFETY_STATUS',
    dataType: 'USINT',
    isMotorSpecific: false
  },
  {
    frontendKey: 'emergencyStop',
    displayName: 'Acil durdurma',
    opcVariableName: 'EMERGENCY_STOP',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'totalFlow',
    displayName: 'Toplam sistem debisi',
    opcVariableName: 'TOTAL_SYSTEM_FLOW',
    dataType: 'REAL',
    unit: 'L/Min',
    isMotorSpecific: false
  },
  {
    frontendKey: 'totalPressure',
    displayName: 'Toplam sistem basıncı',
    opcVariableName: 'TOTAL_SYSTEM_PRESSURE',
    dataType: 'REAL',
    unit: 'Bar',
    isMotorSpecific: false
  },
  {
    frontendKey: 'pressureAverage',
    displayName: 'Ortalama sistem basıncı',
    opcVariableName: 'SYSTEM_PRESSURE_AVERAGE',
    dataType: 'REAL',
    unit: 'Bar',
    isMotorSpecific: false
  },
  {
    frontendKey: 'activePumps',
    displayName: 'Aktif pompa sayısı',
    opcVariableName: 'SYSTEM_ACTIVE_PUMPS',
    dataType: 'INT',
    isMotorSpecific: false
  },
  {
    frontendKey: 'systemEfficiency',
    displayName: 'Sistem verimliliği',
    opcVariableName: 'SYSTEM_EFFICIENCY',
    dataType: 'REAL',
    unit: '%',
    isMotorSpecific: false
  },
  {
    frontendKey: 'pressureSetpoint',
    displayName: 'Sistem basınç setpoint',
    opcVariableName: 'SYSTEM_PRESSURE_SETPOINT',
    dataType: 'REAL',
    unit: 'Bar',
    isMotorSpecific: false
  },
  {
    frontendKey: 'flowSetpoint',
    displayName: 'Sistem debi setpoint',
    opcVariableName: 'SYSTEM_FLOW_SETPOINT',
    dataType: 'REAL',
    unit: 'L/Min',
    isMotorSpecific: false
  },
  {
    frontendKey: 'oilTemperature',
    displayName: 'Tank yağ sıcaklığı',
    opcVariableName: 'TANK_OIL_TEMPERATURE',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'tankLevel',
    displayName: 'Tank seviyesi',
    opcVariableName: 'TANK_LEVEL_PERCENT',
    dataType: 'REAL',
    unit: '%',
    isMotorSpecific: false
  },
  {
    frontendKey: 'aquaSensor',
    displayName: 'Su sensörü',
    opcVariableName: 'AQUA_SENSOR_LEVEL',
    dataType: 'REAL',
    unit: '%',
    isMotorSpecific: false
  },
  {
    frontendKey: 'chillerInletTemp',
    displayName: 'Chiller giriş sıcaklığı',
    opcVariableName: 'CHILLER_INLET_TEMPERATURE',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'chillerOutletTemp',
    displayName: 'Chiller çıkış sıcaklığı',
    opcVariableName: 'CHILLER_OUTLET_TEMPERATURE',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'tankMinLevel',
    displayName: 'Tank minimum seviye',
    opcVariableName: 'TANK_MIN_LEVEL',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'tankMaxLevel',
    displayName: 'Tank maksimum seviye',
    opcVariableName: 'TANK_MAX_LEVEL',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'chillerWaterFlowStatus',
    displayName: 'Chiller su akış durumu',
    opcVariableName: 'CHILLER_WATER_FLOW_STATUS',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  // Communication and Error Variables
  {
    frontendKey: 'canCommunicationActive',
    displayName: 'CAN haberleşme aktif',
    opcVariableName: 'CAN_COMMUNICATION_ACTIVE',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'canTcpConnected',
    displayName: 'CAN TCP bağlantı durumu',
    opcVariableName: 'CAN_TCP_CONNECTED',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'canActiveDeviceCount',
    displayName: 'CAN aktif cihaz sayısı',
    opcVariableName: 'CAN_ACTIVE_DEVICE_COUNT',
    dataType: 'USINT',
    isMotorSpecific: false
  },
  {
    frontendKey: 'canSystemError',
    displayName: 'CAN sistem hatası',
    opcVariableName: 'CAN_SYSTEM_ERROR',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'pressureSafetyValvesEnable',
    displayName: 'Basınç emniyet valfleri aktif',
    opcVariableName: 'PRESSURE_SAFETY_VALVES_ENABLE',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'pressureSafetyValvesCommOk',
    displayName: 'Basınç emniyet valfleri haberleşme',
    opcVariableName: 'PRESSURE_SAFETY_VALVES_COMM_OK',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  // Error Management Variables
  {
    frontendKey: 'systemErrorActive',
    displayName: 'Sistem hata aktif',
    opcVariableName: 'SYSTEM_ERROR_ACTIVE',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'criticalSafetyError',
    displayName: 'Kritik güvenlik hatası',
    opcVariableName: 'CRITICAL_SAFETY_ERROR',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  {
    frontendKey: 'anyMotorError',
    displayName: 'Herhangi bir motor hatası',
    opcVariableName: 'ANY_MOTOR_ERROR',
    dataType: 'BOOL',
    isMotorSpecific: false
  },
  // Oil Temperature Control Setpoints
  {
    frontendKey: 'minOilTempSetpoint',
    displayName: 'Min yağ sıcaklığı setpoint',
    opcVariableName: 'COOLING_MIN_OIL_TEMP_SETPOINT',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: false
  },
  {
    frontendKey: 'maxOilTempSetpoint',
    displayName: 'Max yağ sıcaklığı setpoint',
    opcVariableName: 'COOLING_MAX_OIL_TEMP_SETPOINT',
    dataType: 'REAL',
    unit: 'C',
    isMotorSpecific: false
  },
  // System Control
  {
    frontendKey: 'systemEnable',
    displayName: 'Sistem aktif/pasif',
    opcVariableName: 'SYSTEM_ENABLE',
    dataType: 'BOOL',
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
    systemVariables: [
      'totalFlow', 'totalPressure', 'activePumps', 
      'oilTemperature', 'minOilTempSetpoint', 'maxOilTempSetpoint',
      'tankLevel', 'aquaSensor', 'chillerInletTemp', 'chillerOutletTemp', 'chillerWaterFlowStatus',
      'systemEnable'
    ], // System overview + Tank & Cooling data + System Control
    motorVariables: [], // NO motors on main page
    motors: [] // NO motors on main page
  },
  
  motors: {
    name: 'Motors Page',
    systemVariables: ['totalFlow', 'totalPressure'],
    motorVariables: ['rpm', 'targetRpm', 'pressure', 'pressureSetpoint', 'flow', 'flowSetpoint', 'current', 'temperature', 'status', 'enabled', 'manualValve', 'lineFilter', 'suctionFilter', 'leak', 'errorCode', 'operatingHours', 'maintenanceDue', 'maintenanceHours'],
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
    systemVariables: ['totalFlow', 'totalPressure', 'oilTemperature', 'tankLevel', 'aquaSensor', 'waterTemperature', 'coolingSystemStatus', 'coolingPumpStatus', 'alarmHighPressure', 'alarmLowPressure', 'alarmHighTemperature', 'alarmLowTankLevel', 'alarmSystemFailure', 'alarmCommunicationLoss'],
    motorVariables: ['status', 'temperature', 'lineFilter', 'suctionFilter', 'leak', 'current', 'pressure', 'rpm', 'errorCode', 'alarmWord'], // Comprehensive alarm monitoring with error codes
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
  return variablePattern
    .replace('MOTOR_X_', `MOTOR_${motorId}_`)
    .replace('PUMP_X_', `PUMP_${motorId}_`);
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