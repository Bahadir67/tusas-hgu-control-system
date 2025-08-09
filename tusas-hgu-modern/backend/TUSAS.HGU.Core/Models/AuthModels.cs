using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TUSAS.HGU.Core.Models
{
    // User entity for database
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        [JsonIgnore] // Never serialize password hash
        public string PasswordHash { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string Salt { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string Role { get; set; } = "operator";
        
        [StringLength(100)]
        public string? FullName { get; set; }
        
        [StringLength(100)]
        public string? Email { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LastLoginAt { get; set; }
        
        public int LoginAttempts { get; set; } = 0;
        
        public DateTime? LockedUntil { get; set; }
    }

    /// <summary>
    /// Login request model
    /// </summary>
    public class LoginRequest
    {
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Password { get; set; } = string.Empty;
        
        public bool RememberMe { get; set; } = false;
    }

    /// <summary>
    /// Login response model
    /// </summary>
    public class LoginResponse
    {
        public bool Success { get; set; }
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime ExpiresAt { get; set; }
        public UserInfo? User { get; set; }
        public string? Message { get; set; }
    }

    /// <summary>
    /// User info for client-side display
    /// </summary>
    public class UserInfo
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
    }

    /// <summary>
    /// Token refresh request
    /// </summary>
    public class RefreshTokenRequest
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// JWT token validation result
    /// </summary>
    public class TokenValidationResult
    {
        public bool IsValid { get; set; }
        public string? Username { get; set; }
        public int? UserId { get; set; }
        public string? Role { get; set; }
        public string? TokenId { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Authentication configuration settings
    /// </summary>
    public class AuthSettings
    {
        public string JwtSecret { get; set; } = string.Empty;
        public string JwtIssuer { get; set; } = "TUSAS.HGU.API";
        public string JwtAudience { get; set; } = "TUSAS.HGU.Client";
        public int TokenExpirationMinutes { get; set; } = 480; // 8 hours
        public int RefreshTokenExpirationDays { get; set; } = 30;
        public string DatabasePath { get; set; } = string.Empty;
        public bool RequireHttps { get; set; } = false;
        public int MaxConcurrentSessions { get; set; } = 5;
        public bool EnableAuditLog { get; set; } = true;
    }
}