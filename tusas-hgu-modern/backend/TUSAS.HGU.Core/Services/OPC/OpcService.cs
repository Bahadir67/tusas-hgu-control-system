using Microsoft.Extensions.Logging;
using Workstation.ServiceModel.Ua;
using Workstation.ServiceModel.Ua.Channels;

namespace TUSAS.HGU.Core.Services.OPC
{
    /// <summary>
    /// Modern OPC UA Service - Collection-based approach with namespace management
    /// </summary>
    public class OpcService : IDisposable
    {
        private readonly ILogger<OpcService> _logger;
        private readonly A1XmlParser _xmlParser;
        private readonly NamespaceManager _namespaceManager;
        
        private ClientSessionChannel? _session;
        private OpcVariableCollection? _variables;
        private bool _isConnected = false;
        private bool _disposed = false;

        // Configuration
        private readonly string _endpointUrl;
        private readonly string _xmlPath;

        public OpcService(ILogger<OpcService> logger, string endpointUrl, string xmlPath)
        {
            _logger = logger;
            _endpointUrl = endpointUrl;
            _xmlPath = xmlPath;
            
            // Sub-services
            var loggerFactory = LoggerFactory.Create(builder => { });
            _xmlParser = new A1XmlParser(loggerFactory.CreateLogger<A1XmlParser>());
            _namespaceManager = new NamespaceManager(loggerFactory.CreateLogger<NamespaceManager>());
        }

        public bool IsConnected => _isConnected;
        public OpcVariableCollection? Variables => _variables;
        public NamespaceMappingStatus? NamespaceStatus => _namespaceManager?.GetMappingStatus();

        /// <summary>
        /// OPC bağlantısını başlat ve A1.xml'i yükle
        /// </summary>
        public async Task<bool> InitializeAsync()
        {
            try
            {
                _logger.LogInformation("🚀 Initializing OPC Service...");

                // Step 1: Parse A1.xml
                if (!LoadA1XmlVariables())
                    return false;

                // Step 2: Connect to OPC server
                if (!await ConnectToServerAsync())
                    return false;

                // Step 3: Read server namespaces and update collection
                if (!await UpdateNamespaceReferencesAsync())
                    return false;

                _logger.LogInformation("✅ OPC Service initialized successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error initializing OPC Service");
                return false;
            }
        }

        private bool LoadA1XmlVariables()
        {
            _logger.LogInformation("📖 Loading A1.xml variables...");
            
            _variables = _xmlParser.ParseA1Xml(_xmlPath);
            if (_variables.Count == 0)
            {
                _logger.LogError("❌ No variables loaded from A1.xml");
                return false;
            }

            _logger.LogInformation($"✅ Loaded {_variables.Count} variables from A1.xml");
            return true;
        }

