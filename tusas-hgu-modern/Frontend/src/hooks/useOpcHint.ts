import { useMemo } from 'react';
import { useOpcHints } from '../store/settingsStore';

// OPC variable mapping helper functions
export const getMotorOpcVariable = (motorId: number, property: string): string => {
  const motorVariableMap: Record<string, string> = {
    // Actual values
    'rpm': `MOTOR_${motorId}_RPM_ACTUAL`,
    'current': `MOTOR_${motorId}_CURRENT_A`,
    'temperature': `MOTOR_${motorId}_TEMPERATURE_C`,
    'status': `MOTOR_${motorId}_STATUS`,
    'enabled': `MOTOR_${motorId}_ENABLE`,
    'errorCode': `MOTOR_${motorId}_ERROR_CODE`,
    
    // Pump values
    'flow': `PUMP_${motorId}_FLOW_ACTUAL`,
    'pressure': `PUMP_${motorId}_PRESSURE_ACTUAL`,
    'leak': `PUMP_${motorId}_LEAK_RATE`,
    'lineFilter': `PUMP_${motorId}_LINE_FILTER_STATUS`,
    'suctionFilter': `PUMP_${motorId}_SUCTION_FILTER_STATUS`,
    'manualValve': `PUMP_${motorId}_MANUAL_VALVE_STATUS`,
    
    // Setpoints
    'targetRpm': `MOTOR_${motorId}_RPM_SETPOINT`,
    'flowSetpoint': `PUMP_${motorId}_FLOW_SETPOINT`,
    'pressureSetpoint': `PUMP_${motorId}_PRESSURE_SETPOINT`,
    
    // Commands
    'startCmd': `MOTOR_${motorId}_START_CMD`,
    'stopCmd': `MOTOR_${motorId}_STOP_CMD`,
    'resetCmd': `MOTOR_${motorId}_RESET_CMD`,
    'startAck': `MOTOR_${motorId}_START_ACK`,
    'stopAck': `MOTOR_${motorId}_STOP_ACK`,
    'resetAck': `MOTOR_${motorId}_RESET_ACK`,
    
    // Maintenance
    'operatingHours': `MOTOR_${motorId}_OPERATING_HOURS`,
    'maintenanceDue': `MOTOR_${motorId}_MAINTENANCE_DUE`,
    'maintenanceHours': `MOTOR_${motorId}_MAINTENANCE_HOURS`,
  };
  
  return motorVariableMap[property] || `UNKNOWN_MOTOR_${motorId}_${property.toUpperCase()}`;
};

export const getSystemOpcVariable = (property: string): string => {
  const systemVariableMap: Record<string, string> = {
    // System Status
    'systemStatus': 'SYSTEM_STATUS',
    'systemSafetyStatus': 'SYSTEM_SAFETY_STATUS',
    'emergencyStop': 'EMERGENCY_STOP',
    
    // Flow & Pressure
    'totalFlow': 'TOTAL_SYSTEM_FLOW',
    'totalPressure': 'TOTAL_SYSTEM_PRESSURE',
    'pressureAverage': 'SYSTEM_PRESSURE_AVERAGE',
    'activePumps': 'SYSTEM_ACTIVE_PUMPS',
    'systemEfficiency': 'SYSTEM_EFFICIENCY',
    
    // Setpoints
    'pressureSetpoint': 'SYSTEM_PRESSURE_SETPOINT',
    'flowSetpoint': 'SYSTEM_FLOW_SETPOINT',
    
    // Temperature & Tank
    'oilTemperature': 'SYSTEM_TEMPERATURE',
    'tankLevel': 'TANK_LEVEL_PERCENT',
    'aquaSensor': 'AQUA_SENSOR_LEVEL',
    'chillerInletTemp': 'CHILLER_INLET_TEMPERATURE',
    'chillerOutletTemp': 'CHILLER_OUTLET_TEMPERATURE',
    
    // Tank Status
    'tankMinLevel': 'TANK_MIN_LEVEL',
    'tankMaxLevel': 'TANK_MAX_LEVEL',
    'chillerWaterFlowStatus': 'CHILLER_WATER_FLOW_STATUS',
    
    // Communication
    'canCommunicationActive': 'CAN_COMMUNICATION_ACTIVE',
    'canTcpConnected': 'CAN_TCP_CONNECTED',
    'canActiveDeviceCount': 'CAN_ACTIVE_DEVICE_COUNT',
    'canSystemError': 'CAN_SYSTEM_ERROR',
    
    // Safety Valves
    'pressureSafetyValvesEnable': 'PRESSURE_SAFETY_VALVES_ENABLE',
    'pressureSafetyValvesCommOk': 'PRESSURE_SAFETY_VALVES_COMM_OK',
    
    // Error Management
    'systemErrorActive': 'SYSTEM_ERROR_ACTIVE',
    'criticalSafetyError': 'CRITICAL_SAFETY_ERROR',
    'anyMotorError': 'ANY_MOTOR_ERROR',
    
    // Backward compatibility (deprecated)
    'statusExecution': 'SYSTEM_STATUS', // Deprecated
    'totalFlowSetpoint': 'SYSTEM_FLOW_SETPOINT', // Deprecated
    'waterTemperature': 'CHILLER_INLET_TEMPERATURE', // Deprecated
    'coolingFlowRate': 'CHILLER_WATER_FLOW_STATUS', // Deprecated
    'coolingSystemStatus': 'SYSTEM_STATUS', // Deprecated
    'coolingPumpStatus': 'CHILLER_WATER_FLOW_STATUS', // Deprecated
  };
  
  return systemVariableMap[property] || `UNKNOWN_SYSTEM_${property.toUpperCase()}`;
};

