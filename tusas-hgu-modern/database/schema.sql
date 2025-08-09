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
-- Password: admin123 and dev123 (will be hashed in application)
INSERT OR REPLACE INTO Users (Id, Username, PasswordHash, Salt, Role, FullName, Email, IsActive) VALUES 
(1, 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 'admin', 'System Administrator', 'admin@tusas.com', 1),
(2, 'developer', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 'admin', 'System Developer', 'developer@tusas.com', 1);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(Username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON Sessions(TokenId);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON Sessions(UserId, IsActive);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AuthAuditLog(Timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON AuthAuditLog(UserId);