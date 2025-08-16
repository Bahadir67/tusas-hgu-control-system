using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TUSAS.HGU.Core.Models
{
    /// <summary>
    /// ISA-101 compliant alarm severity levels
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum AlarmSeverity
    {
        CRITICAL = 1,   // Immediate action required
        HIGH = 2,       // Prompt action required  
        WARNING = 3,    // Action required when convenient
        INFO = 4        // Information only
    }

    /// <summary>
    /// ISA-101 compliant alarm states
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum AlarmState
    {
        ACTIVE = 1,        // Alarm condition exists
        ACKNOWLEDGED = 2,   // Operator has acknowledged
        RESOLVED = 3,       // Condition returned to normal
        SHELVED = 4,        // Temporarily suppressed
        SUPPRESSED = 5      // System suppressed
    }

    /// <summary>
    /// Alarm categories for organization and filtering
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum AlarmCategory
    {
        PROCESS = 1,        // Process-related alarms (pressure, temperature, flow)
        SAFETY = 2,         // Safety system alarms (emergency stop, interlocks)
        EQUIPMENT = 3,      // Equipment-related alarms (motor faults, communication)
        COMMUNICATION = 4,  // Communication and network alarms
        SECURITY = 5,       // Security-related alarms
        MAINTENANCE = 6     // Maintenance and service alarms
    }

    /// <summary>
    /// Main alarm entry model - ISA-101 and IEC 62443 compliant
    /// </summary>
    public class AlarmEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public DateTime Timestamp { get; set; }
        
        [Required]
        public AlarmSeverity Severity { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Source { get; set; } = string.Empty; // Motor ID or System
        
        [Required]
        [StringLength(200)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        public AlarmState State { get; set; }
        
        [Range(1, 10)]
        public int Priority { get; set; } // 1-10 priority scale (1 = highest)
        
        [Required]
        public AlarmCategory Category { get; set; }
        
        public bool RequiresOperatorAction { get; set; } = false;
        
        [StringLength(500)]
        public string? Consequence { get; set; }
        
        [StringLength(500)]
        public string? CorrectiveAction { get; set; }
        
        // Timestamps for alarm lifecycle tracking
        public DateTime? AcknowledgedTimestamp { get; set; }
        public DateTime? ResolvedTimestamp { get; set; }
        public DateTime? ShelvedTimestamp { get; set; }
        
        [StringLength(50)]
        public string? AcknowledgedBy { get; set; }
        
        [StringLength(50)]
        public string? ResolvedBy { get; set; }
        
        [StringLength(200)]
        public string? Notes { get; set; }
        
        // Related data for context
        public Dictionary<string, object>? RelatedData { get; set; }
    }

    /// <summary>
    /// Alarm summary for dashboard display
    /// </summary>
    public class AlarmSummary
    {
        public int TotalActive { get; set; }
        public int CriticalCount { get; set; }
        public int HighCount { get; set; }
        public int WarningCount { get; set; }
        public int InfoCount { get; set; }
        public int UnacknowledgedCount { get; set; }
        public DateTime LastUpdate { get; set; }
        public List<AlarmEntry> MostCritical { get; set; } = new List<AlarmEntry>();
    }

    /// <summary>
    /// Alarm filter for querying specific alarms
    /// </summary>
    public class AlarmFilter
    {
        public AlarmSeverity? Severity { get; set; }
        public AlarmState? State { get; set; }
        public AlarmCategory? Category { get; set; }
        public string? Source { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public bool? RequiresOperatorAction { get; set; }
        public int MaxResults { get; set; } = 100;
        public int Skip { get; set; } = 0;
    }

    /// <summary>
    /// Alarm acknowledgment request
    /// </summary>
    public class AlarmAcknowledgmentRequest
    {
        [Required]
        public string AlarmId { get; set; } = string.Empty;
        
        [StringLength(200)]
        public string? Notes { get; set; }
        
        [Required]
        [StringLength(50)]
        public string AcknowledgedBy { get; set; } = string.Empty;
    }

    /// <summary>
    /// Alarm shelve/suppress request
    /// </summary>
    public class AlarmShelveRequest
    {
        [Required]
        public string AlarmId { get; set; } = string.Empty;
        
        [Required]
        public TimeSpan ShelveDuration { get; set; }
        
        [StringLength(200)]
        public string? Reason { get; set; }
        
        [Required]
        [StringLength(50)]
        public string ShelvedBy { get; set; } = string.Empty;
    }

    /// <summary>
    /// Alarm configuration settings
    /// </summary>
    public class AlarmConfiguration
    {
        public bool EnableEmailNotifications { get; set; } = false;
        public bool EnableSmsNotifications { get; set; } = false;
        public bool EnableAudibleAlarms { get; set; } = true;
        public int MaxActiveAlarms { get; set; } = 1000;
        public int MaxHistoryAlarms { get; set; } = 10000;
        public TimeSpan AlarmHistoryRetention { get; set; } = TimeSpan.FromDays(90);
        
        // Escalation settings
        public TimeSpan EscalationDelay { get; set; } = TimeSpan.FromMinutes(15);
        public List<string> EscalationContacts { get; set; } = new List<string>();
        
        // Auto-acknowledgment settings for certain alarm types
        public Dictionary<string, TimeSpan> AutoAcknowledgeSettings { get; set; } = new Dictionary<string, TimeSpan>();
    }

    /// <summary>
    /// Real-time alarm update for WebSocket communication
    /// </summary>
    public class AlarmUpdate
    {
        public string Type { get; set; } = string.Empty; // "NEW", "ACK", "RESOLVED", "SHELVED"
        public AlarmEntry Alarm { get; set; } = new AlarmEntry();
        public AlarmSummary Summary { get; set; } = new AlarmSummary();
        public DateTime Timestamp { get; set; } = DateTime.Now;
    }

    /// <summary>
    /// Alarm trend data for analysis
    /// </summary>
    public class AlarmTrendData
    {
        public DateTime Period { get; set; }
        public int TotalAlarms { get; set; }
        public int CriticalAlarms { get; set; }
        public int HighAlarms { get; set; }
        public int WarningAlarms { get; set; }
        public Dictionary<string, int> AlarmsBySource { get; set; } = new Dictionary<string, int>();
        public Dictionary<AlarmCategory, int> AlarmsByCategory { get; set; } = new Dictionary<AlarmCategory, int>();
    }
}