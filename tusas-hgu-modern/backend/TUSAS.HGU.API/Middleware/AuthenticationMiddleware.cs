using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Middleware
{
    /// <summary>
    /// Custom authentication middleware for TUSAŞ HGU Control System
    /// Blocks all OPC endpoints until user is properly authenticated
    /// </summary>
    public class AuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly AuthService _authService;
        private readonly ILogger<AuthenticationMiddleware> _logger;

        // Protected endpoints that require authentication
        private readonly HashSet<string> _protectedPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/opc",
            "/api/system",
            "/api/data"
        };

        // Public endpoints that don't require authentication
        private readonly HashSet<string> _publicPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/auth/login",
            "/api/auth/system-info",
            "/api/auth/check"
        };

        public AuthenticationMiddleware(RequestDelegate next, AuthService authService, ILogger<AuthenticationMiddleware> logger)
        {
            _next = next;
            _authService = authService;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? "";
            var method = context.Request.Method;

            _logger.LogDebug("🔍 Request: {Method} {Path} from {IP}", 
                method, path, GetClientIpAddress(context));

            // Allow public paths without authentication
            if (IsPublicPath(path))
            {
                await _next(context);
                return;
            }

            // Allow static files and non-API requests
            if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            // Check if this is a protected endpoint
            if (IsProtectedPath(path))
            {
                _logger.LogInformation("🔐 Protected endpoint access attempt: {Path} from {IP}", 
                    path, GetClientIpAddress(context));

                // Extract and validate JWT token
                var authResult = await ValidateAuthenticationAsync(context);
                
                if (!authResult.IsAuthenticated)
                {
                    _logger.LogWarning("❌ Unauthorized access to {Path}: {Reason}", 
                        path, authResult.ErrorMessage);
                    
                    await WriteUnauthorizedResponse(context, authResult.ErrorMessage);
                    return;
                }

                // Add user information to context for controllers
                SetUserContext(context, authResult);
                
                _logger.LogDebug("✅ Authenticated access: {Username} → {Path}", 
                    authResult.Username, path);
            }

            // Continue to next middleware
            await _next(context);
        }

        /// <summary>
        /// Check if path is public (doesn't require authentication)
        /// </summary>
        private bool IsPublicPath(string path)
        {
            return _publicPaths.Any(publicPath => 
                path.StartsWith(publicPath, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Check if path is protected (requires authentication)
        /// </summary>
        private bool IsProtectedPath(string path)
        {
            return _protectedPaths.Any(protectedPath => 
                path.StartsWith(protectedPath, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Validate JWT token from Authorization header
        /// </summary>
        private async Task<AuthenticationResult> ValidateAuthenticationAsync(HttpContext context)
        {
            try
            {
                // Extract Authorization header
                var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

                _logger.LogDebug("🔍 DETAILED Authorization check:");
                _logger.LogDebug("  - Header value: '{Header}'", authHeader ?? "NULL");
                _logger.LogDebug("  - Header starts with Bearer: {StartsWithBearer}", authHeader?.StartsWith("Bearer ") ?? false);
                _logger.LogDebug("  - All request headers: {@Headers}", context.Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()));
                _logger.LogDebug("  - Client IP: {IP}", GetClientIpAddress(context));

                if (string.IsNullOrEmpty(authHeader))
                {
                    _logger.LogWarning("❌ Missing Authorization header for protected path");
                    return new AuthenticationResult
                    {
                        IsAuthenticated = false,
                        ErrorMessage = "Missing Authorization header"
                    };
                }

                // Check Bearer token format
                if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    return new AuthenticationResult 
                    { 
                        IsAuthenticated = false, 
                        ErrorMessage = "Invalid Authorization header format" 
                    };
                }

                // Extract token
                var token = authHeader.Substring(7); // Remove "Bearer "
                
                if (string.IsNullOrEmpty(token))
                {
                    return new AuthenticationResult 
                    { 
                        IsAuthenticated = false, 
                        ErrorMessage = "Missing JWT token" 
                    };
                }

                // Validate token with AuthService
                var validationResult = await _authService.ValidateTokenAsync(token);

                _logger.LogDebug("🔍 Token validation result:");
                _logger.LogDebug("  - IsValid: {IsValid}", validationResult.IsValid);
                _logger.LogDebug("  - UserId: {UserId}", validationResult.UserId);
                _logger.LogDebug("  - Username: {Username}", validationResult.Username);
                _logger.LogDebug("  - ErrorMessage: {ErrorMessage}", validationResult.ErrorMessage);

                if (validationResult.IsValid)
                {
                    return new AuthenticationResult
                    {
                        IsAuthenticated = true,
                        UserId = validationResult.UserId ?? 0,
                        Username = validationResult.Username ?? "",
                        Role = validationResult.Role ?? "",
                        TokenId = validationResult.TokenId ?? ""
                    };
                }
                else
                {
                    _logger.LogWarning("❌ Token validation failed: {Error}", validationResult.ErrorMessage);
                    return new AuthenticationResult
                    {
                        IsAuthenticated = false,
                        ErrorMessage = validationResult.ErrorMessage ?? "Token validation failed"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Authentication validation error");
                return new AuthenticationResult
                {
                    IsAuthenticated = false,
                    ErrorMessage = "Authentication service error"
                };
            }
        }

        /// <summary>
        /// Set user context in HttpContext for controllers
        /// </summary>
        private void SetUserContext(HttpContext context, AuthenticationResult authResult)
        {
            var claims = new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, authResult.Username),
                new System.Security.Claims.Claim("UserId", authResult.UserId.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, authResult.Role),
                new System.Security.Claims.Claim("TokenId", authResult.TokenId)
            };

            var identity = new System.Security.Claims.ClaimsIdentity(claims, "jwt");
            var principal = new System.Security.Claims.ClaimsPrincipal(identity);
            
            context.User = principal;
        }

        /// <summary>
        /// Write unauthorized response
        /// </summary>
        private async Task WriteUnauthorizedResponse(HttpContext context, string message)
        {
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                error = "Unauthorized",
                message = message,
                timestamp = DateTime.UtcNow,
                requiresAuth = true,
                loginUrl = "/login"
            };

            var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(jsonResponse);
        }

        /// <summary>
        /// Get client IP address
        /// </summary>
        private string? GetClientIpAddress(HttpContext context)
        {
            return context.Connection.RemoteIpAddress?.ToString() ??
                   context.Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
                   context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }
    }

    /// <summary>
    /// Authentication result for middleware processing
    /// </summary>
    public class AuthenticationResult
    {
        public bool IsAuthenticated { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string TokenId { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }
}