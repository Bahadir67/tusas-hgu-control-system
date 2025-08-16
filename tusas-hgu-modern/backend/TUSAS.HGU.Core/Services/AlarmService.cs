using Microsoft.Extensions.Logging;
using TUSAS.HGU.Core.Models;

namespace TUSAS.HGU.Core.Services;

public class AlarmService
{
    private readonly ILogger<AlarmService> _logger;
    private readonly List<AlarmEntry> _activeAlarms;
    private readonly List<AlarmEntry> _alarmHistory;
    private readonly object _alarmLock = new object();

    public AlarmService(ILogger<AlarmService> logger)
    {
        _logger = logger;
        _activeAlarms = new List<AlarmEntry>();
        _alarmHistory = new List<AlarmEntry>();
    }

    public List<AlarmEntry> GetActiveAlarms()
    {
        lock (_alarmLock)
        {
            return _activeAlarms.OrderBy(a => a.Priority).ThenBy(a => a.Timestamp).ToList();
        }
    }

    public List<AlarmEntry> GetAlarmHistory(int maxCount = 100)
    {
        lock (_alarmLock)
        {
            return _alarmHistory.OrderByDescending(a => a.Timestamp).Take(maxCount).ToList();
        }
    }

    public void ProcessAlarms(Dictionary<string, DataValue> opcData)
    {
        try
        {
            var currentTime = DateTime.Now;
            var newAlarms = new List<AlarmEntry>();

            // Motor alarmları kontrol et
            for (int i = 1; i <= 7; i++)
            {
                CheckMotorAlarms(i, opcData, currentTime, newAlarms);
            }

            // Sistem alarmları kontrol et
            CheckSystemAlarms(opcData, currentTime, newAlarms);
            
            // Soğutma sistemi alarmları kontrol et
            CheckCoolingAlarms(opcData, currentTime, newAlarms);

            // Yeni alarmları işle
            lock (_alarmLock)
            {
                foreach (var alarm in newAlarms)
                {
                    // Aynı alarm zaten aktif mi?
                    var existingAlarm = _activeAlarms.FirstOrDefault(a => a.Source == alarm.Source && a.Description == alarm.Description);
                    
                    if (existingAlarm == null)
                    {
                        // Yeni alarm ekle
                        _activeAlarms.Add(alarm);
                        _alarmHistory.Add(alarm);
                        _logger.LogWarning("🚨 New alarm: {Source} - {Description} [Priority: {Priority}]", 
                            alarm.Source, alarm.Description, alarm.Severity);
                    }
                }

                // Geçersiz alarmları kaldır
                RemoveResolvedAlarms(opcData, currentTime);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing alarms");
        }
    }

    private void CheckMotorAlarms(int motorId, Dictionary<string, DataValue> opcData, DateTime currentTime, List<AlarmEntry> newAlarms)
    {
        var motorSource = $"MOTOR_{motorId}";

        // Motor status kontrolü
        if (opcData.TryGetValue($"MOTOR_{motorId}_MOTOR_STATUS_EXECUTION", out var statusData) && statusData.Value is int status)
        {
            if (status == 3) // Error
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.CRITICAL,
                    Source = motorSource,
                    Description = "Motor Error State",
                    State = AlarmState.ACTIVE,
                    Priority = 1,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = true,
                    CorrectiveAction = "Check motor drive and connections. Reset motor after resolving issue."
                };
                newAlarms.Add(alarm);
            }
        }

