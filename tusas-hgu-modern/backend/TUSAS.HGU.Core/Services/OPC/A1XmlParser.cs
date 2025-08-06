using System;
using System.IO;
using System.Xml.Linq;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TUSAS.HGU.Core.Services;
using Workstation.ServiceModel.Ua;

namespace TUSAS.HGU.Core.Services.OPC
{
    /// <summary>
    /// A1.xml dosyasını parse eden ve namespace'leri otomatik güncelleyen sınıf
    /// </summary>
    public class A1XmlParser
    {
        private readonly ILogger<A1XmlParser> _logger;

        public A1XmlParser(ILogger<A1XmlParser> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// A1.xml dosyasını parse edip OpcVariableCollection döner (sync version)
        /// </summary>
        public OpcVariableCollection ParseA1Xml(string xmlPath)
        {
            return ParseA1XmlInternal(xmlPath);
        }

        /// <summary>
        /// A1.xml dosyasını parse edip namespace'leri otomatik update eder (async version)
        /// </summary>
        public async Task<OpcVariableCollection> ParseA1XmlWithNamespaceUpdateAsync(string xmlPath, WorkstationOpcUaClient opcClient)
        {
            var collection = ParseA1XmlInternal(xmlPath);
            
            if (collection.Count > 0 && opcClient.IsConnected)
            {
                await UpdateNamespacesAsync(collection, opcClient);
            }
            
            return collection;
        }

        private OpcVariableCollection ParseA1XmlInternal(string xmlPath)
        {
            var collection = new OpcVariableCollection();

            try
            {
                _logger.LogInformation("📖 Parsing A1.xml from: {XmlPath}", xmlPath);

                if (!File.Exists(xmlPath))
                {
                    _logger.LogError("❌ A1.xml file not found: {XmlPath}", xmlPath);
                    return collection;
                }

                var doc = XDocument.Load(xmlPath);
                var ns = XNamespace.Get("http://opcfoundation.org/UA/2011/03/UANodeSet.xsd");

                foreach (var node in doc.Descendants(ns + "UAVariable"))
                {
                    var nodeId = node.Attribute("NodeId")?.Value?.Trim();
                    var browseName = node.Attribute("BrowseName")?.Value?.Trim();
                    var dataType = node.Attribute("DataType")?.Value?.Trim();
                    
                    var displayName = node.Element(ns + "DisplayName")?.Value?.Trim();
                    var description = node.Element(ns + "Description")?.Value?.Trim();

                    // Sadece HGU namespace'indeki değişkenleri al (ns=2)
                    if (!string.IsNullOrEmpty(nodeId) && nodeId.StartsWith("ns=2;i="))
                    {
                        var opcVariable = ParseOpcVariable(nodeId, browseName, displayName, dataType, description);
                        if (opcVariable != null)
                        {
                            collection.Add(opcVariable);
                            _logger.LogDebug("✅ Added variable: {DisplayName} -> {NodeId}", 
                                opcVariable.DisplayName, opcVariable.NodeId);
                        }
                    }
                }

                _logger.LogInformation("✅ Parsed {Count} OPC variables from A1.xml", collection.Count);
                return collection;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error parsing A1.xml: {Message}", ex.Message);
                return collection;
            }
        }

        /// <summary>
        /// Collection'daki namespace'leri online OPC server'dan alınan bilgilerle update eder
        /// </summary>
        private async Task UpdateNamespacesAsync(OpcVariableCollection collection, WorkstationOpcUaClient opcClient)
        {
            try
            {
                _logger.LogInformation("🔄 Updating namespaces with runtime OPC server data...");
                
                // Server namespace array'ini oku (NodeId 2255 in namespace 0)
                var namespaceArrayValue = await opcClient.ReadNodeAsync("ns=0;i=2255");
                
                if (namespaceArrayValue?.Value is string[] namespaceArray)
                {
                    // HGU namespace'ini bul (http://HGU_Interface)
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
                        foreach (var variable in collection.Variables)
                        {
                            if (variable.NamespaceIndex == 2) // A1.xml'deki static HGU namespace
                            {
                                var oldNodeId = variable.NodeId;
                                variable.NamespaceIndex = hguNamespaceIndex; // Runtime namespace ile güncelle
                                _logger.LogDebug("🔄 Updated {DisplayName}: {OldNodeId} -> {NewNodeId}", 
                                    variable.DisplayName, oldNodeId, variable.NodeId);
                                updatedCount++;
                            }
                        }
                        
                        _logger.LogInformation("✅ Updated {UpdatedCount} variables with runtime HGU namespace (ns={HguNs})", 
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

        private OpcVariable? ParseOpcVariable(string nodeId, string? browseName, string? displayName, 
            string? dataType, string? description)
        {
            try
            {
                // NodeId parse: "ns=2;i=45" -> ns=2, i=45
                var nodeIdMatch = Regex.Match(nodeId, @"ns=(\d+);i=(\d+)");
                if (!nodeIdMatch.Success)
                    return null;

                var namespaceIndex = int.Parse(nodeIdMatch.Groups[1].Value);
                var nodeIdentifier = int.Parse(nodeIdMatch.Groups[2].Value);

                // Range parse from description
                var (minValue, maxValue) = ParseRangeFromDescription(description);

                return new OpcVariable
                {
                    DisplayName = displayName ?? browseName ?? "Unknown",
                    BrowseName = browseName ?? "",
                    DataType = dataType ?? "Unknown",
                    NamespaceIndex = namespaceIndex,
                    NodeIdentifier = nodeIdentifier,
                    MinValue = minValue,
                    MaxValue = maxValue,
                    Value = null, // Will be filled by OPC UA read
                    IsValid = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Failed to parse OPC variable: {NodeId}", nodeId);
                return null;
            }
        }

        private (double? minValue, double? maxValue) ParseRangeFromDescription(string? description)
        {
            if (string.IsNullOrEmpty(description))
                return (null, null);

            try
            {
                // Description'dan range parse et, örn: "Range: 0-100 bar" veya "[0-350]"
                var rangePatterns = new[]
                {
                    @"Range:\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)",
                    @"\[(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\]",
                    @"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)"
                };

                foreach (var pattern in rangePatterns)
                {
                    var match = Regex.Match(description, pattern);
                    if (match.Success && match.Groups.Count >= 3)
                    {
                        if (double.TryParse(match.Groups[1].Value, out double min) &&
                            double.TryParse(match.Groups[2].Value, out double max))
                        {
                            return (min, max);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error parsing range from description: {Description}", description);
            }

            return (null, null);
        }
    }
}