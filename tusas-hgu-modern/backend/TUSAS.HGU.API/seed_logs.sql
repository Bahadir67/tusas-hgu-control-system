-- Seed data for SystemLogs table
-- Test ve demo amaçlı örnek log kayıtları

-- Bugünün tarihi için log kayıtları
INSERT INTO SystemLogs (Timestamp, Username, Category, Action, Target, OldValue, NewValue, Result, IpAddress, Details) VALUES
-- Authentication logs
(datetime('now', '-2 hours'), 'admin', 'AUTH', 'LOGIN', 'System', NULL, NULL, 'SUCCESS', '192.168.1.100', '{"browser":"Chrome","os":"Windows"}'),
(datetime('now', '-1 hours 45 minutes'), 'operator1', 'AUTH', 'LOGIN', 'System', NULL, NULL, 'SUCCESS', '192.168.1.101', NULL),
(datetime('now', '-1 hours 30 minutes'), 'technician', 'AUTH', 'LOGIN_FAILED', 'System', NULL, NULL, 'ERROR', '192.168.1.102', '{"reason":"Invalid password"}'),
(datetime('now', '-1 hours 29 minutes'), 'technician', 'AUTH', 'LOGIN', 'System', NULL, NULL, 'SUCCESS', '192.168.1.102', NULL),

-- User Management
(datetime('now', '-1 hours 15 minutes'), 'admin', 'USER_MGMT', 'CREATE_USER', 'operator2', NULL, 'operator2', 'SUCCESS', '192.168.1.100', '{"role":"operator","email":"op2@tusas.com"}'),
(datetime('now', '-1 hours'), 'admin', 'USER_MGMT', 'UPDATE_USER', 'technician', 'technician', 'senior_technician', 'SUCCESS', '192.168.1.100', '{"field":"role"}'),
(datetime('now', '-45 minutes'), 'admin', 'USER_MGMT', 'DISABLE_USER', 'operator3', 'active', 'disabled', 'SUCCESS', '192.168.1.100', NULL),

-- Calibration logs
(datetime('now', '-40 minutes'), 'technician', 'CALIBRATION', 'PRESSURE_SENSOR_CALIBRATION', 'MOTOR_1_PRESSURE_SENSOR', '125.3', '125.5', 'SUCCESS', '192.168.1.102', '{"duration_ms":1500,"deviation":0.2}'),
(datetime('now', '-38 minutes'), 'technician', 'CALIBRATION', 'FLOW_SENSOR_CALIBRATION', 'MOTOR_2_FLOW_SENSOR', '75.8', '75.0', 'SUCCESS', '192.168.1.102', '{"duration_ms":2000}'),
(datetime('now', '-35 minutes'), 'technician', 'CALIBRATION', 'TEMPERATURE_SENSOR_CHECK', 'MOTOR_3_TEMP_SENSOR', '45.2', '45.2', 'SUCCESS', '192.168.1.102', '{"status":"Within tolerance"}'),

-- System operations
(datetime('now', '-30 minutes'), 'operator1', 'SYSTEM', 'SYSTEM_START', 'MAIN_SYSTEM', 'STOPPED', 'RUNNING', 'SUCCESS', '192.168.1.101', NULL),
(datetime('now', '-28 minutes'), 'operator1', 'SYSTEM', 'MOTOR_START', 'MOTOR_1', 'OFF', 'ON', 'SUCCESS', '192.168.1.101', '{"rpm":1500}'),
(datetime('now', '-27 minutes'), 'operator1', 'SYSTEM', 'MOTOR_START', 'MOTOR_2', 'OFF', 'ON', 'SUCCESS', '192.168.1.101', '{"rpm":1500}'),
(datetime('now', '-26 minutes'), 'operator1', 'SYSTEM', 'MOTOR_START', 'MOTOR_3', 'OFF', 'ON', 'SUCCESS', '192.168.1.101', '{"rpm":1450}'),
(datetime('now', '-25 minutes'), 'operator1', 'OPC', 'SETPOINT_CHANGE', 'MOTOR_1_PRESSURE_SETPOINT', '120', '125', 'SUCCESS', '192.168.1.101', NULL),
(datetime('now', '-24 minutes'), 'operator1', 'OPC', 'SETPOINT_CHANGE', 'MOTOR_2_FLOW_SETPOINT', '70', '75', 'SUCCESS', '192.168.1.101', NULL),

