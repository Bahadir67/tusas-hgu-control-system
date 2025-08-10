using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/logs")]
    [Authorize]
    public class LogController : ControllerBase
    {
        private readonly ILogService _logService;
        private readonly IConfiguration _configuration;

        public LogController(ILogService logService, IConfiguration configuration)
        {
            _logService = logService;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] LogFilterDto filter)
        {
            try
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value;
                
                // Log the query action
                await _logService.LogAsync(
                    username: username,
                    category: LogCategory.AUDIT,
                    action: "VIEW_LOGS",
                    target: $"Page {filter.Page}",
                    ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers["User-Agent"].ToString()
                );

                var logFilter = new LogFilter
                {
                    StartDate = filter.StartDate,
                    EndDate = filter.EndDate,
                    Username = filter.Username,
                    Category = filter.Category,
                    Action = filter.Action,
                    Result = filter.Result,
                    SearchTerm = filter.SearchTerm,
                    Page = filter.Page ?? 1,
                    PageSize = filter.PageSize ?? 50
                };

                var logs = await _logService.GetLogsAsync(logFilter);
                var totalCount = await _logService.GetLogCountAsync(logFilter);

                return Ok(new
                {
                    success = true,
                    data = logs,
                    totalCount = totalCount,
                    page = logFilter.Page,
                    pageSize = logFilter.PageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / logFilter.PageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("export")]
        public async Task<IActionResult> ExportLogs([FromBody] LogFilterDto filter)
        {
            try
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value;
                
                // Log the export action
                await _logService.LogAsync(
                    username: username,
                    category: LogCategory.AUDIT,
                    action: "EXPORT_LOGS",
                    target: $"{filter.StartDate?.ToString("yyyy-MM-dd")} to {filter.EndDate?.ToString("yyyy-MM-dd")}",
                    ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers["User-Agent"].ToString()
                );

                var logFilter = new LogFilter
                {
                    StartDate = filter.StartDate,
                    EndDate = filter.EndDate,
                    Username = filter.Username,
                    Category = filter.Category,
                    Action = filter.Action,
                    Result = filter.Result,
                    SearchTerm = filter.SearchTerm,
                    Page = 1,
                    PageSize = int.MaxValue // Get all logs for export
                };

                var logs = await _logService.GetLogsAsync(logFilter);
                
                // Create CSV content
                var csv = new System.Text.StringBuilder();
                csv.AppendLine("Timestamp,Username,Category,Action,Target,OldValue,NewValue,Result,ErrorMessage,Duration");
                
                foreach (var log in logs)
                {
                    csv.AppendLine($"{log.Timestamp:yyyy-MM-dd HH:mm:ss},{log.Username},{log.Category}," +
                                 $"{log.Action},{log.Target},{log.OldValue},{log.NewValue}," +
                                 $"{log.Result},{log.ErrorMessage},{log.Duration}");
                }

                var bytes = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
                return File(bytes, "text/csv", $"system_logs_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteLogs([FromQuery] DateTime? beforeDate)
        {
            try
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value;
                
                // Log the delete action
                await _logService.LogAsync(
                    username: username,
                    category: LogCategory.AUDIT,
                    action: "DELETE_LOGS",
                    target: beforeDate?.ToString("yyyy-MM-dd") ?? "ALL",
                    result: LogResult.WARNING,
                    ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers["User-Agent"].ToString()
                );

                var success = await _logService.DeleteLogsAsync(beforeDate);
                
                if (success)
                {
                    return Ok(new { success = true, message = "Logs deleted successfully" });
                }
                else
                {
                    return StatusCode(500, new { success = false, message = "Failed to delete logs" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("categories")]
        public IActionResult GetCategories()
        {
            var categories = Enum.GetNames(typeof(LogCategory));
            return Ok(new { success = true, data = categories });
        }

        [HttpGet("results")]
        public IActionResult GetResults()
        {
            var results = Enum.GetNames(typeof(LogResult));
            return Ok(new { success = true, data = results });
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestLog()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            
            // Create multiple test logs for different categories
            var testLogs = new[]
            {
                new { category = LogCategory.MAINTENANCE, action = "PREVENTIVE_MAINTENANCE", target = "Motor 1 Pump System", message = "Scheduled maintenance completed" },
                new { category = LogCategory.MAINTENANCE, action = "COMPONENT_REPLACEMENT", target = "Valve V-101", message = "Valve seal replaced" },
                new { category = LogCategory.CALIBRATION, action = "PRESSURE_CALIBRATION", target = "Sensor P-205", message = "Pressure sensor calibrated" },
                new { category = LogCategory.ALARM, action = "ALARM_TRIGGERED", target = "High Temperature", message = "Temperature exceeded threshold" },
                new { category = LogCategory.SYSTEM, action = "SYSTEM_STARTUP", target = "Main Controller", message = "System initialization completed" }
            };

            foreach (var testLog in testLogs)
            {
                await _logService.LogAsync(
                    username: username,
                    category: testLog.category,
                    action: testLog.action,
                    target: testLog.target,
                    newValue: testLog.message,
                    result: LogResult.SUCCESS,
                    ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers["User-Agent"].ToString(),
                    details: new Dictionary<string, object>
                    {
                        { "test", true },
                        { "timestamp", DateTime.Now },
                        { "category_test", testLog.category.ToString() }
                    }
                );
            }

            return Ok(new { success = true, message = $"Created {testLogs.Length} test logs for different categories" });
        }
    }

    public class LogFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Username { get; set; }
        public LogCategory? Category { get; set; }
        public string? Action { get; set; }
        public LogResult? Result { get; set; }
        public string? SearchTerm { get; set; }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }
}