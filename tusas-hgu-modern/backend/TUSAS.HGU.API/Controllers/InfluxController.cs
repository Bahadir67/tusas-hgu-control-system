using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using TUSAS.HGU.Core.Services;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
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
                _logger.LogInformation("InfluxDB health check başlatıldı");

                var isConnected = await _influxDbService.CheckConnectionAsync();
                _logger.LogInformation("InfluxDB connection check sonucu: {IsConnected}", isConnected);

                var hasRecentData = await _influxDbService.HasRecentDataAsync(TimeSpan.FromMinutes(5));
                _logger.LogInformation("InfluxDB recent data check (son 5 dk): {HasRecentData}", hasRecentData);

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
                _logger.LogInformation("InfluxDB health check tamamlandı - Status: {Status}, HasData: {HasData}",
                    health.Status, hasRecentData);

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
                _logger.LogInformation("InfluxDB statistics sorgusu başlatıldı");

                // Son 24 saatteki veri sayısı
                var dataCount24h = await _influxDbService.GetDataPointCountAsync();
                _logger.LogInformation("InfluxDB son 24 saatteki veri sayısı: {DataCount}", dataCount24h);

                // Son 1 saatteki veri kontrolü
                var hasRecentData1h = await _influxDbService.HasRecentDataAsync(TimeSpan.FromHours(1));
                var hasRecentData5m = await _influxDbService.HasRecentDataAsync(TimeSpan.FromMinutes(5));

                _logger.LogInformation("InfluxDB veri tazelik kontrolü - Son 1h: {Data1h}, Son 5dk: {Data5m}",
                    hasRecentData1h, hasRecentData5m);

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

                _logger.LogInformation("InfluxDB statistics tamamlandı - Veri/saat: {PerHour}, Aktif: {IsActive}",
                    dataCount24h / 24, hasRecentData5m);
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

        /// <summary>
        /// InfluxDB'den motor ve sistem zaman serilerini getirir
        /// </summary>
        [HttpPost("motor-series")]
        public async Task<IActionResult> GetMotorSeries([FromBody] InfluxMotorSeriesRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { Message = "Request body is required." });
            }

            var supportedMetrics = new HashSet<string>(InfluxDbService.SupportedMotorMetrics, StringComparer.OrdinalIgnoreCase);

            var motorIds = (request.Motors ?? new List<int>())
                .Where(id => id >= 1 && id <= 7)
                .Distinct()
                .OrderBy(id => id)
                .ToList();

            var metrics = (request.Metrics ?? new List<string>())
                .Where(metric => !string.IsNullOrWhiteSpace(metric))
                .Select(metric => metric.Trim().ToLowerInvariant())
                .Where(metric => supportedMetrics.Contains(metric))
                .Distinct()
                .ToList();

            if (motorIds.Count == 0 || metrics.Count == 0)
            {
                return BadRequest(new
                {
                    Message = "At least one valid motor and metric must be provided.",
                    SupportedMetrics = supportedMetrics
                });
            }

            try
            {
                _logger.LogInformation("InfluxDB motor-series request - Motors: {MotorCount}, Metrics: {MetricCount}, Range: {Range}, MaxPoints: {MaxPoints}",
                    motorIds.Count,
                    metrics.Count,
                    string.IsNullOrWhiteSpace(request.Range) ? "1h" : request.Range,
                    request.MaxPoints);

                var result = await _influxDbService.GetMotorSeriesAsync(motorIds, metrics, request.Range, request.MaxPoints);

                _logger.LogInformation("InfluxDB motor-series result - MotorPoints: {MotorPoints}, SystemPoints: {SystemPoints}, EffectiveRange: {Range}",
                    result.MotorSeries.Count,
                    result.SystemSeries.Count,
                    result.EffectiveRange);

                return Ok(new
                {
                    Success = true,
                    Range = result.EffectiveRange,
                    Motors = motorIds,
                    Metrics = metrics,
                    MaxPoints = request.MaxPoints,
                    MotorSeries = result.MotorSeries,
                    SystemSeries = result.SystemSeries
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving motor series data from InfluxDB");
                return StatusCode(500, new { Success = false, Error = ex.Message });
            }
        }

        [HttpGet("sensors/latest/{sensorName}")]
        public async Task<IActionResult> GetLatestSensorData(string sensorName)
        {
            try
            {
                _logger.LogInformation("InfluxDB sensor data sorgusu: {SensorName}", sensorName);

                var sensorReading = await _influxDbService.GetLatestSensorReadingAsync("hgu_sensors", sensorName);

                if (!sensorReading.IsValid)
                {
                    _logger.LogWarning("InfluxDB'de sensor verisi bulunamadı: {SensorName}", sensorName);
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

                _logger.LogInformation("InfluxDB sensor data başarılı: {SensorName}, Value: {Value}, Age: {Age}ms",
                    sensorName, sensorReading.NumericValue, (DateTime.Now - sensorReading.Timestamp).TotalMilliseconds);
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

                _logger.LogInformation("InfluxDB Flux query başlatıldı: {Query}", request.Query);

                // Güvenlik için tehlikeli komutları engelle
                var dangerousKeywords = new[] { "drop", "delete", "create", "alter" };
                var queryLower = request.Query.ToLowerInvariant();

                if (dangerousKeywords.Any(keyword => queryLower.Contains(keyword)))
                {
                    _logger.LogWarning("InfluxDB tehlikeli query engellendi: {Query}", request.Query);
                    return BadRequest(new { Message = "Dangerous query operations not allowed" });
                }

                var startTime = DateTime.Now;
                var result = await _influxDbService.QueryAsync(request.Query);
                var duration = DateTime.Now - startTime;

                var response = new
                {
                    Query = request.Query,
                    Result = result,
                    Timestamp = DateTime.Now,
                    Success = !string.IsNullOrEmpty(result)
                };

                _logger.LogInformation("InfluxDB Flux query tamamlandı - Süre: {Duration}ms, Sonuç boyutu: {Length}",
                    duration.TotalMilliseconds, result?.Length ?? 0);
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
        /// System trend data - 30 dakikalık Flow ve Pressure verileri
        /// </summary>
        [HttpGet("system-trends")]
        public async Task<IActionResult> GetSystemTrends([FromQuery] int minutes = 30)
        {
            try
            {
                _logger.LogInformation("InfluxDB system trends sorgusu başlatıldı - Son {Minutes} dakika", minutes);

                var fluxQuery = $@"
                    from(bucket: ""tusas_hgu"")
                      |> range(start: -{minutes}m)
                      |> filter(fn: (r) => r[""_measurement""] == ""hgu_sensors"")
                      |> filter(fn: (r) => r.sensor == ""TOTAL_SYSTEM_FLOW"" or r.sensor == ""TOTAL_SYSTEM_PRESSURE"")
                      |> aggregateWindow(every: 10s, fn: mean, createEmpty: false)
                      |> pivot(rowKey:[""_time""], columnKey: [""sensor""], valueColumn: ""_value"")
                      |> map(fn: (r) => ({{ r with
                          totalFlow: r.TOTAL_SYSTEM_FLOW,
                          totalPressure: r.TOTAL_SYSTEM_PRESSURE
                      }}))
                      |> keep(columns: [""_time"", ""totalFlow"", ""totalPressure""])
                ";

                var rawResult = await _influxDbService.QueryAsync(fluxQuery);

                _logger.LogInformation("InfluxDB raw result length: {Length}", rawResult?.Length ?? 0);
                if (!string.IsNullOrEmpty(rawResult))
                {
                    _logger.LogInformation("InfluxDB raw result first 500 chars: {Result}",
                        rawResult.Length > 500 ? rawResult.Substring(0, 500) : rawResult);
                }

                // Parse InfluxDB CSV result
                var trends = new List<object>();
                if (!string.IsNullOrEmpty(rawResult))
                {
                    var lines = rawResult.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                    // Find header row (contains column names)
                    string[]? headers = null;
                    int timeIndex = -1;
                    int flowIndex = -1;
                    int pressureIndex = -1;

                    foreach (var line in lines)
                    {
                        // Skip comment lines
                        if (line.StartsWith("#"))
                            continue;

                        // First non-comment line is the header
                        if (headers == null)
                        {
                            headers = line.Split(',');
                            for (int i = 0; i < headers.Length; i++)
                            {
                                var header = headers[i].Trim();
                                if (header == "_time") timeIndex = i;
                                else if (header == "totalFlow") flowIndex = i;
                                else if (header == "totalPressure") pressureIndex = i;
                            }
                            continue;
                        }

                        // Parse data rows
                        var parts = line.Split(',');
                        if (timeIndex >= 0 && timeIndex < parts.Length)
                        {
                            try
                            {
                                var timestamp = parts[timeIndex].Trim();
                                var flow = flowIndex >= 0 && flowIndex < parts.Length &&
                                          double.TryParse(parts[flowIndex].Trim(), System.Globalization.NumberStyles.Float,
                                          System.Globalization.CultureInfo.InvariantCulture, out var f) ? f : (double?)null;
                                var pressure = pressureIndex >= 0 && pressureIndex < parts.Length &&
                                              double.TryParse(parts[pressureIndex].Trim(), System.Globalization.NumberStyles.Float,
                                              System.Globalization.CultureInfo.InvariantCulture, out var p) ? p : (double?)null;

                                trends.Add(new
                                {
                                    timestamp = timestamp,
                                    totalFlow = flow,
                                    totalPressure = pressure
                                });
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "CSV satırı parse hatası: {Line}", line);
                            }
                        }
                    }
                }

                _logger.LogInformation("InfluxDB system trends tamamlandı - {Count} veri noktası", trends.Count);
                return Ok(new {
                    data = trends,
                    timeRange = $"{minutes}m",
                    dataPoints = trends.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system trends from InfluxDB");
                return StatusCode(500, new { Error = ex.Message });
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

    public class InfluxMotorSeriesRequest
    {
        public List<int>? Motors { get; set; }
        public List<string>? Metrics { get; set; }
        public string? Range { get; set; }
        public int? MaxPoints { get; set; }
    }

}
