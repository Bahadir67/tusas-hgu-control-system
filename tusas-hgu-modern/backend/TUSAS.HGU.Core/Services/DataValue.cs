using System;

namespace TUSAS.HGU.Core.Services
{
    // Simple DataValue class for simulation
    public class DataValue
    {
        public object Value { get; set; }
        public DateTime Timestamp { get; set; }
        public DateTime SourceTimestamp => Timestamp;
        
        public DataValue(object value)
        {
            Value = value;
            Timestamp = DateTime.Now;
        }

        // Helper method for formatted display
        public string GetFormattedValue(string? unit = null)
        {
            if (Value == null) return "--";
            
            var valueStr = Value.ToString() ?? "--";
            return string.IsNullOrEmpty(unit) ? valueStr : $"{valueStr} {unit}";
        }

        public double GetNumericValue()
        {
            if (double.TryParse(Value?.ToString(), out double result))
                return result;
            return 0.0;
        }

        public bool GetBooleanValue()
        {
            if (bool.TryParse(Value?.ToString(), out bool result))
                return result;
            return false;
        }

        public bool IsValid => Value != null;
    }
}