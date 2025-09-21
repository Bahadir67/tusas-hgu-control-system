using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MaintenanceController : ControllerBase
    {
        private readonly ILogger<MaintenanceController> _logger;
        private readonly string _connectionString;

        public MaintenanceController(ILogger<MaintenanceController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? 
                              "Data Source=tusas_hgu_auth.db;";
        }

        /// <summary>
        /// Log a maintenance record
        /// </summary>
        [HttpPost("log")]
        public async Task<IActionResult> LogMaintenance([FromBody] MaintenanceLogRequest request)
        {
            try
            {
                _logger.LogInformation("Logging maintenance for Motor {MotorId} by {TechnicianId}", 
                                     request.MotorId, request.TechnicianId);

                using var connection = new SqliteConnection(_connectionString);
                await connection.OpenAsync();

                // Insert maintenance record
                var insertSql = @"
                    INSERT INTO MaintenanceHistory (
                        MotorId, TechnicianId, MaintenanceType, Description, 
                        OperatingHoursAtMaintenance, MaintenanceDate, CreatedAt, Status
                    ) VALUES (
                        @MotorId, @TechnicianId, @MaintenanceType, @Description,
                        @OperatingHoursAtMaintenance, @MaintenanceDate, @CreatedAt, @Status
                    )";

                using var command = new SqliteCommand(insertSql, connection);
                command.Parameters.AddWithValue("@MotorId", request.MotorId);
                command.Parameters.AddWithValue("@TechnicianId", request.TechnicianId);
                command.Parameters.AddWithValue("@MaintenanceType", request.MaintenanceType);
                command.Parameters.AddWithValue("@Description", request.Description ?? "");
                command.Parameters.AddWithValue("@OperatingHoursAtMaintenance", request.OperatingHoursAtMaintenance);
                command.Parameters.AddWithValue("@MaintenanceDate", request.MaintenanceDate.ToString("yyyy-MM-ddTHH:mm:ssZ"));
                command.Parameters.AddWithValue("@CreatedAt", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ssZ"));
                command.Parameters.AddWithValue("@Status", "Completed");

                await command.ExecuteNonQueryAsync();

                _logger.LogInformation("Maintenance logged successfully to database for Motor {MotorId}", request.MotorId);

                return Ok(new
                {
                    success = true,
                    message = "Maintenance logged successfully",
                    timestamp = DateTime.Now,
                    motorId = request.MotorId,
                    technicianId = request.TechnicianId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging maintenance for Motor {MotorId}", request.MotorId);
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Get maintenance history for a motor
        /// </summary>
        [HttpGet("history/{motorId}")]
        [AllowAnonymous] // Allow anonymous access for history viewing
        public async Task<IActionResult> GetMaintenanceHistory(int motorId)
        {
            try
            {
                using var connection = new SqliteConnection(_connectionString);
                await connection.OpenAsync();

                var selectSql = @"
                    SELECT 
                        Id, MotorId, TechnicianId, MaintenanceType, Description,
                        OperatingHoursAtMaintenance, MaintenanceDate, CreatedAt, Status
                    FROM MaintenanceHistory 
                    WHERE MotorId = @MotorId 
                    ORDER BY MaintenanceDate DESC
                    LIMIT 50";

                using var command = new SqliteCommand(selectSql, connection);
                command.Parameters.AddWithValue("@MotorId", motorId);

                var history = new List<object>();
                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    history.Add(new
                    {
                        Id = reader.GetInt32(0),
                        MotorId = reader.GetInt32(1),
                        TechnicianId = reader.GetString(2),
                        MaintenanceType = reader.GetString(3),
                        Description = reader.IsDBNull(4) ? "" : reader.GetString(4),
                        OperatingHoursAtMaintenance = reader.IsDBNull(5) ? 0.0 : reader.GetDouble(5),
                        MaintenanceDate = reader.GetString(6),
                        CreatedAt = reader.GetString(7),
                        Status = reader.GetString(8),
                        // Format date for display
                        FormattedDate = DateTime.Parse(reader.GetString(6)).ToString("dd.MM.yyyy HH:mm")
                    });
                }

                _logger.LogInformation("Retrieved {Count} maintenance records for Motor {MotorId}", history.Count, motorId);

                return Ok(new
                {
                    motorId,
                    history,
                    count = history.Count,
                    timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting maintenance history for Motor {MotorId}", motorId);
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    public class MaintenanceLogRequest
    {
        public int MotorId { get; set; }
        public string TechnicianId { get; set; } = string.Empty;
        public string MaintenanceType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double OperatingHoursAtMaintenance { get; set; }
        public DateTime MaintenanceDate { get; set; }
    }
}