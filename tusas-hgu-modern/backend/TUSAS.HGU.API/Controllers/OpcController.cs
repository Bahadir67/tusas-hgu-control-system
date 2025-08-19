using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using TUSAS.HGU.Core.Services;
using TUSAS.HGU.Core.Services.OPC;

namespace TUSAS.HGU.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OpcController : ControllerBase
    {
        private readonly WorkstationOpcUaClient _opcClient;
        private readonly InfluxDbService _influxDbService;
        private readonly AlarmService _alarmService;
        private readonly ILogger<OpcController> _logger;

        public OpcController(WorkstationOpcUaClient opcClient, InfluxDbService influxDbService, AlarmService alarmService, ILogger<OpcController> logger)
        {
            _opcClient = opcClient;
            _influxDbService = influxDbService;
            _alarmService = alarmService;
            _logger = logger;
        }

        /// <summary>
        /// OPC UA bağlantı durumunu kontrol et
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            try
            {
                var status = new
                {
                    IsConnected = _opcClient.IsConnected,
                    Timestamp = DateTime.Now,
                    Message = _opcClient.IsConnected ? "OPC UA connected successfully" : "OPC UA disconnected"
                };

                _logger.LogInformation("OPC status requested - Connected: {Connected}", status.IsConnected);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting OPC status");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// InfluxDB bağlantı durumunu test et
        /// </summary>
        [HttpGet("influx/status")]
        public async Task<IActionResult> GetInfluxStatus()
        {
            try
            {
                var isConnected = await _influxDbService.CheckConnectionAsync();
                var hasRecentData = await _influxDbService.HasRecentDataAsync(TimeSpan.FromMinutes(5));
                
                var status = new
                {
                    IsConnected = isConnected,
                    HasRecentData = hasRecentData,
                    Timestamp = DateTime.Now,
                    Message = isConnected ? "InfluxDB connected successfully" : "InfluxDB connection failed"
                };

                _logger.LogInformation("InfluxDB status requested - Connected: {Connected}, HasData: {HasData}", 
                    isConnected, hasRecentData);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting InfluxDB status");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// InfluxDB'deki veri miktarını kontrol et
        /// </summary>
        [HttpGet("influx/data-count")]
        public async Task<IActionResult> GetInfluxDataCount()
        {
            try
            {
                var dataCount = await _influxDbService.GetDataPointCountAsync();
                
                var response = new
                {
                    DataPointCount = dataCount,
                    Period = "Last 24 hours",
                    Timestamp = DateTime.Now,
                    Message = $"Found {dataCount} data points in the last 24 hours"
                };

                _logger.LogInformation("InfluxDB data count requested - Count: {Count}", dataCount);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting InfluxDB data count");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// InfluxDB'ye manual test verisi yaz
        /// </summary>
        [HttpPost("influx/test")]
        public async Task<IActionResult> TestInfluxWrite()
        {
            try
            {
                var success = await _influxDbService.TestManualWriteAsync();
                
                var response = new
                {
                    Success = success,
                    Timestamp = DateTime.Now,
                    Message = success ? "Test data written successfully" : "Failed to write test data"
                };

                _logger.LogInformation("InfluxDB manual test - Success: {Success}", success);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing InfluxDB write");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// OPC UA bağlantısını başlat
        /// </summary>
        [HttpPost("connect")]
        public async Task<IActionResult> Connect()
        {
            try
            {
                _logger.LogInformation("OPC connection requested via API");
                var result = await _opcClient.ConnectAsync();
                
                var response = new
                {
                    Success = result,
                    IsConnected = _opcClient.IsConnected,
                    Timestamp = DateTime.Now,
                    Message = result ? "OPC UA connection successful" : "OPC UA connection failed"
                };

                return result ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to OPC UA");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Son sensor verilerini getir
        /// </summary>
        [HttpGet("sensors/latest")]
        public IActionResult GetLatestSensorData()
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                var sensorData = _opcClient.GetLatestSensorData();
                
                var response = new
                {
                    Timestamp = sensorData?.Timestamp ?? DateTime.Now,
                    ValuesCount = sensorData?.Values?.Count ?? 0,
                    Values = sensorData?.Values?.ToDictionary(
                        kvp => kvp.Key,
                        kvp => (object)new
                        {
                            Value = kvp.Value.Value,
                            Timestamp = kvp.Value.Timestamp
                        }) ?? new Dictionary<string, object>(),
                    Message = sensorData != null ? "Sensor data retrieved successfully" : "No sensor data available"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sensor data");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Node metadata bilgilerini getir
        /// </summary>
        [HttpGet("metadata")]
        public IActionResult GetNodeMetadata()
        {
            try
            {
                var collection = _opcClient.OpcVariableCollection;
                if (collection == null)
                {
                    return BadRequest(new { message = "OPC collection not initialized" });
                }

                var response = new
                {
                    NodeCount = collection.Count,
                    Nodes = collection.Variables.Select(v => new
                    {
                        v.NodeId,
                        v.BrowseName,
                        v.DisplayName,
                        v.DataType,
                        v.MinValue,
                        v.MaxValue,
                        Description = $"{v.DisplayName} - {v.DataType}"
                    }).ToList(),
                    Timestamp = DateTime.Now
                };

                _logger.LogInformation("Metadata requested - Node count: {Count}", collection.Count);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting node metadata");
                return StatusCode(500, new { Error = ex.Message });
            }
        }


        /// <summary>
        /// OPC değişkenini oku
        /// </summary>
        [HttpGet("read/{displayName}")]
        public async Task<IActionResult> ReadVariable(string displayName)
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                // Collection'dan değişkeni al
                var variable = _opcClient.OpcVariableCollection?.GetByName(displayName);
                if (variable == null)
                {
                    return NotFound(new { message = $"Variable '{displayName}' not found" });
                }

                // Collection'dan değeri oku (OPC'ye gitmeden!)
                return Ok(new
                {
                    displayName = displayName,
                    value = variable.Value,
                    timestamp = variable.LastUpdated,
                    dataType = variable.DataType
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading variable {DisplayName}", displayName);
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Çoklu değişken okuma - Collection'dan bulk read
        /// </summary>
        [HttpPost("batch")]
        public IActionResult BatchRead([FromBody] BatchReadRequest request)
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                var collection = _opcClient.OpcVariableCollection;
                if (collection == null)
                {
                    return BadRequest(new { message = "OPC collection not initialized" });
                }

                var response = new BatchReadResponse
                {
                    Success = true,
                    Timestamp = DateTime.Now,
                    Variables = new Dictionary<string, VariableValue>(),
                    PageContext = request.PageContext
                };

                var notFoundVariables = new List<string>();

                foreach (var displayName in request.Variables ?? new List<string>())
                {
                    var variable = collection.GetByName(displayName);
                    if (variable != null)
                    {
                        response.Variables[displayName] = new VariableValue
                        {
                            Value = variable.Value,
                            Timestamp = variable.LastUpdated,
                            DataType = variable.DataType,
                            Quality = variable.IsValid ? "Good" : "Bad"
                        };
                    }
                    else
                    {
                        notFoundVariables.Add(displayName);
                        // Null value for missing variables
                        response.Variables[displayName] = new VariableValue
                        {
                            Value = null,
                            Timestamp = DateTime.Now,
                            DataType = "Unknown",
                            Quality = "Bad"
                        };
                    }
                }

                if (notFoundVariables.Any())
                {
                    response.Errors = notFoundVariables.Select(v => $"Variable '{v}' not found in collection").ToList();
                }

                _logger.LogInformation("Batch read requested: {Count} variables, {Found} found, Page: {Page}", 
                    request.Variables?.Count ?? 0, 
                    response.Variables.Count(v => v.Value.Quality == "Good"),
                    request.PageContext ?? "unknown");

                // Process alarms with OPC data
                try 
                {
                    var opcDataForAlarms = collection.Variables.ToDictionary(
                        v => v.DisplayName, 
                        v => new DataValue(v.Value ?? 0)
                    );
                    _alarmService.ProcessAlarms(opcDataForAlarms);
                }
                catch (Exception alarmEx)
                {
                    _logger.LogError(alarmEx, "Error processing alarms during batch read");
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch read operation");
                return StatusCode(500, new BatchReadResponse
                {
                    Success = false,
                    Timestamp = DateTime.Now,
                    Variables = new Dictionary<string, VariableValue>(),
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// <summary>
        /// Collection'daki tüm değişkenleri getir
        /// </summary>
        [HttpGet("all")]
        public IActionResult GetAllVariables()
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                var collection = _opcClient.OpcVariableCollection;
                if (collection == null)
                {
                    return BadRequest(new { message = "OPC collection not initialized" });
                }

                var response = new
                {
                    Success = true,
                    Timestamp = DateTime.Now,
                    TotalCount = collection.Count,
                    ValidCount = collection.ValidCount,
                    Variables = collection.Variables.ToDictionary(
                        v => v.DisplayName,
                        v => new VariableValue
                        {
                            Value = v.Value,
                            Timestamp = v.LastUpdated,
                            DataType = v.DataType,
                            Quality = v.IsValid ? "Good" : "Bad"
                        }
                    )
                };

                _logger.LogInformation("All variables requested - Total: {Total}, Valid: {Valid}", 
                    collection.Count, collection.ValidCount);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all variables");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// OPC bulk read performance istatistiklerini getir
        /// </summary>
        [HttpGet("performance")]
        public IActionResult GetPerformanceStats()
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                var stats = _opcClient.GetPerformanceStats();
                
                var response = new
                {
                    Success = true,
                    Timestamp = DateTime.Now,
                    ConnectionStatus = "Connected",
                    Statistics = new
                    {
                        MeasurementCount = stats.MeasurementCount,
                        AverageOpcReadMs = Math.Round(stats.AverageOpcReadMs, 2),
                        AverageTotalMs = Math.Round(stats.AverageTotalMs, 2),
                        AverageProcessingMs = Math.Round(stats.AverageProcessingMs, 2),
                        MinOpcReadMs = Math.Round(stats.MinOpcReadMs, 2),
                        MaxOpcReadMs = Math.Round(stats.MaxOpcReadMs, 2),
                        AverageVariableCount = Math.Round(stats.AverageVariableCount, 0),
                        SuccessRate = Math.Round(stats.SuccessRate, 2)
                    },
                    LatestMeasurement = stats.LatestMeasurement != null ? new
                    {
                        Timestamp = stats.LatestMeasurement.Timestamp,
                        VariableCount = stats.LatestMeasurement.VariableCount,
                        ValidVariableCount = stats.LatestMeasurement.ValidVariableCount,
                        OpcReadMs = Math.Round(stats.LatestMeasurement.OpcReadDurationMs, 2),
                        TotalMs = Math.Round(stats.LatestMeasurement.TotalDurationMs, 2),
                        ProcessingMs = Math.Round(stats.LatestMeasurement.ProcessingDurationMs, 2)
                    } : null,
                    RecentHistory = stats.RecentMeasurements.TakeLast(10).Select(m => new
                    {
                        Timestamp = m.Timestamp.ToString("HH:mm:ss.fff"),
                        VariableCount = m.VariableCount,
                        ValidCount = m.ValidVariableCount,
                        OpcReadMs = Math.Round(m.OpcReadDurationMs, 2),
                        TotalMs = Math.Round(m.TotalDurationMs, 2)
                    }).ToList(),
                    Message = stats.Message ?? "Performance statistics retrieved successfully"
                };

                _logger.LogInformation("Performance stats requested - Measurements: {Count}, Avg OPC Read: {AvgMs}ms", 
                    stats.MeasurementCount, Math.Round(stats.AverageOpcReadMs, 2));

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting performance statistics");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Immediate OPC refresh - Zamanı beklemeden fresh OPC data collection tetikle
        /// </summary>
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshOpcData()
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                _logger.LogInformation("Manual OPC refresh requested");

                // Immediate fresh data collection trigger
                var refreshResult = await _opcClient.TriggerImmediateDataCollection();
                
                if (refreshResult)
                {
                    // Return fresh data after collection
                    var freshData = _opcClient.GetLatestSensorData();
                    
                    var response = new
                    {
                        Success = true,
                        Message = "OPC data refreshed successfully",
                        Timestamp = freshData?.Timestamp ?? DateTime.Now,
                        ValuesCount = freshData?.Values?.Count ?? 0,
                        Values = freshData?.Values?.ToDictionary(
                            kvp => kvp.Key,
                            kvp => (object)new
                            {
                                Value = kvp.Value.Value,
                                Timestamp = kvp.Value.Timestamp
                            }) ?? new Dictionary<string, object>()
                    };

                    return Ok(response);
                }
                else
                {
                    return StatusCode(500, new { 
                        Success = false,
                        Message = "OPC refresh failed - collection error" 
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during manual OPC refresh");
                return StatusCode(500, new { 
                    Success = false,
                    Error = ex.Message,
                    Message = "OPC refresh operation failed"
                });
            }
        }

        /// <summary>
        /// OPC değişkenine yaz
        /// </summary>
        [HttpPost("write")]
        public async Task<IActionResult> WriteVariable([FromBody] WriteVariableRequest request)
        {
            try
            {
                if (!_opcClient.IsConnected)
                {
                    return BadRequest(new { Message = "OPC UA not connected" });
                }

                if (string.IsNullOrEmpty(request.DisplayName))
                {
                    return BadRequest(new { Message = "Variable name is required" });
                }

                if (request.Value == null)
                {
                    return BadRequest(new { Message = "Value is required" });
                }

                // Handle JsonElement conversion
                object actualValue = request.Value;
                if (request.Value is System.Text.Json.JsonElement jsonElement)
                {
                    switch (jsonElement.ValueKind)
                    {
                        case System.Text.Json.JsonValueKind.Number:
                            actualValue = jsonElement.GetDouble();
                            break;
                        case System.Text.Json.JsonValueKind.True:
                        case System.Text.Json.JsonValueKind.False:
                            actualValue = jsonElement.GetBoolean();
                            break;
                        case System.Text.Json.JsonValueKind.String:
                            actualValue = jsonElement.GetString();
                            break;
                        default:
                            actualValue = jsonElement.ToString();
                            break;
                    }
                }
                
                var success = await _opcClient.WriteVariableAsync(request.DisplayName, actualValue);
                
                if (success)
                {
                    _logger.LogInformation("Successfully wrote {Value} to {Variable}", request.Value, request.DisplayName);
                    return Ok(new
                    {
                        success = true,
                        message = $"Successfully wrote value to {request.DisplayName}",
                        displayName = request.DisplayName,
                        value = request.Value,
                        timestamp = DateTime.Now
                    });
                }
                else
                {
                    _logger.LogWarning("Failed to write {Value} to {Variable}", request.Value, request.DisplayName);
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Failed to write value to {request.DisplayName}",
                        displayName = request.DisplayName
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error writing variable {DisplayName}", request.DisplayName);
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    public class WriteVariableRequest
    {
        public string DisplayName { get; set; } = string.Empty;
        public object? Value { get; set; }
    }

    public class BatchReadRequest
    {
        public List<string> Variables { get; set; } = new();
        public string? PageContext { get; set; }
    }

    public class BatchReadResponse
    {
        public bool Success { get; set; }
        public DateTime Timestamp { get; set; }
        public Dictionary<string, VariableValue> Variables { get; set; } = new();
        public List<string>? Errors { get; set; }
        public string? PageContext { get; set; }
    }

    public class VariableValue
    {
        public object? Value { get; set; }
        public DateTime Timestamp { get; set; }
        public string DataType { get; set; } = "";
        public string Quality { get; set; } = "Good";
    }
}