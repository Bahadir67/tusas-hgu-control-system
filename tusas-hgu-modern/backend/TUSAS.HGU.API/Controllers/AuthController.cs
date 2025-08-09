using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TUSAS.HGU.Core.Models;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Controllers
{
    /// <summary>
    /// Authentication controller for TUSAŞ HGU Control System
    /// Provides JWT-based authentication endpoints for industrial SCADA access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly ILogService _logService;

        public AuthController(AuthService authService, ILogger<AuthController> logger, ILogService logService)
        {
            _authService = authService;
            _logger = logger;
            _logService = logService;
        }

        /// <summary>
        /// Authenticate user and return JWT token
        /// POST /api/auth/login
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("🔐 Invalid login request from {IP}", GetClientIpAddress());
                    return BadRequest(new LoginResponse 
                    { 
                        Success = false, 
                        Message = "Invalid request format" 
                    });
                }

                _logger.LogInformation("🔐 Login attempt for user: {Username} from {IP}", 
                    request.Username, GetClientIpAddress());

                // Authenticate user
                var result = await _authService.AuthenticateAsync(
                    request, 
                    GetClientIpAddress(), 
                    GetUserAgent()
                );

                if (result.Success)
                {
                    _logger.LogInformation("✅ Login successful for user: {Username}", request.Username);
                    
                    // Log to database
                    await _logService.LogAsync(
                        username: request.Username,
                        category: LogCategory.AUTH,
                        action: "LOGIN",
                        target: "System",
                        result: LogResult.SUCCESS,
                        ipAddress: GetClientIpAddress(),
                        userAgent: GetUserAgent()
                    );
                    
                    return Ok(result);
                }
                else
                {
                    _logger.LogWarning("❌ Login failed for user: {Username} - {Message}", 
                        request.Username, result.Message);
                    
                    // Log failed attempt to database
                    await _logService.LogAsync(
                        username: request.Username,
                        category: LogCategory.AUTH,
                        action: "LOGIN_FAILED",
                        target: "System",
                        result: LogResult.ERROR,
                        errorMessage: result.Message,
                        ipAddress: GetClientIpAddress(),
                        userAgent: GetUserAgent()
                    );
                    
                    return Unauthorized(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Login error for user: {Username}", request.Username);
                return StatusCode(500, new LoginResponse 
                { 
                    Success = false, 
                    Message = "Internal server error" 
                });
            }
        }

        /// <summary>
        /// Logout current user and revoke session
        /// POST /api/auth/logout
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult<object>> Logout()
        {
            try
            {
                var tokenId = HttpContext.User.FindFirst("TokenId")?.Value;
                var username = HttpContext.User.Identity?.Name;

                if (string.IsNullOrEmpty(tokenId))
                {
                    _logger.LogWarning("🔐 Logout attempt with missing token ID for user: {Username}", username);
                    return BadRequest(new { success = false, message = "Invalid session" });
                }

                _logger.LogInformation("🔐 Logout attempt for user: {Username}", username);

                var success = await _authService.LogoutAsync(
                    tokenId, 
                    GetClientIpAddress(), 
                    GetUserAgent()
                );

                if (success)
                {
                    _logger.LogInformation("✅ Logout successful for user: {Username}", username);
                    
                    // Log to database
                    await _logService.LogAsync(
                        username: username,
                        category: LogCategory.AUTH,
                        action: "LOGOUT",
                        target: "System",
                        result: LogResult.SUCCESS,
                        ipAddress: GetClientIpAddress(),
                        userAgent: GetUserAgent()
                    );
                    
                    return Ok(new { success = true, message = "Logout successful" });
                }
                else
                {
                    _logger.LogWarning("❌ Logout failed for user: {Username}", username);
                    
                    // Log failed logout to database
                    await _logService.LogAsync(
                        username: username,
                        category: LogCategory.AUTH,
                        action: "LOGOUT_FAILED",
                        target: "System",
                        result: LogResult.ERROR,
                        ipAddress: GetClientIpAddress(),
                        userAgent: GetUserAgent()
                    );
                    
                    return BadRequest(new { success = false, message = "Logout failed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Logout error for user: {Username}", HttpContext.User.Identity?.Name);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Refresh JWT token
        /// POST /api/auth/refresh
        /// </summary>
        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.RefreshToken))
                {
                    return BadRequest(new LoginResponse 
                    { 
                        Success = false, 
                        Message = "Invalid token data" 
                    });
                }

                _logger.LogInformation("🔄 Token refresh attempt from {IP}", GetClientIpAddress());

                // TODO: Implement refresh token logic
                // For now, return unauthorized to force re-login
                return Unauthorized(new LoginResponse 
                { 
                    Success = false, 
                    Message = "Token refresh not implemented - please re-login" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Token refresh error");
                return StatusCode(500, new LoginResponse 
                { 
                    Success = false, 
                    Message = "Token refresh failed" 
                });
            }
        }

        /// <summary>
        /// Get current user profile
        /// GET /api/auth/profile
        /// </summary>
        [HttpGet("profile")]
        [Authorize]
        public ActionResult<UserInfo> GetProfile()
        {
            try
            {
                var userId = HttpContext.User.FindFirst("UserId")?.Value;
                var username = HttpContext.User.Identity?.Name;
                var role = HttpContext.User.FindFirst("Role")?.Value;
                var fullName = HttpContext.User.FindFirst("FullName")?.Value;

                if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
                {
                    _logger.LogWarning("🔐 Invalid user ID in token for user: {Username}", username);
                    return Unauthorized();
                }

                var userInfo = new UserInfo
                {
                    Id = id,
                    Username = username ?? "",
                    Role = role ?? "operator",
                    FullName = fullName,
                    Permissions = GetUserPermissions(role ?? "operator")
                };

                return Ok(userInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error getting user profile");
                return StatusCode(500);
            }
        }

        /// <summary>
        /// Validate JWT token
        /// GET /api/auth/validate
        /// </summary>
        [HttpGet("validate")]
        [Authorize]
        public async Task<ActionResult<object>> ValidateToken()
        {
            try
            {
                var tokenId = HttpContext.User.FindFirst("TokenId")?.Value;
                var username = HttpContext.User.Identity?.Name;
                var userId = HttpContext.User.FindFirst("UserId")?.Value;
                var role = HttpContext.User.FindFirst("Role")?.Value;
                
                if (string.IsNullOrEmpty(tokenId) || string.IsNullOrEmpty(username))
                {
                    return Unauthorized(new { valid = false, message = "Invalid token" });
                }

                // Token is valid (JWT middleware already validated it)
                return Ok(new 
                { 
                    valid = true,
                    username = username,
                    userId = userId,
                    role = role,
                    tokenId = tokenId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error validating token");
                return StatusCode(500, new { valid = false, message = "Validation error" });
            }
        }

        /// <summary>
        /// Check if user is authenticated
        /// GET /api/auth/check
        /// </summary>
        [HttpGet("check")]
        [AllowAnonymous]
        public ActionResult<object> CheckAuth()
        {
            try
            {
                var isAuthenticated = HttpContext.User.Identity?.IsAuthenticated ?? false;
                var username = HttpContext.User.Identity?.Name;

                if (isAuthenticated)
                {
                    return Ok(new 
                    { 
                        authenticated = true, 
                        username = username,
                        timestamp = DateTime.UtcNow 
                    });
                }
                else
                {
                    return Ok(new 
                    { 
                        authenticated = false,
                        timestamp = DateTime.UtcNow 
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error checking authentication status");
                return StatusCode(500);
            }
        }

        /// <summary>
        /// Get system information (for login page)
        /// GET /api/auth/system-info
        /// </summary>
        [HttpGet("system-info")]
        [AllowAnonymous]
        public ActionResult<object> GetSystemInfo()
        {
            try
            {
                return Ok(new
                {
                    systemName = "TUSAŞ HGU Control System",
                    version = "v2.0",
                    description = "Industrial Hydraulic Ground Unit Control System",
                    company = "Turkish Aerospace Industries (TUSAŞ)",
                    timestamp = DateTime.UtcNow,
                    serverTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    requiresAuthentication = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error getting system info");
                return StatusCode(500);
            }
        }

        /// <summary>
        /// Get client IP address
        /// </summary>
        private string? GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ??
                   Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
                   Request.Headers["X-Real-IP"].FirstOrDefault();
        }

        /// <summary>
        /// Get user agent string
        /// </summary>
        private string? GetUserAgent()
        {
            return Request.Headers["User-Agent"].FirstOrDefault();
        }

        /// <summary>
        /// Get user permissions based on role
        /// </summary>
        private List<string> GetUserPermissions(string role)
        {
            return role.ToLower() switch
            {
                "admin" => new List<string> 
                { 
                    "opc.read", "opc.write", "system.admin", 
                    "user.manage", "audit.view", "system.configure" 
                },
                "operator" => new List<string> 
                { 
                    "opc.read", "opc.write", "system.operate" 
                },
                "viewer" => new List<string> 
                { 
                    "opc.read", "system.view" 
                },
                _ => new List<string> { "system.view" }
            };
        }
    }
}