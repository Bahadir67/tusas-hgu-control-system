using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;
using System.Globalization;
using System.IO;
using Microsoft.VisualBasic.FileIO;
using System.Text.RegularExpressions;

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
        private static readonly Dictionary<string, Func<int, string>> MotorMetricSensors = new(StringComparer.OrdinalIgnoreCase)
        {
            ["pressure"] = motorId => $"PUMP_{motorId}_PRESSURE_ACTUAL",
            ["flow"] = motorId => $"PUMP_{motorId}_FLOW_ACTUAL",
            ["temperature"] = motorId => $"MOTOR_{motorId}_TEMPERATURE_C",
            ["rpm"] = motorId => $"MOTOR_{motorId}_RPM_ACTUAL",
            ["current"] = motorId => $"MOTOR_{motorId}_CURRENT_A"
        };

        private static readonly Dictionary<string, string> SystemSensorMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["totalFlow"] = "TOTAL_SYSTEM_FLOW",
            ["totalPressure"] = "TOTAL_SYSTEM_PRESSURE",
            ["activePumps"] = "SYSTEM_ACTIVE_PUMPS",
            ["efficiency"] = "SYSTEM_EFFICIENCY",
            ["tankLevel"] = "TANK_LEVEL_PERCENT",
            ["oilTemperature"] = "TANK_OIL_TEMPERATURE"
        };

        private static readonly Regex TimeRangePattern = new("^\\d+(s|m|h|d|w)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static IEnumerable<string> SupportedMotorMetrics => MotorMetricSensors.Keys;



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
                var testQuery = $"from(bucket: \"{_bucket}\") |> range(start: -1m) |> limit(n: 1)";
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


        public async Task<InfluxMotorSeriesResponse> GetMotorSeriesAsync(IEnumerable<int> motorIds, IEnumerable<string> metrics, string? timeRangeLiteral, int? maxPoints = null)
        {
            var response = new InfluxMotorSeriesResponse();
            if (motorIds == null || metrics == null)
            {
                return response;
            }

            var motorList = motorIds
                .Where(id => id >= 1 && id <= 7)
                .Distinct()
                .OrderBy(id => id)
                .ToList();

            var metricList = metrics
                .Where(metric => !string.IsNullOrWhiteSpace(metric))
                .Select(metric => metric.Trim().ToLowerInvariant())
                .Where(metric => MotorMetricSensors.ContainsKey(metric))
                .Distinct()
                .ToList();

            if (motorList.Count == 0 || metricList.Count == 0)
            {
                return response;
            }

            var sanitizedRange = SanitizeRangeLiteral(timeRangeLiteral);
            response.EffectiveRange = sanitizedRange;
            var rangeSpan = ParseDurationLiteral(sanitizedRange);
            var aggregateWindow = GetAggregateWindowLiteral(rangeSpan);

            var sensorClauses = new List<string>();
            foreach (var motorId in motorList)
            {
                foreach (var metric in metricList)
                {
                    var sensorName = MotorMetricSensors[metric](motorId);
                    sensorClauses.Add($"r.sensor == \"{sensorName}\"");
                }
            }

            foreach (var systemSensor in SystemSensorMap.Values)
            {
                sensorClauses.Add($"r.sensor == \"{systemSensor}\"");
            }

            if (sensorClauses.Count == 0)
            {
                return response;
            }

            var sensorFilter = string.Join(" or ", sensorClauses);
            var limitClause = maxPoints.HasValue && maxPoints.Value > 0
                ? $"\n  |> limit(n: {maxPoints.Value})"
                : string.Empty;

            var fluxQuery = $@"
from(bucket: ""{_bucket}"")
  |> range(start: -{sanitizedRange})
  |> filter(fn: (r) => r._measurement == ""hgu_sensors"")
  |> filter(fn: (r) => {sensorFilter})
  |> aggregateWindow(every: {aggregateWindow}, fn: mean, createEmpty: false)
  |> pivot(rowKey: [""_time""], columnKey: [""sensor""], valueColumn: ""_value"")
  |> sort(columns: [""_time""]){limitClause}
";

            var csvResult = await QueryAsync(fluxQuery);
            if (string.IsNullOrWhiteSpace(csvResult))
            {
                return response;
            }

            var rows = ParsePivotCsv(csvResult);
            if (rows.Count == 0)
            {
                return response;
            }

            BuildMotorAndSystemSeries(rows, response, motorList, metricList);
            return response;
        }

        private static string SanitizeRangeLiteral(string? literal)
        {
            if (!string.IsNullOrWhiteSpace(literal) && TimeRangePattern.IsMatch(literal))
            {
                return literal.ToLowerInvariant();
            }

            return "1h";
        }

        private static TimeSpan ParseDurationLiteral(string literal)
        {
            if (string.IsNullOrWhiteSpace(literal))
            {
                return TimeSpan.FromHours(1);
            }

            var suffix = char.ToLowerInvariant(literal[^1]);
            if (!double.TryParse(literal[..^1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var amount) || amount <= 0)
            {
                return TimeSpan.FromHours(1);
            }

            return suffix switch
            {
                's' => TimeSpan.FromSeconds(amount),
                'm' => TimeSpan.FromMinutes(amount),
                'h' => TimeSpan.FromHours(amount),
                'd' => TimeSpan.FromDays(amount),
                'w' => TimeSpan.FromDays(amount * 7),
                _ => TimeSpan.FromHours(1)
            };
        }

        private static string GetAggregateWindowLiteral(TimeSpan range)
        {
            if (range <= TimeSpan.FromMinutes(15))
            {
                return "30s";
            }

            if (range <= TimeSpan.FromHours(1))
            {
                return "1m";
            }

            if (range <= TimeSpan.FromHours(6))
            {
                return "5m";
            }

            if (range <= TimeSpan.FromHours(24))
            {
                return "15m";
            }

            if (range <= TimeSpan.FromDays(7))
            {
                return "1h";
            }

            return "6h";
        }

        private static List<Dictionary<string, string>> ParsePivotCsv(string csv)
        {
            var cleaned = new StringBuilder();
            using (var reader = new StringReader(csv))
            {
                string? line;
                while ((line = reader.ReadLine()) != null)
                {
                    if (string.IsNullOrWhiteSpace(line))
                    {
                        continue;
                    }

                    if (line.StartsWith("#"))
                    {
                        continue;
                    }

                    cleaned.AppendLine(line);
                }
            }

            if (cleaned.Length == 0)
            {
                return new List<Dictionary<string, string>>();
            }

            var rows = new List<Dictionary<string, string>>();
            using (var parser = new TextFieldParser(new StringReader(cleaned.ToString())))
            {
                parser.TextFieldType = FieldType.Delimited;
                parser.SetDelimiters(",");
                parser.HasFieldsEnclosedInQuotes = true;

                string[]? headers = null;
                while (!parser.EndOfData)
                {
                    var fields = parser.ReadFields();
                    if (fields == null)
                    {
                        continue;
                    }

                    if (headers == null)
                    {
                        headers = fields;
                        continue;
                    }

                    var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    for (var i = 0; i < headers.Length && i < fields.Length; i++)
                    {
                        row[headers[i]] = fields[i];
                    }

                    rows.Add(row);
                }
            }

            return rows;
        }

        private static bool TryGetDouble(Dictionary<string, string> row, string key, out double value)
        {
            value = default;
            if (!row.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
            {
                return false;
            }

            return double.TryParse(raw, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out value);
        }

        private static void BuildMotorAndSystemSeries(List<Dictionary<string, string>> rows, InfluxMotorSeriesResponse response, List<int> motorList, List<string> metricList)
        {
            foreach (var row in rows)
            {
                if (!row.TryGetValue("_time", out var timeValue) || string.IsNullOrWhiteSpace(timeValue))
                {
                    continue;
                }

                if (!DateTime.TryParse(timeValue, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var timestamp))
                {
                    continue;
                }

                foreach (var motorId in motorList)
                {
                    var point = new MotorSeriesPoint
                    {
                        Timestamp = timestamp,
                        MotorId = motorId
                    };

                    var hasMetric = false;
                    foreach (var metric in metricList)
                    {
                        var sensorName = MotorMetricSensors[metric](motorId);
                        if (!TryGetDouble(row, sensorName, out var numericValue))
                        {
                            continue;
                        }

                        switch (metric)
                        {
                            case "pressure":
                                point.Pressure = numericValue;
                                break;
                            case "flow":
                                point.Flow = numericValue;
                                break;
                            case "temperature":
                                point.Temperature = numericValue;
                                break;
                            case "rpm":
                                point.Rpm = numericValue;
                                break;
                            case "current":
                                point.Current = numericValue;
                                break;
                        }

                        hasMetric = true;
                    }

                    if (hasMetric)
                    {
                        response.MotorSeries.Add(point);
                    }
                }

                var systemPoint = new SystemTrendPoint
                {
                    Timestamp = timestamp
                };

                var hasSystem = false;

                if (TryGetDouble(row, SystemSensorMap["totalFlow"], out var totalFlow))
                {
                    systemPoint.TotalFlow = totalFlow;
                    hasSystem = true;
                }

                if (TryGetDouble(row, SystemSensorMap["totalPressure"], out var totalPressure))
                {
                    systemPoint.TotalPressure = totalPressure;
                    hasSystem = true;
                }

                if (TryGetDouble(row, SystemSensorMap["activePumps"], out var activePumps))
                {
                    systemPoint.ActivePumps = activePumps;
                    hasSystem = true;
                }

                if (TryGetDouble(row, SystemSensorMap["efficiency"], out var efficiency))
                {
                    systemPoint.Efficiency = efficiency;
                    hasSystem = true;
                }

                if (TryGetDouble(row, SystemSensorMap["tankLevel"], out var tankLevel))
                {
                    systemPoint.TankLevel = tankLevel;
                    hasSystem = true;
                }

                if (TryGetDouble(row, SystemSensorMap["oilTemperature"], out var oilTemperature))
                {
                    systemPoint.OilTemperature = oilTemperature;
                    hasSystem = true;
                }

                if (hasSystem)
                {
                    response.SystemSeries.Add(systemPoint);
                }
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
    public class InfluxMotorSeriesResponse
    {
        public string EffectiveRange { get; set; } = "1h";
        public List<MotorSeriesPoint> MotorSeries { get; } = new();
        public List<SystemTrendPoint> SystemSeries { get; } = new();
    }

    public class MotorSeriesPoint
    {
        public DateTime Timestamp { get; set; }
        public int MotorId { get; set; }
        public double? Pressure { get; set; }
        public double? Flow { get; set; }
        public double? Temperature { get; set; }
        public double? Rpm { get; set; }
        public double? Current { get; set; }
    }

    public class SystemTrendPoint
    {
        public DateTime Timestamp { get; set; }
        public double? TotalFlow { get; set; }
        public double? TotalPressure { get; set; }
        public double? ActivePumps { get; set; }
        public double? Efficiency { get; set; }
        public double? TankLevel { get; set; }
        public double? OilTemperature { get; set; }
    }

}
