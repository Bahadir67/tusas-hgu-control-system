-- TUSAŞ HGU Control System - Authentication Database Schema
-- Industrial SCADA Security Database

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Salt VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL DEFAULT 'operator',
    FullName VARCHAR(100),
    Email VARCHAR(100),
    IsActive BOOLEAN DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    LastLoginAt DATETIME
);

-- Sessions table for JWT token management
CREATE TABLE IF NOT EXISTS Sessions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    TokenId TEXT UNIQUE NOT NULL,
    JwtToken TEXT NOT NULL,
    RefreshToken TEXT,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    RevokedAt DATETIME,
    IpAddress TEXT,
    UserAgent TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (UserId) REFERENCES Users (Id) ON DELETE CASCADE
);

-- Audit log for security tracking
CREATE TABLE IF NOT EXISTS AuthAuditLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    Username VARCHAR(50) NOT NULL,
    Action VARCHAR(50) NOT NULL,
    IpAddress VARCHAR(45),
    UserAgent TEXT,
    Details TEXT,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users (Id) ON DELETE SET NULL
);

-- Default users: admin and developer (same permissions)
-- Password for both: password (BCrypt hashed with cost 10)
-- Hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT OR REPLACE INTO Users (Id, Username, PasswordHash, Salt, Role, FullName, Email, IsActive) VALUES
(1, 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 'admin', 'System Administrator', 'admin@tusas.com', 1),
(2, 'developer', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 'admin', 'System Developer', 'developer@tusas.com', 1);

-- Maintenance History table for tracking motor maintenance records
CREATE TABLE IF NOT EXISTS MaintenanceHistory (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MotorId INTEGER NOT NULL,
    TechnicianId TEXT NOT NULL,
    MaintenanceType TEXT NOT NULL,
    Description TEXT,
    OperatingHoursAtMaintenance REAL,
    MaintenanceDate TEXT NOT NULL, -- ISO8601 format: 2025-01-19T13:30:00Z
    CreatedAt TEXT DEFAULT (datetime('now')),
    Status TEXT DEFAULT 'Completed'
);

-- Sample maintenance data for testing
INSERT OR IGNORE INTO MaintenanceHistory (Id, MotorId, TechnicianId, MaintenanceType, Description, OperatingHoursAtMaintenance, MaintenanceDate) VALUES
(1, 1, 'TECH_01', 'routine', 'Monthly routine maintenance - filters and oil changed', 950.5, '2024-12-15T10:30:00Z'),
(2, 1, 'TECH_02', 'filter', 'Line filter replacement due to clogging', 1200.2, '2025-01-10T14:15:00Z'),
(3, 2, 'TECH_01', 'emergency', 'Emergency repair - bearing replacement', 800.0, '2024-11-28T09:45:00Z'),
(4, 3, 'TECH_03', 'calibration', 'Pressure sensor calibration', 1500.8, '2025-01-05T11:20:00Z'),
(5, 7, 'TECH_01', 'routine', 'High pressure motor maintenance - softstarter check', 2100.0, '2025-01-15T16:00:00Z');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(Username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON Sessions(TokenId);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON Sessions(UserId, IsActive);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AuthAuditLog(Timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON AuthAuditLog(UserId);

-- Maintenance indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_motor_date ON MaintenanceHistory(MotorId, MaintenanceDate);
CREATE INDEX IF NOT EXISTS idx_maintenance_technician ON MaintenanceHistory(TechnicianId);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON MaintenanceHistory(MaintenanceDate);