using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Xml.Linq;
using System.Linq;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography;
using Workstation.ServiceModel.Ua;
using Workstation.ServiceModel.Ua.Channels;
using System.Threading;

namespace TUSAS.HGU.Core.Services
{
    // Configuration model - will be injected from API layer
    public class OpcUaConfig
    {
        public string EndpointUrl { get; set; } = "opc.tcp://192.168.100.10:4840";
        public string SecurityPolicy { get; set; } = "None";
        public string SecurityMode { get; set; } = "None";
        public bool AutoAcceptUntrustedCertificates { get; set; } = true;
        public bool EnableReconnection { get; set; } = true;
        public int ReconnectionDelaySeconds { get; set; } = 5;
        public int DataCollectionIntervalSeconds { get; set; } = 2;
        public string DatabaseBlockName { get; set; } = "DB_HGU_Execution";
        public int NamespaceIndex { get; set; } = 2;
        // Authentication settings
        public bool UseAuthentication { get; set; } = false;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class SensorData
    {
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public Dictionary<string, DataValue> Values { get; set; } = new();
    }

    public class WorkstationOpcUaClient : IAsyncDisposable, IDisposable
    {
        private readonly ILogger<WorkstationOpcUaClient> _logger;
        private readonly OpcUaConfig _config;
        private bool _isConnected = false;
        private bool _disposed = false;
        private ClientSessionChannel? _session;
        private Dictionary<string, object> _latestData = new(); // Latest OPC UA data for UI binding
        private Dictionary<string, DataValue> _reusableSensorDataDict = new(); // Reusable dictionary for sensor data
        private readonly Dictionary<string, DataValue> _reusableDataValueObjects = new(); // Reusable DataValue objects pool

        private Timer? _sensorDataTimer;
        private readonly object _sensorDataLock = new();
        private SensorData? _latestSensorData;
        private int _sensorDataIntervalMs = 1000; // 1 saniye
        
        // ✨ COLLECTION SUPPORT - OPC Variable Collection for real-time updates
        private TUSAS.HGU.Core.Services.OPC.OpcVariableCollection? _opcVariableCollection;
        
        // InfluxDB Service reference
        private InfluxDbService? _influxDbService;

        public bool IsConnected => _isConnected;
        public event EventHandler<bool>? ConnectionStatusChanged;
        
        /// <summary>
        /// OPC Variable Collection'ı set eder - saniyede bir bu collection güncellenecek
        /// </summary>
        public void SetOpcVariableCollection(TUSAS.HGU.Core.Services.OPC.OpcVariableCollection collection)
        {
            _opcVariableCollection = collection;
            _logger.LogInformation("OPC Variable Collection set with {Count} variables", collection.Count);
        }

        /// <summary>
        /// Collection'a public erişim için property
        /// </summary>
        public TUSAS.HGU.Core.Services.OPC.OpcVariableCollection? OpcVariableCollection => _opcVariableCollection;
        
        /// <summary>
        /// InfluxDB Service'i set eder
        /// </summary>
        public void SetInfluxDbService(InfluxDbService influxDbService)
        {
            _influxDbService = influxDbService;
            _logger.LogInformation("InfluxDB service connected to OPC client");
        }