// Special variables for valve and safety systems
export const getValveOpcVariable = (valveId: number, property: string): string => {
  const valveVariableMap: Record<string, string> = {
    'position': `BYPASS_VLV_${valveId}_POSITION`,
    'command': `BYPASS_VLV_${valveId}_COMMAND`,
    'feedback': `BYPASS_VLV_${valveId}_FEEDBACK`,
    'error': `BYPASS_VLV_${valveId}_ERROR`,
  };
  
  return valveVariableMap[property] || `UNKNOWN_VALVE_${valveId}_${property.toUpperCase()}`;
};

export const getHsmOpcVariable = (hsmId: number, property: string): string => {
  const hsmVariableMap: Record<string, string> = {
    'pressure': `HSM_${hsmId}_PRESSURE_ACTUAL`,
    'setpoint': `HSM_${hsmId}_PRESSURE_SETPOINT`,
    'status': `HSM_${hsmId}_STATUS`,
  };
  
  return hsmVariableMap[property] || `UNKNOWN_HSM_${hsmId}_${property.toUpperCase()}`;
};


// Main hook for generating OPC hints
export const useOpcHint = (opcVariable: string): string => {
  const showOpcHints = useOpcHints();
  
  return useMemo(() => {
    if (!showOpcHints) {
      return '';
    }
    
    // Simple tooltip showing only OPC variable name
    return `OPC: ${opcVariable}`;
  }, [opcVariable, showOpcHints]);
};

// Specialized hooks for motor data
export const useMotorOpcHint = (
  motorId: number,
  property: string
): string => {
  const opcVariable = getMotorOpcVariable(motorId, property);
  return useOpcHint(opcVariable);
};

// Specialized hooks for system data
export const useSystemOpcHint = (
  property: string
): string => {
  const opcVariable = getSystemOpcVariable(property);
  return useOpcHint(opcVariable);
};

// Specialized hooks for valve data
export const useValveOpcHint = (
  valveId: number,
  property: string
): string => {
  const opcVariable = getValveOpcVariable(valveId, property);
  return useOpcHint(opcVariable);
};

// Specialized hooks for HSM data
export const useHsmOpcHint = (
  hsmId: number,
  property: string
): string => {
  const opcVariable = getHsmOpcVariable(hsmId, property);
  return useOpcHint(opcVariable);
};

// Utility hook for creating multiple hints at once
export const useMotorAllHints = (motorId: number) => {
  return useMemo(() => ({
    rpm: useMotorOpcHint(motorId, 'rpm'),
    current: useMotorOpcHint(motorId, 'current'),
    temperature: useMotorOpcHint(motorId, 'temperature'),
    status: useMotorOpcHint(motorId, 'status'),
    enabled: useMotorOpcHint(motorId, 'enabled'),
    flow: useMotorOpcHint(motorId, 'flow'),
    pressure: useMotorOpcHint(motorId, 'pressure'),
    leak: useMotorOpcHint(motorId, 'leak'),
    lineFilter: useMotorOpcHint(motorId, 'lineFilter'),
    suctionFilter: useMotorOpcHint(motorId, 'suctionFilter'),
    manualValve: useMotorOpcHint(motorId, 'manualValve'),
    targetRpm: useMotorOpcHint(motorId, 'targetRpm'),
    flowSetpoint: useMotorOpcHint(motorId, 'flowSetpoint'),
    pressureSetpoint: useMotorOpcHint(motorId, 'pressureSetpoint'),
    errorCode: useMotorOpcHint(motorId, 'errorCode'),
    operatingHours: useMotorOpcHint(motorId, 'operatingHours'),
    maintenanceDue: useMotorOpcHint(motorId, 'maintenanceDue'),
  }), [motorId]);
};

// Simple utility function to get OPC variable name only
export const getOpcVariableName = (type: 'motor' | 'system' | 'valve' | 'hsm', id: number | null, property: string): string => {
  switch (type) {
    case 'motor':
      return id ? getMotorOpcVariable(id, property) : `UNKNOWN_MOTOR_${property}`;
    case 'system':
      return getSystemOpcVariable(property);
    case 'valve':
      return id ? getValveOpcVariable(id, property) : `UNKNOWN_VALVE_${property}`;
    case 'hsm':
      return id ? getHsmOpcVariable(id, property) : `UNKNOWN_HSM_${property}`;
    default:
      return `UNKNOWN_${property}`;
  }
};