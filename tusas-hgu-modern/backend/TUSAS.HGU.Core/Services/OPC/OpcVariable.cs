using System;

namespace TUSAS.HGU.Core.Services.OPC
{
    /// <summary>
    /// OPC UA değişken modeli
    /// </summary>
    public class OpcVariable
    {
        public string DisplayName { get; set; } = string.Empty;  // Key: "MOTOR_4_LEAK_EXECUTION"
        public string BrowseName { get; set; } = string.Empty;   // "2:MOTOR_4_LEAK_EXECUTION"
        public string DataType { get; set; } = string.Empty;     // "BOOL", "REAL", "INT", etc.
        public object? Value { get; set; }                       // Actual value (bool, float, int, etc.)
        public int NamespaceIndex { get; set; }                  // 2 (ns=2 kısmı)
        public int NodeIdentifier { get; set; }                  // 45 (i=45 kısmı)
        public double? MinValue { get; set; }                    // Range minimum
        public double? MaxValue { get; set; }                    // Range maximum
        
        // Computed properties
        public string NodeId => $"ns={NamespaceIndex};i={NodeIdentifier}";
        public DateTime LastUpdated { get; set; } = DateTime.Now;
        public bool IsValid { get; set; } = false;

        public override string ToString()
        {
            return $"{DisplayName}: {Value} ({DataType}) [{NodeId}]";
        }
    }
}