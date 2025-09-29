using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;

namespace TUSAS.HGU.API.Middleware
{
    /// <summary>
    /// Global Exception Handler Middleware - Eliminates exception handling duplication
    /// </summary>
    public class GlobalExceptionHandler
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandler> _logger;

        public GlobalExceptionHandler(RequestDelegate next, ILogger<GlobalExceptionHandler> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            _logger.LogError(exception, "Global exception occurred: {Message}", exception.Message);

            var response = context.Response;
            response.ContentType = "application/json";

            var result = new ErrorResponse
            {
                Success = false,
                Error = exception.Message,
                Timestamp = DateTime.Now,
                TraceId = context.TraceIdentifier
            };

            // Determine status code based on exception type
            response.StatusCode = exception switch
            {
                ArgumentException => (int)HttpStatusCode.BadRequest,
                UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                KeyNotFoundException => (int)HttpStatusCode.NotFound,
                InvalidOperationException => (int)HttpStatusCode.BadRequest,
                TimeoutException => (int)HttpStatusCode.RequestTimeout,
                _ => (int)HttpStatusCode.InternalServerError
            };

            await response.WriteAsJsonAsync(result);
        }
    }

    /// <summary>
    /// Standardized error response format
    /// </summary>
    public class ErrorResponse
    {
        public bool Success { get; set; }
        public string Error { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string TraceId { get; set; } = string.Empty;
        public Dictionary<string, object>? Details { get; set; }
    }

    /// <summary>
    /// Extension methods for consistent error responses
    /// </summary>
    public static class ControllerExtensions
    {
        /// <summary>
        /// Creates a standardized success response
        /// </summary>
        public static IActionResult SuccessResponse<T>(this ControllerBase controller, T data, string message = "Operation successful")
        {
            return controller.Ok(new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Message = message,
                Timestamp = DateTime.Now
            });
        }

        /// <summary>
        /// Creates a standardized error response
        /// </summary>
        public static IActionResult ErrorResponse(this ControllerBase controller, string message, HttpStatusCode statusCode = HttpStatusCode.InternalServerError)
        {
            return controller.StatusCode((int)statusCode, new ApiResponse<object>
            {
                Success = false,
                Message = message,
                Timestamp = DateTime.Now
            });
        }

        /// <summary>
        /// Creates a standardized validation error response
        /// </summary>
        public static IActionResult ValidationErrorResponse(this ControllerBase controller, string message, Dictionary<string, object> validationErrors)
        {
            return controller.BadRequest(new ApiResponse<Dictionary<string, object>>
            {
                Success = false,
                Message = message,
                Data = validationErrors,
                Timestamp = DateTime.Now
            });
        }
    }

    /// <summary>
    /// Standardized API response wrapper
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public DateTime Timestamp { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }
}