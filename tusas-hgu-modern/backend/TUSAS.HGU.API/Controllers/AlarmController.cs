using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TUSAS.HGU.Core.Models;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AlarmController : ControllerBase
    {
        private readonly AlarmService _alarmService;
        private readonly ILogger<AlarmController> _logger;

        public AlarmController(AlarmService alarmService, ILogger<AlarmController> logger)
        {
            _alarmService = alarmService;
            _logger = logger;
        }

        /// <summary>
        /// Get all active alarms with optional filtering
        /// </summary>
        [HttpGet("active")]
        public ActionResult<List<AlarmEntry>> GetActiveAlarms([FromQuery] AlarmFilter? filter = null)
        {
            try
            {
                var activeAlarms = _alarmService.GetActiveAlarms();
                
                if (filter != null)
                {
                    activeAlarms = ApplyFilter(activeAlarms, filter);
                }

                _logger.LogDebug("Retrieved {Count} active alarms", activeAlarms.Count);
                return Ok(activeAlarms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active alarms");
                return StatusCode(500, new { error = "Failed to retrieve active alarms", details = ex.Message });
            }
        }

        /// <summary>
        /// Get alarm history with pagination and filtering
        /// </summary>
        [HttpGet("history")]
        public ActionResult<List<AlarmEntry>> GetAlarmHistory([FromQuery] AlarmFilter? filter = null)
        {
            try
            {
                var maxResults = filter?.MaxResults ?? 100;
                var alarmHistory = _alarmService.GetAlarmHistory(maxResults);
                
                if (filter != null)
                {
                    alarmHistory = ApplyFilter(alarmHistory, filter);
                    
                    if (filter.Skip > 0)
                    {
                        alarmHistory = alarmHistory.Skip(filter.Skip).ToList();
                    }
                }

                _logger.LogDebug("Retrieved {Count} historical alarms", alarmHistory.Count);
                return Ok(alarmHistory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alarm history");
                return StatusCode(500, new { error = "Failed to retrieve alarm history", details = ex.Message });
            }
        }

        /// <summary>
        /// Get alarm summary for dashboard
        /// </summary>
        [HttpGet("summary")]
        public ActionResult<AlarmSummary> GetAlarmSummary()
        {
            try
            {
                var activeAlarms = _alarmService.GetActiveAlarms();
                
                var summary = new AlarmSummary
                {
                    TotalActive = activeAlarms.Count,
                    CriticalCount = activeAlarms.Count(a => a.Severity == AlarmSeverity.CRITICAL),
                    HighCount = activeAlarms.Count(a => a.Severity == AlarmSeverity.HIGH),
                    WarningCount = activeAlarms.Count(a => a.Severity == AlarmSeverity.WARNING),
                    InfoCount = activeAlarms.Count(a => a.Severity == AlarmSeverity.INFO),
                    UnacknowledgedCount = activeAlarms.Count(a => a.State == AlarmState.ACTIVE),
                    LastUpdate = DateTime.Now,
                    MostCritical = activeAlarms
                        .Where(a => a.Severity == AlarmSeverity.CRITICAL)
                        .OrderBy(a => a.Timestamp)
                        .Take(5)
                        .ToList()
                };

                _logger.LogDebug("Generated alarm summary: {TotalActive} active, {CriticalCount} critical", 
                    summary.TotalActive, summary.CriticalCount);
                
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating alarm summary");
                return StatusCode(500, new { error = "Failed to generate alarm summary", details = ex.Message });
            }
        }

        /// <summary>
        /// Acknowledge an alarm
        /// </summary>
        [HttpPost("acknowledge")]
        public ActionResult AcknowledgeAlarm([FromBody] AlarmAcknowledgmentRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var success = _alarmService.AcknowledgeAlarm(request.AlarmId);
                
                if (success)
                {
                    _logger.LogInformation("Alarm acknowledged: {AlarmId} by {User}", 
                        request.AlarmId, request.AcknowledgedBy);
                    
                    return Ok(new { success = true, message = "Alarm acknowledged successfully" });
                }
                else
                {
                    _logger.LogWarning("Failed to acknowledge alarm: {AlarmId}", request.AlarmId);
                    return BadRequest(new { success = false, message = "Alarm not found or already acknowledged" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error acknowledging alarm: {AlarmId}", request.AlarmId);
                return StatusCode(500, new { error = "Failed to acknowledge alarm", details = ex.Message });
            }
        }

        /// <summary>
        /// Get alarms by source (motor, system, etc.)
        /// </summary>
        [HttpGet("source/{source}")]
        public ActionResult<List<AlarmEntry>> GetAlarmsBySource(string source)
        {
            try
            {
                var activeAlarms = _alarmService.GetActiveAlarms();
                var sourceAlarms = activeAlarms
                    .Where(a => a.Source.Equals(source, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(a => a.Priority)
                    .ThenBy(a => a.Timestamp)
                    .ToList();

                _logger.LogDebug("Retrieved {Count} alarms for source: {Source}", sourceAlarms.Count, source);
                return Ok(sourceAlarms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alarms for source: {Source}", source);
                return StatusCode(500, new { error = "Failed to retrieve alarms by source", details = ex.Message });
            }
        }

        /// <summary>
        /// Get alarm counts by category
        /// </summary>
        [HttpGet("categories")]
        public ActionResult GetAlarmsByCategory()
        {
            try
            {
                var activeAlarms = _alarmService.GetActiveAlarms();
                var categoryStats = activeAlarms
                    .GroupBy(a => a.Category)
                    .ToDictionary(g => g.Key.ToString(), g => new
                    {
                        Total = g.Count(),
                        Critical = g.Count(a => a.Severity == AlarmSeverity.CRITICAL),
                        High = g.Count(a => a.Severity == AlarmSeverity.HIGH),
                        Warning = g.Count(a => a.Severity == AlarmSeverity.WARNING),
                        Info = g.Count(a => a.Severity == AlarmSeverity.INFO)
                    });

                _logger.LogDebug("Generated category statistics for {CategoryCount} categories", categoryStats.Count);
                return Ok(categoryStats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alarm categories");
                return StatusCode(500, new { error = "Failed to retrieve alarm categories", details = ex.Message });
            }
        }

        /// <summary>
        /// Get current alarm statistics
        /// </summary>
        [HttpGet("stats")]
        public ActionResult GetAlarmStatistics()
        {
            try
            {
                var activeAlarms = _alarmService.GetActiveAlarms();
                var alarmHistory = _alarmService.GetAlarmHistory(1000); // Son 1000 alarm
                
                var stats = new
                {
                    Current = new
                    {
                        Total = activeAlarms.Count,
                        Critical = activeAlarms.Count(a => a.Severity == AlarmSeverity.CRITICAL),
                        High = activeAlarms.Count(a => a.Severity == AlarmSeverity.HIGH),
                        Warning = activeAlarms.Count(a => a.Severity == AlarmSeverity.WARNING),
                        Info = activeAlarms.Count(a => a.Severity == AlarmSeverity.INFO)
                    },
                    Today = new
                    {
                        Total = alarmHistory.Count(a => a.Timestamp.Date == DateTime.Today),
                        Resolved = alarmHistory.Count(a => a.Timestamp.Date == DateTime.Today && a.State == AlarmState.RESOLVED)
                    },
                    TopSources = activeAlarms
                        .GroupBy(a => a.Source)
                        .OrderByDescending(g => g.Count())
                        .Take(5)
                        .ToDictionary(g => g.Key, g => g.Count()),
                    ByCategory = activeAlarms
                        .GroupBy(a => a.Category)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count())
                };

                _logger.LogDebug("Generated comprehensive alarm statistics");
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating alarm statistics");
                return StatusCode(500, new { error = "Failed to generate alarm statistics", details = ex.Message });
            }
        }

        /// <summary>
        /// Health check for alarm system
        /// </summary>
        [HttpGet("health")]
        [AllowAnonymous]
        public ActionResult GetAlarmSystemHealth()
        {
            try
            {
                var activeCount = _alarmService.GetActiveAlarmCount();
                var criticalCount = _alarmService.GetCriticalAlarmCount();
                
                var health = new
                {
                    Status = "Healthy",
                    ActiveAlarms = activeCount,
                    CriticalAlarms = criticalCount,
                    Timestamp = DateTime.Now,
                    SystemStatus = criticalCount > 0 ? "CRITICAL" : activeCount > 0 ? "WARNING" : "NORMAL"
                };

                _logger.LogDebug("Alarm system health check: {Status}, {ActiveAlarms} active, {CriticalAlarms} critical", 
                    health.SystemStatus, activeCount, criticalCount);
                
                return Ok(health);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking alarm system health");
                return StatusCode(500, new { Status = "Unhealthy", Error = ex.Message, Timestamp = DateTime.Now });
            }
        }

        private static List<AlarmEntry> ApplyFilter(List<AlarmEntry> alarms, AlarmFilter filter)
        {
            var query = alarms.AsQueryable();

            if (filter.Severity.HasValue)
                query = query.Where(a => a.Severity == filter.Severity.Value);

            if (filter.State.HasValue)
                query = query.Where(a => a.State == filter.State.Value);

            if (filter.Category.HasValue)
                query = query.Where(a => a.Category == filter.Category.Value);

            if (!string.IsNullOrEmpty(filter.Source))
                query = query.Where(a => a.Source.Contains(filter.Source, StringComparison.OrdinalIgnoreCase));

            if (filter.StartTime.HasValue)
                query = query.Where(a => a.Timestamp >= filter.StartTime.Value);

            if (filter.EndTime.HasValue)
                query = query.Where(a => a.Timestamp <= filter.EndTime.Value);

            if (filter.RequiresOperatorAction.HasValue)
                query = query.Where(a => a.RequiresOperatorAction == filter.RequiresOperatorAction.Value);

            return query.Take(filter.MaxResults).ToList();
        }
    }
}