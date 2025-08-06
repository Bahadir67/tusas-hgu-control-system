using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;

namespace TUSAS.HGU.Core.Services
{
    public class InfluxDbService
    {
        private readonly HttpClient _httpClient;
        private readonly string _url;
        private readonly string _token;
        private readonly string _org;
        private readonly string _bucket;
        private WorkstationOpcUaClient? _opcUaClient;

        public InfluxDbService(string url, string token, string org, string bucket)
        {
            _url = url;
            _token = token;
            _org = org;
            _bucket = bucket;
            
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Token {_token}");
            
            // DEBUG: Log connection details
        }

        public void SetOpcUaClient(WorkstationOpcUaClient opcUaClient)
        {
            _opcUaClient = opcUaClient;
        }

        public async Task<bool> CheckConnectionAsync()
        {
            try
            {
                // Test health endpoint first
                var healthResponse = await _httpClient.GetAsync($"{_url}/health");
                
                if (!healthResponse.IsSuccessStatusCode)
                {
                    return false;
                }
                
                // Test auth with a simple query
                var testQuery = "from(bucket: \"tusas_hgu\") |> range(start: -1m) |> limit(n: 1)";
                var content = new StringContent(testQuery, Encoding.UTF8, "application/vnd.flux");
                var authResponse = await _httpClient.PostAsync($"{_url}/api/v2/query?org={_org}", content);
                
                if (!authResponse.IsSuccessStatusCode)
                {
                    var errorContent = await authResponse.Content.ReadAsStringAsync();
                    return false;
                }
                
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<string> QueryAsync(string fluxQuery)
        {
            try
            {
                var content = new StringContent(fluxQuery, Encoding.UTF8, "application/vnd.flux");
                var response = await _httpClient.PostAsync($"{_url}/api/v2/query?org={_org}", content);
                
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
                
                return string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        public async Task<SensorReading> GetLatestSensorReadingAsync(string measurement, string field)
        {
            try
            {
                var query = $"from(bucket: \"{_bucket}\") " +
                           $"|> range(start: -1m) " +
                           $"|> filter(fn: (r) => r._measurement == \"{measurement}\" and r._field == \"{field}\") " +
                           $"|> last()";
                
                var response = await QueryAsync(query);
                return ParseSensorReading(response);
            }
            catch
            {
                return new SensorReading { IsValid = false };
            }
        }

        public async Task<bool> HasRecentDataAsync(TimeSpan timeSpan)
        {
            try
            {
                var seconds = (int)timeSpan.TotalSeconds;
                var query = $"from(bucket: \"{_bucket}\") |> range(start: -{seconds}s) |> limit(n: 1)";
                var response = await QueryAsync(query);
                return !string.IsNullOrEmpty(response) && response.Contains("_value");
            }
            catch
            {
                return false;
            }
        }



        public async Task<int> GetDataPointCountAsync()
        {
            try
            {
                var query = $"from(bucket: \"{_bucket}\") " +
                           $"|> range(start: -24h) " +
                           $"|> count()";
                
                var response = await QueryAsync(query);
                return ParseCountFromResponse(response);
            }
            catch
            {
                return 0;
            }
        }

        private SensorReading ParseSensorReading(string response)
        {
            if (string.IsNullOrEmpty(response))
                return new SensorReading { IsValid = false };
            
            try
            {
                var lines = response.Split('\n');
                if (lines.Length > 1)
                {
                    var dataLine = lines[1].Split(',');
                    if (dataLine.Length >= 6)
                    {
                        var timestamp = dataLine[5]; // _time column
                        var value = dataLine[6]; // _value column
                        
                        if (DateTime.TryParse(timestamp, out var time))
                        {
                            return new SensorReading
                            {
                                IsValid = true,
                                Timestamp = time,
                                Value = value
                            };
                        }
                    }
                }
            }
            catch
            {
                // Ignore parsing errors
            }
            
            return new SensorReading { IsValid = false };
        }

        private int ParseCountFromResponse(string response)
        {
            if (string.IsNullOrEmpty(response))
                return 0;
            
            try
            {
                var lines = response.Split('\n');
                if (lines.Length > 1)
                {
                    var dataLine = lines[1].Split(',');
                    if (dataLine.Length >= 6)
                    {
                        var value = dataLine[6];
                        if (int.TryParse(value, out int count))
                        {
                            return count;
                        }
                    }
                }
            }
            catch
            {
                // Ignore parsing errors
            }
            
            return 0;
        }

        public async Task<bool> TestManualWriteAsync()
        {
            try
            {
                
                // Quick health check first
                var healthResponse = await _httpClient.GetAsync($"{_url}/health");
                if (!healthResponse.IsSuccessStatusCode)
                {
                    return false;
                }
                
                // Manual test data
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000000;
                var testData = $"test_measurement,sensor=manual_test value=42.5 {timestamp}\n";
                
                
                var content = new StringContent(testData, Encoding.UTF8, "text/plain");
                var writeUrl = $"{_url}/api/v2/write?org={_org}&bucket={_bucket}&precision=ns";
                
                
                var response = await _httpClient.PostAsync(writeUrl, content);
                
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return false;
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task WriteSensorDataAsync(Dictionary<string, SensorReading> sensorData)
        {
            try
            {
                // Quick health check first
                var healthResponse = await _httpClient.GetAsync($"{_url}/health");
                if (!healthResponse.IsSuccessStatusCode)
                {
                    return;
                }
                
                var lineProtocolBuilder = new StringBuilder();
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000000; // Convert to nanoseconds
                
                // Filter only sensor data (exclude control/execution variables)
                var filteredSensorData = FilterSensorDataOnly(sensorData);
                
                foreach (var kvp in filteredSensorData)
                {
                    var sensorName = kvp.Key;
                    var reading = kvp.Value;
                    
                    
                    if (reading.IsValid)
                    {
                        // A1.xml metadata'sını kullanarak tip bilgisini al
                        var metadata = GetSensorMetadata(sensorName);
                        
                        if (metadata?.DataType == "BOOL")
                        {
                            // Boolean sensor'lar için - float olarak yaz (0.0 veya 1.0)
                            var boolValue = reading.Value.Equals("True", StringComparison.OrdinalIgnoreCase) ? 1.0 : 0.0;
                            var lineProtocolLine = $"hgu_sensors,sensor={EscapeInfluxTag(sensorName)},type=boolean value={boolValue} {timestamp}\n";
                            lineProtocolBuilder.Append(lineProtocolLine);
                        }
                        else if (reading.NumericValue.HasValue)
                        {
                            // Numeric sensor'lar için (REAL)
                            var unit = ""; // OpcVariable'da Description yok, unit bilgisi yok
                            var escapedUnit = EscapeInfluxTag(unit);
                            var unitTag = !string.IsNullOrEmpty(escapedUnit) ? $",unit={escapedUnit}" : "";
                            var lineProtocolLine = $"hgu_sensors,sensor={EscapeInfluxTag(sensorName)},type=numeric{unitTag} value={reading.NumericValue.Value} {timestamp}\n";
                            lineProtocolBuilder.Append(lineProtocolLine);
                        }
                        else
                        {
                        }
                    }
                    else
                    {
                    }
                }
                
                if (lineProtocolBuilder.Length > 0)
                {
                    var lineProtocolData = lineProtocolBuilder.ToString().Replace("\r", "");
                    
                    var content = new StringContent(lineProtocolData, Encoding.UTF8, "text/plain");
                    
                    var writeUrl = $"{_url}/api/v2/write?org={_org}&bucket={_bucket}&precision=ns";
                    
                    var response = await _httpClient.PostAsync(writeUrl, content);
                    
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        
                        // Don't throw exception for auth errors - just log and continue
                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                        {
                            return;
                        }
                        
                        throw new Exception($"Failed to write sensor data: {response.ReasonPhrase}. Details: {errorContent}");
                    }
                    else
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                    }
                }
                else
                {
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error writing sensor data to InfluxDB: {ex.Message}", ex);
            }
        }

        private TUSAS.HGU.Core.Services.OPC.OpcVariable? GetSensorMetadata(string sensorName)
        {
            if (_opcUaClient == null) return null;

            try
            {
                // Collection'dan değişkeni bul
                return _opcUaClient.OpcVariableCollection?.GetByName(sensorName);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Filters sensor data to include only actual sensor readings (not control/execution variables)
        /// Uses dynamic detection instead of hardcoded variable names
        /// </summary>
        private Dictionary<string, SensorReading> FilterSensorDataOnly(Dictionary<string, SensorReading> allData)
        {
            var sensorData = new Dictionary<string, SensorReading>();
            
            foreach (var kvp in allData)
            {
                var variableName = kvp.Key;
                var reading = kvp.Value;
                
                // Dynamic filtering based on variable name patterns
                if (IsSensorVariable(variableName))
                {
                    sensorData[variableName] = reading;
                }
                else
                {
                }
            }
            
            return sensorData;
        }

        /// <summary>
        /// Determines if a variable is a sensor variable based on naming patterns
        /// </summary>
        private bool IsSensorVariable(string variableName)
        {
            var name = variableName.ToUpperInvariant();
            
            // Exclude control/setpoint variables
            if (name.Contains("ENABLE") || name.Contains("TARGET") || 
                name.Contains("VALVE") || name.Contains("SETPOINT") ||
                name.Contains("CONTROL_MODE") || name.Contains("EMERGENCY_STOP") ||
                name.Contains("PUMP_ENABLE") || name.Contains("MAINTENANCE_TIMER") ||
                name.Contains("LAST_MAINTENANCE") || name.Contains("NEXT_MAINTENANCE"))
            {
                return false;
            }
            
            // Include sensor variables
            if (name.Contains("PRESSURE") || name.Contains("TEMPERATURE") || 
                name.Contains("FLOW") || name.Contains("RPM") || 
                name.Contains("CURRENT") || name.Contains("LEAK") ||
                name.Contains("STATUS") || name.Contains("FILTER") ||
                name.Contains("LEVEL") || name.Contains("SENSOR") ||
                name.Contains("ALARM") || name.Contains("READY") ||
                name.Contains("SUPPLY") || name.Contains("TANK") ||
                name.Contains("COOLING") || name.Contains("AQUA") ||
                name.Contains("OIL") || name.Contains("EFFICIENCY") ||
                name.Contains("POWER") || name.Contains("ACTIVE") ||
                name.Contains("TOTAL") || name.Contains("AVERAGE") ||
                name.Contains("SYSTEM") || name.Contains("MOTOR") ||
                name.Contains("ACCUMULATOR") || name.Contains("TEST") ||
                name.Contains("PUMP_STATUS"))
            {
                return true;
            }
            
            return false;
        }

        private string ExtractUnitFromDescription(string description)
        {
            if (string.IsNullOrEmpty(description)) return "";
            
            // Extract units like (bar), (°C), (L/min) from description
            var unitPatterns = new[]
            {
                @"\(([^)]+)\)", // (bar), (°C), (L/min)
                @"\[.*?([A-Za-z°/]+)\]" // [0-350 bar]
            };
            
            foreach (var pattern in unitPatterns)
            {
                var match = System.Text.RegularExpressions.Regex.Match(description, pattern);
                if (match.Success)
                {
                    var unit = match.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(unit) && !char.IsDigit(unit[0]))
                        return unit;
                }
            }
            
            return "";
        }

        // Program başlangıcında A1.xml sensor'larının ilk değerlerini InfluxDB'ye gönder
        public async Task<bool> InitializeA1XmlSensorsAsync()
        {
            if (_opcUaClient == null) return false;

            try
            {
                // First check InfluxDB connection
                var healthResponse = await _httpClient.GetAsync($"{_url}/health");
                if (!healthResponse.IsSuccessStatusCode)
                {
                    return false;
                }
                
                var collection = _opcUaClient.OpcVariableCollection;
                if (collection == null) return false;
                
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000000;
                var lineProtocolBuilder = new StringBuilder();

                // Collection'daki tüm değişkenler için ilk değer gönder
                foreach (var variable in collection.Variables)
                {
                    if (!string.IsNullOrEmpty(variable.DisplayName))
                    {
                        var range = "";
                        if (variable.MinValue.HasValue && variable.MaxValue.HasValue)
                        {
                            range = $"{variable.MinValue}-{variable.MaxValue}";
                        }

                        // İlk değer olarak range ortasını veya default değer ver
                        var initialValue = GetInitialSensorValue(variable);

                        lineProtocolBuilder.Append($"hgu_sensors,sensor={variable.DisplayName}");
                        if (!string.IsNullOrEmpty(range))
                        {
                            lineProtocolBuilder.Append($",range={range}");
                        }
                        lineProtocolBuilder.Append($" value={initialValue} {timestamp}\n");
                    }
                }

                if (lineProtocolBuilder.Length > 0)
                {
                    var lineProtocolData = lineProtocolBuilder.ToString().Replace("\r", "");
                    var content = new StringContent(lineProtocolData, Encoding.UTF8, "text/plain");
                    
                    var writeUrl = $"{_url}/api/v2/write?org={_org}&bucket={_bucket}&precision=ns";
                    var response = await _httpClient.PostAsync(writeUrl, content);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        return false;
                    }
                    
                    return true;
                }

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        private string GetInitialSensorValue(TUSAS.HGU.Core.Services.OPC.OpcVariable variable)
        {
            // İlk değer oluştur
            switch (variable.DataType.ToUpper())
            {
                case "BOOL":
                    return "0.0"; // false as float

                case "REAL":
                    if (variable.MinValue.HasValue && variable.MaxValue.HasValue)
                    {
                        // Range ortası
                        var middle = (variable.MinValue.Value + variable.MaxValue.Value) / 2;
                        return middle.ToString("F1");
                    }
                    return "0.0";

                default:
                    return "0.0"; // default as float
            }
        }
        
        /// <summary>
        /// Escapes special characters in InfluxDB tag values
        /// </summary>
        private string EscapeInfluxTag(string tagValue)
        {
            if (string.IsNullOrEmpty(tagValue)) return "";
            
            // InfluxDB tag escaping rules:
            // - Replace spaces with underscores
            // - Remove problematic characters
            // - Keep only alphanumeric, underscore, hyphen, dot
            var escaped = System.Text.RegularExpressions.Regex.Replace(tagValue, @"[^a-zA-Z0-9_.-]", "_")
                .Replace("__", "_")  // Remove double underscores
                .Trim('_');          // Remove leading/trailing underscores
            
            // If result is empty or too short, return empty string
            return string.IsNullOrEmpty(escaped) || escaped.Length < 1 ? "" : escaped;
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }

    public class SensorReading
    {
        public bool IsValid { get; set; }
        public DateTime Timestamp { get; set; }
        public string Value { get; set; } = string.Empty;
        public double? NumericValue { get; set; }
        
        public double GetNumericValue()
        {
            if (double.TryParse(Value, out double result))
                return result;
            return 0.0;
        }
        
        public bool GetBooleanValue()
        {
            if (bool.TryParse(Value, out bool result))
                return result;
            return false;
        }
        
        public string GetFormattedValue(string unit = "")
        {
            if (!IsValid)
                return $"-- {unit}".Trim();
            
            if (double.TryParse(Value, out double numValue))
                return $"{numValue:F2} {unit}".Trim();
            
            if (bool.TryParse(Value, out bool boolValue))
                return boolValue ? "ON" : "OFF";
            
            return Value;
        }
    }
}