        private async Task<bool> ConnectToServerAsync()
        {
            try
            {
                _logger.LogInformation($"🔌 Connecting to OPC server: {_endpointUrl}");

                var clientDescription = new ApplicationDescription
                {
                    ApplicationName = "TUSAS HGU Modern Client",
                    ApplicationUri = $"urn:{Environment.MachineName}:TUSAS:HGU:Modern",
                    ApplicationType = ApplicationType.Client
                };

                _session = new ClientSessionChannel(clientDescription, null, new AnonymousIdentity(), _endpointUrl);
                await _session.OpenAsync();
                
                _isConnected = _session.State == CommunicationState.Opened;
                
                if (_isConnected)
                {
                    _logger.LogInformation("✅ OPC connection successful");
                    return true;
                }
                else
                {
                    _logger.LogError($"❌ OPC connection failed - State: {_session.State}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error connecting to OPC server");
                _isConnected = false;
                return false;
            }
        }

        private async Task<bool> UpdateNamespaceReferencesAsync()
        {
            if (_session == null || _variables == null)
                return false;

            _logger.LogInformation("🔄 Updating namespace references...");

            // Read server namespaces
            var namespacesRead = await _namespaceManager.ReadServerNamespacesAsync(_session);
            if (!namespacesRead)
            {
                _logger.LogWarning("⚠️ Could not read server namespaces - using static namespaces");
                return false;
            }

            // Update collection with runtime namespaces
            var updatedCount = _namespaceManager.UpdateCollectionNamespaces(_variables);
            
            var status = _namespaceManager.GetMappingStatus();
            _logger.LogInformation($"📊 Namespace update summary: {updatedCount} variables updated, {status.MappedNamespaces}/{status.ExpectedNamespaces} namespaces mapped");

            return status.IsComplete;
        }

        /// <summary>
        /// Değişken değerini oku
        /// </summary>
        public async Task<object?> ReadVariableAsync(string displayName)
        {
            if (!_isConnected || _session == null || _variables == null)
                return null;

            var variable = _variables.GetByName(displayName);
            if (variable == null)
            {
                _logger.LogWarning($"⚠️ Variable not found: {displayName}");
                return null;
            }

            try
            {
                var nodeId = new NodeId((uint)variable.NodeIdentifier, (ushort)variable.NamespaceIndex);
                var readRequest = new ReadRequest
                {
                    NodesToRead = new[] { new ReadValueId { NodeId = nodeId, AttributeId = AttributeIds.Value } }
                };

                var response = await _session.ReadAsync(readRequest);
                if (response.Results?.Length > 0 && StatusCode.IsGood(response.Results[0].StatusCode))
                {
                    var value = response.Results[0].GetValue();
                    
                    // Collection'ı güncelle
                    _variables.UpdateValue(displayName, value);
                    
                    _logger.LogDebug($"✅ Read {displayName}: {value} [{variable.NodeId}]");
                    return value;
                }
                else
                {
                    _logger.LogWarning($"⚠️ Failed to read {displayName}: {response.Results?[0].StatusCode}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error reading variable {displayName}");
                return null;
            }
        }

        /// <summary>
        /// Birden fazla değişkeni toplu oku
        /// </summary>
        public async Task<Dictionary<string, object?>> ReadVariablesAsync(IEnumerable<string> displayNames)
        {
            var results = new Dictionary<string, object?>();

            if (!_isConnected || _session == null || _variables == null)
                return results;

            var variablesToRead = new List<(string displayName, OpcVariable variable, NodeId nodeId)>();
            
            // Validate variables and prepare NodeIds
            foreach (var displayName in displayNames)
            {
                var variable = _variables.GetByName(displayName);
                if (variable != null)
                {
                    var nodeId = new NodeId((uint)variable.NodeIdentifier, (ushort)variable.NamespaceIndex);
                    variablesToRead.Add((displayName, variable, nodeId));
                }
                else
                {
                    results[displayName] = null;
                    _logger.LogWarning($"⚠️ Variable not found: {displayName}");
                }
            }

            if (variablesToRead.Count == 0)
                return results;

            try
            {
                // Bulk read request
                var readRequest = new ReadRequest
                {
                    NodesToRead = variablesToRead
                        .Select(item => new ReadValueId { NodeId = item.nodeId, AttributeId = AttributeIds.Value })
                        .ToArray()
                };

                var response = await _session.ReadAsync(readRequest);
                
                // Process results
                for (int i = 0; i < variablesToRead.Count && i < (response.Results?.Length ?? 0); i++)
                {
                    var (displayName, variable, nodeId) = variablesToRead[i];
                    var result = response.Results![i];

                    if (StatusCode.IsGood(result.StatusCode))
                    {
                        var value = result.GetValue();
                        results[displayName] = value;
                        
                        // Update collection
                        _variables.UpdateValue(displayName, value);
                        
                        _logger.LogDebug($"✅ Read {displayName}: {value}");
                    }
                    else
                    {
                        results[displayName] = null;
                        _logger.LogWarning($"⚠️ Failed to read {displayName}: {result.StatusCode}");
                    }
                }

                _logger.LogInformation($"📊 Bulk read completed: {variablesToRead.Count} variables");
                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in bulk read operation");
                return results;
            }
        }

        /// <summary>
        /// Service durumu hakkında detaylı bilgi
        /// </summary>
        public OpcServiceStatus GetStatus()
        {
            return new OpcServiceStatus
            {
                IsConnected = _isConnected,
                EndpointUrl = _endpointUrl,
                VariableCount = _variables?.Count ?? 0,
                ValidVariableCount = _variables?.ValidCount ?? 0,
                NamespaceStatus = _namespaceManager.GetMappingStatus(),
                LastUpdate = DateTime.Now
            };
        }

        public void Dispose()
        {
            if (_disposed)
                return;

            try
            {
                _session?.CloseAsync().Wait(TimeSpan.FromSeconds(5));
                // ClientSessionChannel implements IDisposable through base classes
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disposing OPC client");
            }

            _isConnected = false;
            _disposed = true;
        }
    }

    /// <summary>
    /// OPC Service durum bilgisi
    /// </summary>
    public class OpcServiceStatus
    {
        public bool IsConnected { get; set; }
        public string EndpointUrl { get; set; } = string.Empty;
        public int VariableCount { get; set; }
        public int ValidVariableCount { get; set; }
        public NamespaceMappingStatus? NamespaceStatus { get; set; }
        public DateTime LastUpdate { get; set; }
    }
}