        /// <summary>
        /// Collection namespace'lerini OPC server'dan oku ve güncelle
        /// </summary>
        public async Task UpdateCollectionNamespaces()
        {
            if (!_isConnected || _session == null || _opcVariableCollection == null) return;

            try
            {
                _logger.LogInformation("🔄 Updating collection namespaces...");
                
                // Server namespace array'ini oku
                var namespaceArrayValue = await ReadNodeAsync("ns=0;i=2255");
                
                if (namespaceArrayValue?.Value is string[] namespaceArray)
                {
                    // HGU namespace'ini bul
                    var hguNamespaceIndex = -1;
                    for (int i = 0; i < namespaceArray.Length; i++)
                    {
                        if (namespaceArray[i] == "http://HGU_Interface")
                        {
                            hguNamespaceIndex = i;
                            break;
                        }
                    }

                    if (hguNamespaceIndex >= 0)
                    {
                        _logger.LogInformation("✅ Found HGU namespace at runtime index: {Index}", hguNamespaceIndex);
                        
                        // Collection'daki tüm değişkenlerin namespace'ini güncelle
                        var updatedCount = 0;
                        foreach (var variable in _opcVariableCollection.Variables)
                        {
                            if (variable.NamespaceIndex == 2) // A1.xml'deki static HGU namespace
                            {
                                var oldNodeId = variable.NodeId;
                                variable.NamespaceIndex = hguNamespaceIndex;
                                updatedCount++;
                            }
                        }
                        
                        _logger.LogInformation("✅ Updated {Count} variables with runtime namespace (ns={Ns})", 
                            updatedCount, hguNamespaceIndex);
                    }
                    else
                    {
                        _logger.LogWarning("⚠️ HGU namespace not found in server namespace array");
                    }
                }
                else
                {
                    _logger.LogWarning("⚠️ Could not read namespace array from OPC server");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error updating namespaces: {Message}", ex.Message);
            }
        }

        public WorkstationOpcUaClient(ILogger<WorkstationOpcUaClient> logger, OpcUaConfig config)
        {
            _logger = logger;
            _config = config;
        }

        public async Task<bool> ConnectAsync()
        {
            try
            {
                _logger.LogInformation("Connecting to OPC UA server: {EndpointUrl}", _config.EndpointUrl);
                
                if (_session != null && _isConnected)
                {
                    _logger.LogInformation("Already connected to OPC UA server");
                    return true;
                }

                var certificateStore = new DirectoryStore(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TUSAS", "pki"));

                var appDescription = new ApplicationDescription
                {
                    ApplicationName = "TUSAS HGU Control System",
                    ApplicationUri = "urn:TUSAS:HGU:Client",
                    ApplicationType = ApplicationType.Client
                };

                // Create user identity based on configuration
                IUserIdentity userIdentity;
                if (_config.UseAuthentication && !string.IsNullOrEmpty(_config.Username))
                {
                        userIdentity = new UserNameIdentity(_config.Username, _config.Password);
                }
                else
                {
                        userIdentity = new AnonymousIdentity();
                }

                _session = new ClientSessionChannel(
                    appDescription,
                    null, // no x509 certificates
                    userIdentity, // User authentication
                    _config.EndpointUrl, // endpoint URL
                    SecurityPolicyUris.None); // No security

                await _session.OpenAsync();
                
                _isConnected = true;
                ConnectionStatusChanged?.Invoke(this, true);
                
                _logger.LogInformation("OPC UA connection successful");
                
                // Start periodic data collection
                StartPeriodicDataCollection();
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Connection error: {Message}", ex.Message);
                _isConnected = false;
                ConnectionStatusChanged?.Invoke(this, false);
                return false;
            }
        }

        private void StartPeriodicDataCollection()
        {
            _sensorDataTimer = new Timer(async _ => await CollectSensorDataAsync(), 
                                       null, 
                                       TimeSpan.FromSeconds(1), 
                                       TimeSpan.FromMilliseconds(_sensorDataIntervalMs));
        }

        private async Task CollectSensorDataAsync()
        {
            if (!_isConnected || _session == null || _opcVariableCollection == null) return;

            try
            {
                // Bulk read all variables from collection using updated namespaces
                var variablesToRead = _opcVariableCollection.Variables
                    .Where(v => v.NamespaceIndex > 0) // Skip invalid namespaces
                    .ToList();

                if (variablesToRead.Count == 0) return;

                // Create bulk read request
                var readRequest = new ReadRequest
                {
                    NodesToRead = variablesToRead
                        .Select(variable => new ReadValueId
                        {
                            NodeId = NodeId.Parse(variable.NodeId),
                            AttributeId = AttributeIds.Value
                        })
                        .ToArray()
                };

                // Execute bulk read
                var response = await _session.ReadAsync(readRequest);
                var sensorDataValues = new Dictionary<string, DataValue>();

                // Process results and update collection
                for (int i = 0; i < variablesToRead.Count && i < (response.Results?.Length ?? 0); i++)
                {
                    var variable = variablesToRead[i];
                    var result = response.Results![i];

                    if (StatusCode.IsGood(result.StatusCode))
                    {
                        var value = result.GetValue();
                        
                        // Update collection with new value
                        _opcVariableCollection.UpdateValue(variable.DisplayName, value);
                        
                        // Store for SensorData
                        var dataValue = new DataValue(value ?? 0) { Timestamp = DateTime.Now };
                        sensorDataValues[variable.DisplayName] = dataValue;
                    }
                    else
                    {
                    }
                }

                // Create sensor data for compatibility
                var sensorData = new SensorData
                {
                    Timestamp = DateTime.Now,
                    Values = sensorDataValues
                };

                lock (_sensorDataLock)
                {
                    _latestSensorData = sensorData;
                }

                // Write to InfluxDB if service is available
                if (_influxDbService != null && sensorDataValues.Count > 0)
                {
                    try
                    {
                        // Convert to SensorReading format for InfluxDB
                        var sensorReadings = new Dictionary<string, SensorReading>();
                        foreach (var kvp in sensorDataValues)
                        {
                            var reading = new SensorReading
                            {
                                IsValid = true,
                                Timestamp = kvp.Value.Timestamp,
                                Value = kvp.Value.Value?.ToString() ?? "0",
                                NumericValue = kvp.Value.Value is double d ? d : 
                                              kvp.Value.Value is float f ? (double)f :
                                              kvp.Value.Value is int i ? (double)i :
                                              kvp.Value.Value is bool b ? (b ? 1.0 : 0.0) : 
                                              null
                            };
                            sensorReadings[kvp.Key] = reading;
                        }

                        await _influxDbService.WriteSensorDataAsync(sensorReadings);
                        _logger.LogDebug("Written {Count} sensor values to InfluxDB", sensorReadings.Count);
                    }
                    catch (Exception influxEx)
                    {
                        _logger.LogError(influxEx, "Error writing to InfluxDB: {Message}", influxEx.Message);
                        // Don't throw - continue OPC operations even if InfluxDB fails
                    }
                }

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in bulk sensor data collection: {Message}", ex.Message);
            }
        }

        public SensorData? GetLatestSensorData()
        {
            lock (_sensorDataLock)
            {
                return _latestSensorData;
            }
        }


        public async Task<DataValue?> ReadNodeAsync(string nodeId)
        {
            if (!_isConnected || _session == null)
            {
                _logger.LogWarning("Cannot read - OPC UA not connected");
                return null;
            }

            try
            {
                    
                var readRequest = new ReadRequest
                {
                    NodesToRead = new[]
                    {
                        new ReadValueId
                        {
                            NodeId = NodeId.Parse(nodeId),
                            AttributeId = AttributeIds.Value
                        }
                    }
                };

                var readResponse = await _session.ReadAsync(readRequest);
                
                if (readResponse.Results?.Length > 0)
                {
                    var result = readResponse.Results[0];
                    if (StatusCode.IsGood(result.StatusCode))
                    {
                        var dataValue = new DataValue(result.Value ?? 0)
                        {
                            Timestamp = DateTime.Now
                        };
                        
                        
                        return dataValue;
                    }
                    else
                    {
                        _logger.LogWarning("Read failed for {NodeId}: {Status}", nodeId, result.StatusCode);
                    }
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading node {NodeId}: {Message}", nodeId, ex.Message);
                return null;
            }
        }

        public async Task<bool> WriteNodeAsync(string nodeId, object value)
        {
            if (!_isConnected || _session == null)
            {
                _logger.LogWarning("Cannot write - OPC UA not connected");
                return false;
            }

            try
            {
                
                // Session state validation before write (eski koddan)
                if (_session.State != CommunicationState.Opened)
                {
                    return false;
                }

                // S2 style NodeId parsing for better compatibility (eski koddan)
                NodeId parsedNodeId;
                if (nodeId.StartsWith("ns=") && nodeId.Contains(";i="))
                {
                    var parts = nodeId.Split(';');
                    var nspart = parts[0].Replace("ns=", "");
                    var ipart = parts[1].Replace("i=", "");
                    
                    if (ushort.TryParse(nspart, out ushort namespaceIndex) && 
                        uint.TryParse(ipart, out uint identifier))
                    {
                        parsedNodeId = new NodeId(identifier, namespaceIndex);
                    }
                    else
                    {
                        parsedNodeId = NodeId.Parse(nodeId); // Fallback
                    }
                }
                else
                {
                    parsedNodeId = NodeId.Parse(nodeId); // Standard parsing
                }

                // Convert value based on its type - REAL needs Float, BOOL needs Boolean
                object writeValue;
                
                // First, try to determine the data type from metadata or node info
                if (value is bool boolValue)
                {
                    // BOOL type
                    writeValue = boolValue;
                }
                else if (value is int || value is long || value is short || value is byte)
                {
                    // Integer types - keep as is
                    writeValue = value;
                }
                else
                {
                    // Default to Float for REAL data type
                    try
                    {
                        writeValue = Convert.ToSingle(value);
                    }
                    catch (Exception convEx)
                    {
                        _logger.LogWarning("Type conversion failed for {NodeId}, using original: {Message}", nodeId, convEx.Message);
                        writeValue = value;
                    }
                }

                var writeRequest = new WriteRequest
                {
                    NodesToWrite = new[]
                    {
                        new WriteValue
                        {
                            NodeId = parsedNodeId,
                            AttributeId = AttributeIds.Value,
                            Value = new Workstation.ServiceModel.Ua.DataValue(writeValue)
                        }
                    }
                };


                var response = await _session.WriteAsync(writeRequest);
                
                if (response.Results?.Length > 0 && response.Results[0] == StatusCodes.Good)
                {
                    return true;
                }
                else
                {
                    var statusCode = response.Results?[0];
                    _logger.LogError("Write failed for {NodeId}: StatusCode={Status}", nodeId, statusCode);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error writing to node {NodeId}: {Message}", nodeId, ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Collection'dan değişken adı ile OPC yazma
        /// </summary>
        public async Task<bool> WriteVariableAsync(string displayName, object value)
        {
            if (_opcVariableCollection == null)
            {
                _logger.LogWarning("Cannot write variable - Collection not set");
                return false;
            }

            var variable = _opcVariableCollection.GetByName(displayName);
            if (variable == null)
            {
                _logger.LogWarning("Variable not found in collection: {DisplayName}", displayName);
                return false;
            }


            return await WriteNodeAsync(variable.NodeId, value);
        }

        /// <summary>
        /// Node'un AccessLevel attribute'ünü okur - yazma izni kontrolü için
        /// </summary>
        public async Task<byte?> ReadAccessLevelAsync(string nodeId)
        {
            if (!_isConnected || _session == null)
            {
                _logger.LogWarning("Cannot read AccessLevel - OPC UA not connected");
                return null;
            }

            try
            {
                
                var readRequest = new ReadRequest
                {
                    NodesToRead = new[]
                    {
                        new ReadValueId
                        {
                            NodeId = NodeId.Parse(nodeId),
                            AttributeId = AttributeIds.AccessLevel
                        }
                    }
                };

                var readResponse = await _session.ReadAsync(readRequest);
                
                if (readResponse.Results?.Length > 0)
                {
                    var result = readResponse.Results[0];
                    if (StatusCode.IsGood(result.StatusCode) && result.Value is byte accessLevel)
                    {
                        
                        // AccessLevel bits:
                        // 0x01 = CurrentRead
                        // 0x02 = CurrentWrite
                        // 0x04 = HistoryRead
                        // 0x08 = HistoryWrite
                        var canRead = (accessLevel & 0x01) != 0;
                        var canWrite = (accessLevel & 0x02) != 0;
                        
                        
                        if (!canWrite)
                        {
                        }
                        
                        return accessLevel;
                    }
                    else
                    {
                        _logger.LogWarning("AccessLevel read failed for {NodeId}: {Status}", nodeId, result.StatusCode);
                    }
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading AccessLevel for node {NodeId}: {Message}", nodeId, ex.Message);
                return null;
            }
        }

        /// <summary>
        /// Session ve endpoint bilgilerini detaylı logla - debugging için
        /// </summary>
        public async Task<object> GetSessionDiagnosticsAsync()
        {
            if (!_isConnected || _session == null)
            {
                return new { Error = "Session not connected", IsConnected = _isConnected };
            }

            try
            {
                var diagnostics = new
                {
                    Session = new
                    {
                        State = _session.State.ToString(),
                        SessionId = _session.SessionId?.ToString() ?? "null",
                        EndpointUrl = _config.EndpointUrl,
                        SecurityPolicy = _config.SecurityPolicy,
                        SecurityMode = _config.SecurityMode,
                        IsConnected = _isConnected
                    },
                    Client = new
                    {
                        ApplicationName = "TUSAS HGU Control System",
                        ApplicationUri = "urn:TUSAS:HGU:Client",
                        ApplicationType = "Client"
                    },
                    Authentication = new
                    {
                        Type = _config.UseAuthentication ? "Username/Password" : "Anonymous",
                        UserIdentity = _config.UseAuthentication ? _config.Username : "AnonymousIdentity"
                    },
                    Security = new
                    {
                        Policy = "None",
                        Mode = "None",
                        Certificate = "None"
                    },
                    Timestamp = DateTime.Now
                };

                return diagnostics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting session diagnostics");
                return new { Error = ex.Message };
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (_disposed) return;

            try
            {
                _sensorDataTimer?.Dispose();
                if (_session != null)
                {
                    await _session.CloseAsync();
                    _session = null;
                }
                _logger.LogInformation("OPC UA client disposed");
                _isConnected = false;
                ConnectionStatusChanged?.Invoke(this, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disposing OPC UA client: {Message}", ex.Message);
            }

            _disposed = true;
        }

        public void Dispose()
        {
            try
            {
                DisposeAsync().AsTask().Wait();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in synchronous dispose: {Message}", ex.Message);
            }
        }
    }
}