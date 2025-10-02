using System.Data.SQLite;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using TUSAS.HGU.Core.Models;

namespace TUSAS.HGU.Core.Services
{
    /// <summary>
    /// Authentication service for TUSAŞ HGU Control System
    /// Provides JWT-based authentication with SQLite storage
    /// </summary>
    public class AuthService
    {
        private readonly AuthSettings _authSettings;
        private readonly ILogger<AuthService> _logger;
        private readonly string _connectionString;

        public AuthService(AuthSettings authSettings, ILogger<AuthService> logger)
        {
            _authSettings = authSettings;
            _logger = logger;
            _connectionString = $"Data Source={_authSettings.DatabasePath}";
            
            // Initialize database if it doesn't exist
            InitializeDatabase();
        }

        /// <summary>
        /// Initialize SQLite database and create tables
        /// </summary>
        private void InitializeDatabase()
        {
            try
            {
                using var connection = new SQLiteConnection(_connectionString);
                connection.Open();

                // Read and execute schema
                var schemaPath = Path.Combine(Path.GetDirectoryName(_authSettings.DatabasePath) ?? "", "schema.sql");
                if (File.Exists(schemaPath))
                {
                    var schema = File.ReadAllText(schemaPath);
                    using var command = new SQLiteCommand(schema, connection);
                    command.ExecuteNonQuery();
                    _logger.LogInformation("✅ Authentication database initialized successfully");
                }
                else
                {
                    _logger.LogWarning("⚠️ Schema file not found, creating basic tables");
                    CreateBasicTables(connection);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to initialize authentication database");
                throw;
            }
        }

        /// <summary>
        /// Create basic tables if schema file is missing
        /// </summary>
        private void CreateBasicTables(SQLiteConnection connection)
        {
            var createTablesScript = @"
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

                CREATE TABLE IF NOT EXISTS AuthAuditLog (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    UserId INTEGER,
                    Username TEXT NOT NULL,
                    Action TEXT NOT NULL,
                    IpAddress TEXT,
                    UserAgent TEXT,
                    Details TEXT,
                    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (UserId) REFERENCES Users (Id) ON DELETE SET NULL
                );
            ";

            using var command = new SQLiteCommand(createTablesScript, connection);
            command.ExecuteNonQuery();
        }

        /// <summary>
        /// Authenticate user and return login response
        /// </summary>
        public async Task<LoginResponse> AuthenticateAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null)
        {
            try
            {
                _logger.LogInformation("🔐 Authentication attempt for user: {Username}", request.Username);

                // Get user from database
                var user = await GetUserByUsernameAsync(request.Username);
                if (user == null || !user.IsActive)
                {
                    _logger.LogWarning("🔐 User not found or inactive: {Username}", request.Username);
                    await LogAuthEventAsync(null, request.Username, "LOGIN_FAILED", ipAddress, userAgent, "User not found or inactive");
                    return new LoginResponse
                    {
                        Success = false,
                        Message = "Invalid username or password"
                    };
                }

                _logger.LogInformation("🔐 User found: {Username}, Hash: {Hash}", user.Username, user.PasswordHash?.Substring(0, Math.Min(20, user.PasswordHash?.Length ?? 0)));

                // Verify password
                if (!VerifyPassword(request.Password, user.PasswordHash, user.Salt))
                {
                    _logger.LogWarning("🔐 Password verification failed for user: {Username}", request.Username);
                    await LogAuthEventAsync(user.Id, request.Username, "LOGIN_FAILED", ipAddress, userAgent, "Invalid password");
                    return new LoginResponse
                    {
                        Success = false,
                        Message = "Invalid username or password"
                    };
                }

                _logger.LogInformation("🔐 Password verified successfully for user: {Username}", request.Username);

                // Generate tokens
                var tokenId = Guid.NewGuid().ToString();
                var token = GenerateJwtToken(user, tokenId);
                var refreshToken = GenerateRefreshToken();
                var expiresAt = DateTime.UtcNow.AddMinutes(_authSettings.TokenExpirationMinutes);

                // Clean up old sessions for this user
                await CleanupUserSessionsAsync(user.Id);

                // Create new session
                await CreateSessionAsync(user.Id, tokenId, token, refreshToken, expiresAt, ipAddress, userAgent);

                // Update last login time
                await UpdateLastLoginAsync(user.Id);

                // Log successful authentication
                await LogAuthEventAsync(user.Id, user.Username, "LOGIN_SUCCESS", ipAddress, userAgent, "Successful login");

                _logger.LogInformation("✅ Authentication successful for user: {Username}", request.Username);

                return new LoginResponse
                {
                    Success = true,
                    Token = token,
                    RefreshToken = refreshToken,
                    ExpiresAt = expiresAt,
                    User = new UserInfo
                    {
                        Id = user.Id,
                        Username = user.Username,
                        Role = user.Role,
                        FullName = user.FullName,
                        Email = user.Email,
                        LastLoginAt = user.LastLoginAt
                    },
                    Message = "Authentication successful"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Authentication error for user: {Username}", request.Username);
                await LogAuthEventAsync(null, request.Username, "LOGIN_ERROR", ipAddress, userAgent, ex.Message);
                return new LoginResponse 
                { 
                    Success = false, 
                    Message = "Authentication service error" 
                };
            }
        }

        /// <summary>
        /// Validate JWT token and return validation result
        /// </summary>
        public async Task<Models.TokenValidationResult> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_authSettings.JwtSecret);

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _authSettings.JwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = _authSettings.JwtAudience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                if (validatedToken is JwtSecurityToken jwtToken)
                {
                    var username = principal.FindFirst(ClaimTypes.Name)?.Value;
                    var userIdClaim = principal.FindFirst("UserId")?.Value;
                    var role = principal.FindFirst(ClaimTypes.Role)?.Value;
                    var tokenId = principal.FindFirst("TokenId")?.Value;

                    if (int.TryParse(userIdClaim, out var userId))
                    {
                        // Check if session is still active in database
                        var sessionActive = await IsSessionActiveAsync(tokenId!);
                        if (!sessionActive)
                        {
                            return new Models.TokenValidationResult
                            {
                                IsValid = false,
                                ErrorMessage = "Session has been revoked"
                            };
                        }

                        return new Models.TokenValidationResult
                        {
                            IsValid = true,
                            Username = username,
                            UserId = userId,
                            Role = role,
                            TokenId = tokenId
                        };
                    }
                }

