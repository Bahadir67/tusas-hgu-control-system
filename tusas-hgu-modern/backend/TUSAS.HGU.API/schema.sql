-- TUSAŞ HGU Control System Authentication Database Schema
-- SQLite database schema for user authentication and session management

-- Users table for storing user credentials and profiles
CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT UNIQUE NOT NULL,
    PasswordHash TEXT NOT NULL,
    Salt TEXT NOT NULL,
    Role TEXT NOT NULL DEFAULT 'operator',
    FullName TEXT,
    Email TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    LastLoginAt DATETIME
);

-- Sessions table for JWT token management and tracking
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

-- Audit log for authentication events
CREATE TABLE IF NOT EXISTS AuthAuditLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    Username TEXT NOT NULL,
    Action TEXT NOT NULL, -- LOGIN, LOGOUT, LOGIN_FAILED, TOKEN_REFRESH, PASSWORD_CHANGE
    IpAddress TEXT,
    UserAgent TEXT,
    Details TEXT,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users (Id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON Users (Username);
CREATE INDEX IF NOT EXISTS idx_users_active ON Users (IsActive);
CREATE INDEX IF NOT EXISTS idx_sessions_userid ON Sessions (UserId);
CREATE INDEX IF NOT EXISTS idx_sessions_tokenid ON Sessions (TokenId);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON Sessions (IsActive);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON Sessions (ExpiresAt);
CREATE INDEX IF NOT EXISTS idx_audit_username ON AuthAuditLog (Username);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AuthAuditLog (Timestamp);

-- Insert default users with hashed passwords
-- admin/admin123 and developer/dev123
INSERT OR IGNORE INTO Users (Username, PasswordHash, Salt, Role, FullName, Email, IsActive) VALUES
('admin', 
 '$2a$11$8YqXvjwLGhI7vKQfMKJ7VuPtU5A2eEzKv8XdGw7mRhZE2fAqP7nK2', -- admin123
 'tusas_hgu_salt_admin', 
 'admin', 
 'System Administrator', 
 'admin@tusas.com.tr', 
 1),
('developer', 
 '$2a$11$7RpWxjvmNgH6uJReNJI6UePsT4A1dDyJu7WeGv6lQgYD1eZoO6mJ1', -- dev123
 'tusas_hgu_salt_developer', 
 'developer', 
 'System Developer', 
 'developer@tusas.com.tr', 
 1);

-- Initial audit log entries
INSERT INTO AuthAuditLog (Username, Action, Details, Timestamp) VALUES
('system', 'SYSTEM_INIT', 'Authentication system initialized', CURRENT_TIMESTAMP),
('admin', 'USER_CREATED', 'Default admin user created', CURRENT_TIMESTAMP),
('developer', 'USER_CREATED', 'Default developer user created', CURRENT_TIMESTAMP);