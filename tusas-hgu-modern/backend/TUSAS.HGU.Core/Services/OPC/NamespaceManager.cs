using Microsoft.Extensions.Logging;
using Workstation.ServiceModel.Ua;
using Workstation.ServiceModel.Ua.Channels;

namespace TUSAS.HGU.Core.Services.OPC
{
    /// <summary>
    /// OPC UA Namespace yönetimi - A1.xml static namespace'lerini runtime namespace'lere çevir
    /// </summary>
    public class NamespaceManager
    {
        private readonly ILogger<NamespaceManager> _logger;
        private readonly Dictionary<string, ushort> _namespaceUriToIndex = new();
        private readonly Dictionary<ushort, ushort> _staticToRuntimeMapping = new();

        // A1.xml'deki bilinen namespace URI'leri
        public static readonly Dictionary<ushort, string> StaticNamespaceUris = new()
        {
            [1] = "http://www.siemens.com/simatic-s7-opcua",  // Siemens namespace (ns=1 in A1.xml)
            [2] = "http://HGU_Interface"  // HGU namespace (ns=2 in A1.xml)
        };

        public NamespaceManager(ILogger<NamespaceManager> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// OPC sunucusundan namespace array'ini oku ve mapping oluştur
        /// </summary>
        public async Task<bool> ReadServerNamespacesAsync(ClientSessionChannel session)
        {
            try
            {
                _logger.LogInformation("🔍 Reading server namespace array...");

                // Server Namespace Array NodeId (standart OPC UA)
                var namespaceArrayNodeId = new NodeId(2255, 0);
                
                var readRequest = new ReadRequest
                {
                    NodesToRead = new[] 
                    { 
                        new ReadValueId 
                        { 
                            NodeId = namespaceArrayNodeId, 
                            AttributeId = AttributeIds.Value 
                        } 
                    }
                };

                var response = await session.ReadAsync(readRequest);
                
                if (response.Results?.Length > 0 && response.Results[0].Value != null)
                {
                    var namespaceArray = response.Results[0].GetValue() as string[];
                    if (namespaceArray != null)
                    {
                        return ProcessNamespaceArray(namespaceArray);
                    }
                }

                _logger.LogWarning("⚠️ Could not read namespace array from server");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error reading server namespaces");
                return false;
            }
        }

        private bool ProcessNamespaceArray(string[] namespaceArray)
        {
            _logger.LogInformation($"📋 Processing {namespaceArray.Length} server namespaces...");

            // Clear previous mappings
            _namespaceUriToIndex.Clear();
            _staticToRuntimeMapping.Clear();

            // Map each URI to its runtime index
            for (ushort i = 0; i < namespaceArray.Length; i++)
            {
                var uri = namespaceArray[i];
                _namespaceUriToIndex[uri] = i;
                _logger.LogDebug($"📁 Runtime ns={i}: {uri}");
            }

            // Create static to runtime mapping
            var mappingSuccess = true;
            foreach (var (staticIndex, uri) in StaticNamespaceUris)
            {
                if (_namespaceUriToIndex.TryGetValue(uri, out ushort runtimeIndex))
                {
                    _staticToRuntimeMapping[staticIndex] = runtimeIndex;
                    _logger.LogInformation($"✅ Namespace mapping: A1.xml ns={staticIndex} → Runtime ns={runtimeIndex} ({uri})");
                }
                else
                {
                    _logger.LogWarning($"⚠️ Namespace not found in server: {uri} (A1.xml ns={staticIndex})");
                    mappingSuccess = false;
                }
            }

            _logger.LogInformation($"📊 Namespace mapping result: {_staticToRuntimeMapping.Count}/{StaticNamespaceUris.Count} mapped successfully");
            return mappingSuccess;
        }

        /// <summary>
        /// A1.xml static namespace index'ini runtime namespace index'e çevir
        /// </summary>
        public ushort? GetRuntimeNamespaceIndex(ushort staticNamespaceIndex)
        {
            return _staticToRuntimeMapping.TryGetValue(staticNamespaceIndex, out ushort runtimeIndex) 
                ? runtimeIndex 
                : null;
        }

        /// <summary>
        /// NodeId'yi runtime namespace ile güncelle
        /// </summary>
        public NodeId? ConvertToRuntimeNodeId(ushort staticNamespaceIndex, int nodeIdentifier)
        {
            var runtimeIndex = GetRuntimeNamespaceIndex(staticNamespaceIndex);
            if (runtimeIndex.HasValue)
            {
                return new NodeId((uint)nodeIdentifier, runtimeIndex.Value);
            }
            return null;
        }

        /// <summary>
        /// OpcVariable'ın NodeId'sini runtime namespace ile güncelle
        /// </summary>
        public bool UpdateVariableNodeId(OpcVariable variable)
        {
            var runtimeIndex = GetRuntimeNamespaceIndex((ushort)variable.NamespaceIndex);
            if (runtimeIndex.HasValue)
            {
                // Güncelleme öncesi bilgiyi logla
                var oldNodeId = variable.NodeId;
                
                // Runtime namespace ile güncelle
                variable.NamespaceIndex = runtimeIndex.Value;
                
                _logger.LogDebug($"🔄 Updated {variable.DisplayName}: {oldNodeId} → {variable.NodeId}");
                return true;
            }
            
            _logger.LogWarning($"⚠️ Cannot update namespace for {variable.DisplayName}: static ns={variable.NamespaceIndex} not mapped");
            return false;
        }

        /// <summary>
        /// Collection'daki tüm değişkenlerin namespace'lerini güncelle
        /// </summary>
        public int UpdateCollectionNamespaces(OpcVariableCollection collection)
        {
            _logger.LogInformation("🔄 Updating collection namespaces with runtime mapping...");
            
            var updateCount = 0;
            foreach (var variable in collection.Variables)
            {
                if (UpdateVariableNodeId(variable))
                {
                    updateCount++;
                }
            }

            _logger.LogInformation($"✅ Updated {updateCount}/{collection.Count} variables with runtime namespaces");
            return updateCount;
        }

        /// <summary>
        /// Mapping durumu hakkında özet bilgi
        /// </summary>
        public NamespaceMappingStatus GetMappingStatus()
        {
            return new NamespaceMappingStatus
            {
                TotalServerNamespaces = _namespaceUriToIndex.Count,
                MappedNamespaces = _staticToRuntimeMapping.Count,
                ExpectedNamespaces = StaticNamespaceUris.Count,
                IsComplete = _staticToRuntimeMapping.Count == StaticNamespaceUris.Count,
                Mappings = _staticToRuntimeMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
            };
        }
    }

    /// <summary>
    /// Namespace mapping durumu bilgisi
    /// </summary>
    public class NamespaceMappingStatus
    {
        public int TotalServerNamespaces { get; set; }
        public int MappedNamespaces { get; set; }
        public int ExpectedNamespaces { get; set; }
        public bool IsComplete { get; set; }
        public Dictionary<ushort, ushort> Mappings { get; set; } = new();
    }
}