-- Maintenance logs
(datetime('now', '-20 minutes'), 'technician', 'MAINTENANCE', 'FILTER_REPLACEMENT', 'MOTOR_1_LINE_FILTER', 'OLD_FILTER_123', 'NEW_FILTER_456', 'SUCCESS', '192.168.1.102', '{"work_order":"WO-2024-089"}'),
(datetime('now', '-18 minutes'), 'technician', 'MAINTENANCE', 'OIL_LEVEL_CHECK', 'MAIN_TANK', '85%', '85%', 'SUCCESS', '192.168.1.102', '{"status":"Normal"}'),
(datetime('now', '-15 minutes'), 'technician', 'MAINTENANCE', 'LEAK_TEST', 'MOTOR_2', NULL, 'NO_LEAK', 'SUCCESS', '192.168.1.102', '{"test_pressure":"150 bar","duration":"5 min"}'),

-- Alarm logs
(datetime('now', '-12 minutes'), 'System', 'ALARM', 'HIGH_TEMPERATURE_ALARM', 'MOTOR_3', NULL, '68°C', 'WARNING', NULL, '{"threshold":"65°C"}'),
(datetime('now', '-11 minutes'), 'operator1', 'ALARM', 'ALARM_ACKNOWLEDGE', 'MOTOR_3_HIGH_TEMP', NULL, 'ACKNOWLEDGED', 'SUCCESS', '192.168.1.101', NULL),
(datetime('now', '-10 minutes'), 'operator1', 'SYSTEM', 'MOTOR_STOP', 'MOTOR_3', 'ON', 'OFF', 'SUCCESS', '192.168.1.101', '{"reason":"High temperature"}'),
(datetime('now', '-9 minutes'), 'System', 'ALARM', 'ALARM_CLEARED', 'MOTOR_3_HIGH_TEMP', 'ACTIVE', 'CLEARED', 'SUCCESS', NULL, NULL),

-- Configuration changes
(datetime('now', '-8 minutes'), 'admin', 'CONFIG', 'SYSTEM_CONFIG_UPDATE', 'COOLING_SETTINGS', '30-60°C', '25-55°C', 'SUCCESS', '192.168.1.100', '{"reason":"Summer mode"}'),
(datetime('now', '-7 minutes'), 'admin', 'CONFIG', 'ALARM_THRESHOLD_UPDATE', 'HIGH_PRESSURE_LIMIT', '150', '155', 'SUCCESS', '192.168.1.100', NULL),
(datetime('now', '-6 minutes'), 'admin', 'CONFIG', 'BACKUP_CREATED', 'SYSTEM_CONFIG', NULL, 'config_backup_20240807.json', 'SUCCESS', '192.168.1.100', '{"size":"125KB"}'),

-- Security logs
(datetime('now', '-5 minutes'), 'unknown', 'SECURITY', 'UNAUTHORIZED_ACCESS', 'API_ENDPOINT', NULL, '/api/opc/write', 'ERROR', '192.168.1.150', '{"blocked":true}'),
(datetime('now', '-4 minutes'), 'admin', 'SECURITY', 'PASSWORD_CHANGE', 'admin', NULL, NULL, 'SUCCESS', '192.168.1.100', NULL),
(datetime('now', '-3 minutes'), 'admin', 'AUDIT', 'LOG_EXPORT', 'SYSTEM_LOGS', NULL, 'logs_20240807.csv', 'SUCCESS', '192.168.1.100', '{"records":1523}'),

-- Recent operations
(datetime('now', '-2 minutes'), 'operator1', 'SYSTEM', 'EMERGENCY_STOP', 'ALL_MOTORS', 'RUNNING', 'STOPPED', 'SUCCESS', '192.168.1.101', '{"reason":"Test procedure"}'),
(datetime('now', '-1 minutes'), 'operator1', 'SYSTEM', 'SYSTEM_RESET', 'MAIN_SYSTEM', NULL, 'READY', 'SUCCESS', '192.168.1.101', NULL),

-- Current session
(datetime('now'), 'operator1', 'AUTH', 'LOGOUT', 'System', NULL, NULL, 'SUCCESS', '192.168.1.101', NULL);

-- Dünün log kayıtları (opsiyonel - daha fazla veri için)
INSERT INTO SystemLogs (Timestamp, Username, Category, Action, Target, OldValue, NewValue, Result, IpAddress, Details) VALUES
(datetime('now', '-1 day'), 'admin', 'BACKUP', 'DAILY_BACKUP', 'DATABASE', NULL, 'backup_20240806.db', 'SUCCESS', '192.168.1.100', '{"size":"45MB","duration":"30s"}'),
(datetime('now', '-1 day 2 hours'), 'technician', 'MAINTENANCE', 'ROUTINE_CHECK', 'MOTOR_1', NULL, 'COMPLETED', 'SUCCESS', '192.168.1.102', '{"checklist":"MC-101"}'),
(datetime('now', '-1 day 4 hours'), 'operator2', 'CALIBRATION', 'WEEKLY_CALIBRATION', 'ALL_SENSORS', NULL, 'COMPLETED', 'SUCCESS', '192.168.1.103', '{"total_sensors":18,"passed":18}');