                return new Models.TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Invalid token format"
                };
            }
            catch (SecurityTokenExpiredException)
            {
                return new Models.TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token has expired"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Token validation error");
                return new Models.TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token validation failed"
                };
            }
        }

        /// <summary>
        /// Logout user and revoke session
        /// </summary>
        public async Task<bool> LogoutAsync(string tokenId, string? ipAddress = null, string? userAgent = null)
        {
            try
            {
                _logger.LogInformation("🔍 DEBUG: AuthService.LogoutAsync called with tokenId: {TokenId}", tokenId);

                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                // Get session info for logging
                var sessionQuery = "SELECT UserId FROM Sessions WHERE TokenId = @TokenId AND IsActive = 1";
                using var sessionCommand = new SQLiteCommand(sessionQuery, connection);
                sessionCommand.Parameters.AddWithValue("@TokenId", tokenId);

                _logger.LogInformation("🔍 DEBUG: Executing session query for tokenId: {TokenId}", tokenId);
                var userIdObj = await sessionCommand.ExecuteScalarAsync();
                _logger.LogInformation("🔍 DEBUG: Session query result: {UserIdObj}", userIdObj ?? "NULL");
                if (userIdObj != null && int.TryParse(userIdObj.ToString(), out var userId))
                {
                    _logger.LogInformation("🔍 DEBUG: Found userId: {UserId} for tokenId: {TokenId}", userId, tokenId);

                    // Get username for logging
                    var userQuery = "SELECT Username FROM Users WHERE Id = @UserId";
                    using var userCommand = new SQLiteCommand(userQuery, connection);
                    userCommand.Parameters.AddWithValue("@UserId", userId);
                    var usernameObj = await userCommand.ExecuteScalarAsync();
                    var username = usernameObj?.ToString() ?? "unknown";

                    _logger.LogInformation("🔍 DEBUG: Found username: {Username} for userId: {UserId}", username, userId);

                    // Revoke session
                    var revokeQuery = @"
                        UPDATE Sessions
                        SET IsActive = 0, RevokedAt = @RevokedAt
                        WHERE TokenId = @TokenId";

                    using var revokeCommand = new SQLiteCommand(revokeQuery, connection);
                    revokeCommand.Parameters.AddWithValue("@RevokedAt", DateTime.UtcNow);
                    revokeCommand.Parameters.AddWithValue("@TokenId", tokenId);

                    _logger.LogInformation("🔍 DEBUG: Executing revoke query for tokenId: {TokenId}", tokenId);
                    var affected = await revokeCommand.ExecuteNonQueryAsync();
                    _logger.LogInformation("🔍 DEBUG: Revoke query affected {Affected} rows", affected);

                    if (affected > 0)
                    {
                        _logger.LogInformation("🔍 DEBUG: Logging auth event for user: {Username}", username);
                        await LogAuthEventAsync(userId, username, "LOGOUT", ipAddress, userAgent, "Manual logout");
                        _logger.LogInformation("✅ User logged out successfully: {Username}", username);
                        return true;
                    }
                    else
                    {
                        _logger.LogWarning("⚠️ No rows affected by revoke query for tokenId: {TokenId}", tokenId);
                    }
                }
                else
                {
                    _logger.LogWarning("⚠️ No active session found for tokenId: {TokenId}", tokenId);
                }

                _logger.LogWarning("❌ Logout failed for tokenId: {TokenId}", tokenId);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Logout error for tokenId: {TokenId}", tokenId);
                return false;
            }
        }

        /// <summary>
        /// Generate JWT token for user
        /// </summary>
        private string GenerateJwtToken(User user, string tokenId)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_authSettings.JwtSecret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim("UserId", user.Id.ToString()),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim("TokenId", tokenId),
                    new Claim("FullName", user.FullName ?? ""),
                    new Claim(JwtRegisteredClaimNames.Jti, tokenId),
                    new Claim(JwtRegisteredClaimNames.Iat, 
                        new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(), 
                        ClaimValueTypes.Integer64)
                }),
                Expires = DateTime.UtcNow.AddMinutes(_authSettings.TokenExpirationMinutes),
                Issuer = _authSettings.JwtIssuer,
                Audience = _authSettings.JwtAudience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key), 
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Generate refresh token
        /// </summary>
        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        /// <summary>
        /// Verify password using BCrypt
        /// </summary>
        private bool VerifyPassword(string password, string hash, string salt)
        {
            try
            {
                _logger.LogInformation("🔐 Verifying password - Hash starts with: {HashPrefix}", hash?.Substring(0, Math.Min(10, hash?.Length ?? 0)));
                var result = BCrypt.Net.BCrypt.Verify(password, hash);
                _logger.LogInformation("🔐 BCrypt.Verify result: {Result}", result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🔐 BCrypt verification error");
                return false;
            }
        }

        /// <summary>
        /// Get user by username from database
        /// </summary>
        private async Task<User?> GetUserByUsernameAsync(string username)
        {
            using var connection = new SQLiteConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                SELECT Id, Username, PasswordHash, Salt, Role, FullName, Email, IsActive, 
                       CreatedAt, UpdatedAt, LastLoginAt
                FROM Users 
                WHERE Username = @Username";

            using var command = new SQLiteCommand(query, connection);
            command.Parameters.AddWithValue("@Username", username);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new User
                {
                    Id = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    PasswordHash = reader.GetString(2),
                    Salt = reader.GetString(3),
                    Role = reader.GetString(4),
                    FullName = reader.IsDBNull(5) ? null : reader.GetString(5),
                    Email = reader.IsDBNull(6) ? null : reader.GetString(6),
                    IsActive = Convert.ToBoolean(reader.GetInt32(7)),
                    CreatedAt = DateTime.Parse(reader.GetString(8)),
                    UpdatedAt = DateTime.Parse(reader.GetString(9)),
                    LastLoginAt = reader.IsDBNull(10) ? null : DateTime.Parse(reader.GetString(10))
                };
            }

            return null;
        }

        /// <summary>
        /// Create session in database
        /// </summary>
        private async Task CreateSessionAsync(int userId, string tokenId, string jwtToken, 
            string refreshToken, DateTime expiresAt, string? ipAddress, string? userAgent)
        {
            using var connection = new SQLiteConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                INSERT INTO Sessions (UserId, TokenId, JwtToken, RefreshToken, ExpiresAt, IpAddress, UserAgent)
                VALUES (@UserId, @TokenId, @JwtToken, @RefreshToken, @ExpiresAt, @IpAddress, @UserAgent)";

            using var command = new SQLiteCommand(query, connection);
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@TokenId", tokenId);
            command.Parameters.AddWithValue("@JwtToken", jwtToken);
            command.Parameters.AddWithValue("@RefreshToken", refreshToken);
            command.Parameters.AddWithValue("@ExpiresAt", expiresAt);
            command.Parameters.AddWithValue("@IpAddress", ipAddress ?? "");
            command.Parameters.AddWithValue("@UserAgent", userAgent ?? "");

            await command.ExecuteNonQueryAsync();
        }

        /// <summary>
        /// Check if session is active
        /// </summary>
        private async Task<bool> IsSessionActiveAsync(string tokenId)
        {
            using var connection = new SQLiteConnection(_connectionString);
            await connection.OpenAsync();

            var query = "SELECT COUNT(*) FROM Sessions WHERE TokenId = @TokenId AND IsActive = 1 AND ExpiresAt > @Now";
            using var command = new SQLiteCommand(query, connection);
            command.Parameters.AddWithValue("@TokenId", tokenId);
            command.Parameters.AddWithValue("@Now", DateTime.UtcNow);

            var count = (long)(await command.ExecuteScalarAsync() ?? 0L);
            return count > 0;
        }

        /// <summary>
        /// Update user's last login time
        /// </summary>
        private async Task UpdateLastLoginAsync(int userId)
        {
            using var connection = new SQLiteConnection(_connectionString);
            await connection.OpenAsync();

            var query = "UPDATE Users SET LastLoginAt = @LastLoginAt WHERE Id = @UserId";
            using var command = new SQLiteCommand(query, connection);
            command.Parameters.AddWithValue("@LastLoginAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("@UserId", userId);

            await command.ExecuteNonQueryAsync();
        }

        /// <summary>
        /// Clean up old sessions for user
        /// </summary>
        private async Task CleanupUserSessionsAsync(int userId)
        {
            using var connection = new SQLiteConnection(_connectionString);
            await connection.OpenAsync();

            // Revoke old sessions, keep only the most recent ones
            var query = @"
                UPDATE Sessions 
                SET IsActive = 0, RevokedAt = @RevokedAt
                WHERE UserId = @UserId 
                AND Id NOT IN (
                    SELECT Id FROM Sessions 
                    WHERE UserId = @UserId 
                    ORDER BY CreatedAt DESC 
                    LIMIT @MaxSessions
                )";

            using var command = new SQLiteCommand(query, connection);
            command.Parameters.AddWithValue("@RevokedAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@MaxSessions", _authSettings.MaxConcurrentSessions);

            await command.ExecuteNonQueryAsync();
        }

        /// <summary>
        /// Log authentication event
        /// </summary>
        private async Task LogAuthEventAsync(int? userId, string username, string action, 
            string? ipAddress, string? userAgent, string? details)
        {
            if (!_authSettings.EnableAuditLog) return;

            try
            {
                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    INSERT INTO AuthAuditLog (UserId, Username, Action, IpAddress, UserAgent, Details)
                    VALUES (@UserId, @Username, @Action, @IpAddress, @UserAgent, @Details)";

                using var command = new SQLiteCommand(query, connection);
                command.Parameters.AddWithValue("@UserId", userId?.ToString() ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@Username", username);
                command.Parameters.AddWithValue("@Action", action);
                command.Parameters.AddWithValue("@IpAddress", ipAddress ?? "");
                command.Parameters.AddWithValue("@UserAgent", userAgent ?? "");
                command.Parameters.AddWithValue("@Details", details ?? "");

                await command.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to log authentication event: {Action} for {Username}", action, username);
            }
        }
    }
}