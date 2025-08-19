using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InfluxController : ControllerBase
    {
        private readonly InfluxDbService _influxDbService;
        private readonly ILogger<InfluxController> _logger;

        public InfluxController(InfluxDbService influxDbService, ILogger<InfluxController> logger)
        {
            _influxDbService = influxDbService;
            _logger = logger;
        }

        /// <summary>
        /// InfluxDB bağlantı durumunu ve sağlık kontrolü
        /// </summary>
        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            try
            {
                var isConnected = await _influxDbService.CheckConnectionAsync();
                var hasRecentData = await _influxDbService.HasRecentDataAsync(TimeSpan.FromMinutes(5));
                
                var health = new
                {
                    IsHealthy = isConnected,
                    IsConnected = isConnected,
                    HasRecentData = hasRecentData,
                    LastCheck = DateTime.Now,
                    Status = isConnected ? "Healthy" : "Unhealthy",
                    Message = isConnected ? 
                        "InfluxDB is accessible and responding" : 
                        "InfluxDB connection failed"
                };

                var statusCode = isConnected ? 200 : 503;
                _logger.LogInformation("InfluxDB health check - Status: {Status}", health.Status);
                
                return StatusCode(statusCode, health);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during InfluxDB health check");
                return StatusCode(503, new { 
                    IsHealthy = false, 
                    Status = "Unhealthy",
                    Error = ex.Message,
                    LastCheck = DateTime.Now
                });
            }
        }

        /// <summary>
        /// InfluxDB'deki veri istatistikleri
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                // Son 24 saatteki veri sayısı
                var dataCount24h = await _influxDbService.GetDataPointCountAsync();
                
                // Son 1 saatteki veri kontrolü
                var hasRecentData1h = await _influxDbService.HasRecentDataAsync(TimeSpan.FromHours(1));
                var hasRecentData5m = await _influxDbService.HasRecentDataAsync(TimeSpan.FromMinutes(5));
                
                var stats = new
                {
                    DataPoints = new
                    {
                        Last24Hours = dataCount24h,
                        EstimatedPerHour = dataCount24h / 24,
                        EstimatedPerMinute = dataCount24h / (24 * 60)
                    },
                    DataFreshness = new
                    {
                        HasDataLast5Minutes = hasRecentData5m,
                        HasDataLast1Hour = hasRecentData1h,
                        LastCheck = DateTime.Now
                    },
                    CollectionStatus = new
                    {
                        IsActive = hasRecentData5m,
                        Status = hasRecentData5m ? "Active" : "Stale",
                        Message = hasRecentData5m ? 
                            "Data collection is active" : 
                            "No recent data - collection may be stopped"
                    },
                    Timestamp = DateTime.Now
                };

                _logger.LogInformation("InfluxDB statistics requested - 24h count: {Count}", dataCount24h);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting InfluxDB statistics");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Son sensor verilerini InfluxDB'den getir
        /// </summary>
        [HttpGet("sensors/latest/{sensorName}")]
        public async Task<IActionResult> GetLatestSensorData(string sensorName)
        {
            try
            {
                var sensorReading = await _influxDbService.GetLatestSensorReadingAsync("hgu_sensors", sensorName);
                
                if (!sensorReading.IsValid)
                {
                    return NotFound(new 
                    { 
                        Message = $"No recent data found for sensor: {sensorName}",
                        SensorName = sensorName,
                        Timestamp = DateTime.Now
                    });
                }

                var response = new
                {
                    SensorName = sensorName,
                    Value = sensorReading.Value,
                    NumericValue = sensorReading.NumericValue,
                    Timestamp = sensorReading.Timestamp,
                    IsValid = sensorReading.IsValid,
                    Age = DateTime.Now - sensorReading.Timestamp
                };

                _logger.LogInformation("Latest sensor data requested for: {SensorName}", sensorName);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting latest sensor data for {SensorName}", sensorName);
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Manual test verisi yazma
        /// </summary>
        [HttpPost("test-write")]
        public async Task<IActionResult> TestWrite()
        {
            try
            {
                var success = await _influxDbService.TestManualWriteAsync();
                
                var response = new
                {
                    Success = success,
                    TestType = "Manual write test",
                    Timestamp = DateTime.Now,
                    Message = success ? 
                        "Test data written successfully to InfluxDB" : 
                        "Failed to write test data to InfluxDB"
                };

                var statusCode = success ? 200 : 500;
                _logger.LogInformation("InfluxDB test write - Success: {Success}", success);
                
                return StatusCode(statusCode, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during InfluxDB test write");
                return StatusCode(500, new { 
                    Success = false,
                    Error = ex.Message,
                    Timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// A1.xml sensor'larını InfluxDB'ye initialize et
        /// </summary>
        [HttpPost("initialize-sensors")]
        public async Task<IActionResult> InitializeSensors()
        {
            try
            {
                var success = await _influxDbService.InitializeA1XmlSensorsAsync();
                
                var response = new
                {
                    Success = success,
                    Operation = "Initialize A1.xml sensors",
                    Timestamp = DateTime.Now,
                    Message = success ? 
                        "A1.xml sensors initialized successfully in InfluxDB" : 
                        "Failed to initialize A1.xml sensors in InfluxDB"
                };

                var statusCode = success ? 200 : 500;
                _logger.LogInformation("InfluxDB sensor initialization - Success: {Success}", success);
                
                return StatusCode(statusCode, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during InfluxDB sensor initialization");
                return StatusCode(500, new { 
                    Success = false,
                    Error = ex.Message,
                    Timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Custom Flux query çalıştır
        /// </summary>
        [HttpPost("query")]
        public async Task<IActionResult> ExecuteQuery([FromBody] FluxQueryRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Query))
                {
                    return BadRequest(new { Message = "Query cannot be empty" });
                }

                // Güvenlik için tehlikeli komutları engelle
                var dangerousKeywords = new[] { "drop", "delete", "create", "alter" };
                var queryLower = request.Query.ToLowerInvariant();
                
                if (dangerousKeywords.Any(keyword => queryLower.Contains(keyword)))
                {
                    return BadRequest(new { Message = "Dangerous query operations not allowed" });
                }

                var result = await _influxDbService.QueryAsync(request.Query);
                
                var response = new
                {
                    Query = request.Query,
                    Result = result,
                    Timestamp = DateTime.Now,
                    Success = !string.IsNullOrEmpty(result)
                };

                _logger.LogInformation("Custom Flux query executed - Length: {Length}", result?.Length ?? 0);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing Flux query");
                return StatusCode(500, new { 
                    Error = ex.Message,
                    Query = request.Query,
                    Timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// InfluxDB konfigürasyon bilgileri (güvenlik için sensitive bilgiler gizli)
        /// </summary>
        [HttpGet("config")]
        public IActionResult GetConfiguration()
        {
            try
            {
                var config = new
                {
                    ConnectionStatus = "Available",
                    BucketName = "Configured",
                    Organization = "Configured", 
                    Url = "http://localhost:8086", // URL public bilgi
                    TokenStatus = "Configured",
                    LastConfigCheck = DateTime.Now,
                    Message = "InfluxDB service is configured and ready"
                };

                _logger.LogInformation("InfluxDB configuration requested");
                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting InfluxDB configuration");
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    public class FluxQueryRequest
    {
        public string Query { get; set; } = string.Empty;
    }
}