        // Motor error code kontrolü
        if (opcData.TryGetValue($"MOTOR_{motorId}_ERROR_CODE_EXECUTION", out var errorCodeData) && errorCodeData.Value is int errorCode)
        {
            if (errorCode > 0)
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = GetErrorCodeSeverity(errorCode),
                    Source = motorSource,
                    Description = $"Motor Error Code: {errorCode}",
                    State = AlarmState.ACTIVE,
                    Priority = GetErrorCodePriority(errorCode),
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = true,
                    CorrectiveAction = GetErrorCodeAction(errorCode)
                };
                newAlarms.Add(alarm);
            }
        }

        // Filter alarmları kontrolü
        CheckFilterAlarms(motorId, opcData, currentTime, newAlarms);
    }

    private void CheckFilterAlarms(int motorId, Dictionary<string, DataValue> opcData, DateTime currentTime, List<AlarmEntry> newAlarms)
    {
        var motorSource = $"MOTOR_{motorId}";

        // Line filter kontrolü
        if (opcData.TryGetValue($"MOTOR_{motorId}_LINE_FILTER_EXECUTION", out var lineFilterData) && lineFilterData.Value is int lineFilter)
        {
            if (lineFilter == 0) // Error
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.HIGH,
                    Source = motorSource,
                    Description = "Line Filter Error",
                    State = AlarmState.ACTIVE,
                    Priority = 2,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = true,
                    CorrectiveAction = "Replace or clean line filter immediately"
                };
                newAlarms.Add(alarm);
            }
            else if (lineFilter == 1) // Warning
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.WARNING,
                    Source = motorSource,
                    Description = "Line Filter Warning",
                    State = AlarmState.ACTIVE,
                    Priority = 3,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = false,
                    CorrectiveAction = "Schedule filter maintenance"
                };
                newAlarms.Add(alarm);
            }
        }

        // Suction filter kontrolü
        if (opcData.TryGetValue($"MOTOR_{motorId}_SUCTION_FILTER_EXECUTION", out var suctionFilterData) && suctionFilterData.Value is int suctionFilter)
        {
            if (suctionFilter == 0) // Error
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.HIGH,
                    Source = motorSource,
                    Description = "Suction Filter Error",
                    State = AlarmState.ACTIVE,
                    Priority = 2,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = true,
                    CorrectiveAction = "Replace or clean suction filter immediately"
                };
                newAlarms.Add(alarm);
            }
        }
    }

    private void CheckSystemAlarms(Dictionary<string, DataValue> opcData, DateTime currentTime, List<AlarmEntry> newAlarms)
    {
        // Emergency Stop kontrolü
        if (opcData.TryGetValue("SYSTEM_EMERGENCY_STOP_EXECUTION", out var emergencyStopData) && emergencyStopData.Value is bool emergencyStop && emergencyStop)
        {
            var alarm = new AlarmEntry
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = currentTime,
                Severity = AlarmSeverity.CRITICAL,
                Source = "SYSTEM",
                Description = "Emergency Stop Activated",
                State = AlarmState.ACTIVE,
                Priority = 1,
                Category = AlarmCategory.SAFETY,
                RequiresOperatorAction = true,
                CorrectiveAction = "Investigate emergency condition. Reset only when safe."
            };
            newAlarms.Add(alarm);
        }

        // Basınç alarmları
        if (opcData.TryGetValue("ALARM_HIGH_PRESSURE", out var highPressureData) && highPressureData.Value is bool highPressure && highPressure)
        {
            var alarm = new AlarmEntry
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = currentTime,
                Severity = AlarmSeverity.CRITICAL,
                Source = "SYSTEM",
                Description = "High System Pressure",
                State = AlarmState.ACTIVE,
                Priority = 1,
                Category = AlarmCategory.PROCESS,
                RequiresOperatorAction = true,
                CorrectiveAction = "Check pressure relief valves and system integrity"
            };
            newAlarms.Add(alarm);
        }

        if (opcData.TryGetValue("ALARM_LOW_PRESSURE", out var lowPressureData) && lowPressureData.Value is bool lowPressure && lowPressure)
        {
            var alarm = new AlarmEntry
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = currentTime,
                Severity = AlarmSeverity.HIGH,
                Source = "SYSTEM",
                Description = "Low System Pressure",
                State = AlarmState.ACTIVE,
                Priority = 2,
                Category = AlarmCategory.PROCESS,
                RequiresOperatorAction = true,
                CorrectiveAction = "Check pump operation and system leaks"
            };
            newAlarms.Add(alarm);
        }

        // Sıcaklık alarmları
        if (opcData.TryGetValue("ALARM_HIGH_TEMPERATURE", out var highTempData) && highTempData.Value is bool highTemp && highTemp)
        {
            var alarm = new AlarmEntry
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = currentTime,
                Severity = AlarmSeverity.HIGH,
                Source = "SYSTEM",
                Description = "High System Temperature",
                State = AlarmState.ACTIVE,
                Priority = 2,
                Category = AlarmCategory.PROCESS,
                RequiresOperatorAction = true,
                CorrectiveAction = "Check cooling system operation"
            };
            newAlarms.Add(alarm);
        }

        // Tank level alarmı
        if (opcData.TryGetValue("ALARM_LOW_TANK_LEVEL", out var lowTankData) && lowTankData.Value is bool lowTank && lowTank)
        {
            var alarm = new AlarmEntry
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = currentTime,
                Severity = AlarmSeverity.WARNING,
                Source = "SYSTEM",
                Description = "Low Tank Level",
                State = AlarmState.ACTIVE,
                Priority = 3,
                Category = AlarmCategory.PROCESS,
                RequiresOperatorAction = true,
                CorrectiveAction = "Refill hydraulic oil tank"
            };
            newAlarms.Add(alarm);
        }
    }

    private void CheckCoolingAlarms(Dictionary<string, DataValue> opcData, DateTime currentTime, List<AlarmEntry> newAlarms)
    {
        if (opcData.TryGetValue("COOLING_SYSTEM_STATUS_EXECUTION", out var coolingStatusData) && coolingStatusData.Value is int coolingStatus)
        {
            if (coolingStatus == 3) // Critical
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.CRITICAL,
                    Source = "COOLING",
                    Description = "Critical Cooling System Failure",
                    State = AlarmState.ACTIVE,
                    Priority = 1,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = true,
                    CorrectiveAction = "Stop system immediately. Check cooling pump and heat exchanger."
                };
                newAlarms.Add(alarm);
            }
            else if (coolingStatus == 2) // Warning
            {
                var alarm = new AlarmEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    Timestamp = currentTime,
                    Severity = AlarmSeverity.WARNING,
                    Source = "COOLING",
                    Description = "Cooling System Warning",
                    State = AlarmState.ACTIVE,
                    Priority = 3,
                    Category = AlarmCategory.EQUIPMENT,
                    RequiresOperatorAction = false,
                    CorrectiveAction = "Monitor cooling performance closely"
                };
                newAlarms.Add(alarm);
            }
        }
    }

    private void RemoveResolvedAlarms(Dictionary<string, DataValue> opcData, DateTime currentTime)
    {
        var resolvedAlarms = new List<AlarmEntry>();

        foreach (var alarm in _activeAlarms.ToList())
        {
            bool isResolved = false;

            // Alarm durumunu kontrol et
            if (alarm.Source.StartsWith("MOTOR_"))
            {
                isResolved = IsMotorAlarmResolved(alarm, opcData);
            }
            else if (alarm.Source == "SYSTEM")
            {
                isResolved = IsSystemAlarmResolved(alarm, opcData);
            }
            else if (alarm.Source == "COOLING")
            {
                isResolved = IsCoolingAlarmResolved(alarm, opcData);
            }

            if (isResolved)
            {
                alarm.State = AlarmState.RESOLVED;
                alarm.ResolvedTimestamp = currentTime;
                _activeAlarms.Remove(alarm);
                resolvedAlarms.Add(alarm);
                
                _logger.LogInformation("✅ Alarm resolved: {Source} - {Description}", alarm.Source, alarm.Description);
            }
        }

        // Resolved alarmları history'ye ekle
        _alarmHistory.AddRange(resolvedAlarms);
    }

    private bool IsMotorAlarmResolved(AlarmEntry alarm, Dictionary<string, DataValue> opcData)
    {
        // Motor alarm çözüm kontrolü
        if (alarm.Description.Contains("Motor Error State"))
        {
            var motorId = alarm.Source.Replace("MOTOR_", "");
            if (opcData.TryGetValue($"MOTOR_{motorId}_MOTOR_STATUS_EXECUTION", out var statusData) && statusData.Value is int status)
            {
                return status != 3; // Error durumundan çıkmış
            }
        }
        
        if (alarm.Description.Contains("Filter"))
        {
            var motorId = alarm.Source.Replace("MOTOR_", "");
            if (alarm.Description.Contains("Line Filter"))
            {
                if (opcData.TryGetValue($"MOTOR_{motorId}_LINE_FILTER_EXECUTION", out var filterData) && filterData.Value is int filter)
                {
                    return filter == 2; // OK durumu
                }
            }
            else if (alarm.Description.Contains("Suction Filter"))
            {
                if (opcData.TryGetValue($"MOTOR_{motorId}_SUCTION_FILTER_EXECUTION", out var filterData) && filterData.Value is int filter)
                {
                    return filter == 1; // OK durumu
                }
            }
        }

        return false;
    }

    private bool IsSystemAlarmResolved(AlarmEntry alarm, Dictionary<string, DataValue> opcData)
    {
        if (alarm.Description.Contains("Emergency Stop"))
        {
            if (opcData.TryGetValue("SYSTEM_EMERGENCY_STOP_EXECUTION", out var data) && data.Value is bool emergencyStop)
            {
                return !emergencyStop;
            }
        }
        
        if (alarm.Description.Contains("High System Pressure"))
        {
            if (opcData.TryGetValue("ALARM_HIGH_PRESSURE", out var data) && data.Value is bool highPressure)
            {
                return !highPressure;
            }
        }
        
        // Diğer sistem alarmları için benzer kontroller...
        
        return false;
    }

    private bool IsCoolingAlarmResolved(AlarmEntry alarm, Dictionary<string, DataValue> opcData)
    {
        if (opcData.TryGetValue("COOLING_SYSTEM_STATUS_EXECUTION", out var data) && data.Value is int status)
        {
            if (alarm.Description.Contains("Critical"))
            {
                return status != 3;
            }
            else if (alarm.Description.Contains("Warning"))
            {
                return status <= 1; // Normal veya offline
            }
        }
        
        return false;
    }

    public bool AcknowledgeAlarm(string alarmId)
    {
        lock (_alarmLock)
        {
            var alarm = _activeAlarms.FirstOrDefault(a => a.Id == alarmId);
            if (alarm != null && alarm.State == AlarmState.ACTIVE)
            {
                alarm.State = AlarmState.ACKNOWLEDGED;
                alarm.AcknowledgedTimestamp = DateTime.Now;
                _logger.LogInformation("Alarm acknowledged: {AlarmId} - {Description}", alarmId, alarm.Description);
                return true;
            }
        }
        return false;
    }

    public int GetActiveAlarmCount() => _activeAlarms.Count;
    public int GetCriticalAlarmCount() => _activeAlarms.Count(a => a.Severity == AlarmSeverity.CRITICAL);

    private static AlarmSeverity GetErrorCodeSeverity(int errorCode)
    {
        return errorCode switch
        {
            >= 100 => AlarmSeverity.CRITICAL,
            >= 50 => AlarmSeverity.HIGH,
            >= 10 => AlarmSeverity.WARNING,
            _ => AlarmSeverity.INFO
        };
    }

    private static int GetErrorCodePriority(int errorCode)
    {
        return errorCode switch
        {
            >= 100 => 1,
            >= 50 => 2,
            >= 10 => 3,
            _ => 4
        };
    }

    private static string GetErrorCodeAction(int errorCode)
    {
        return errorCode switch
        {
            >= 100 => "Immediate attention required. Stop motor and contact maintenance.",
            >= 50 => "Check motor parameters and operating conditions.",
            >= 10 => "Monitor closely and schedule maintenance check.",
            _ => "Normal operational warning. Continue monitoring."
        };
    }
}