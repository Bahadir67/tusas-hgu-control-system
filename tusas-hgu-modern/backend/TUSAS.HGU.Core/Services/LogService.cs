using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data.SQLite;
using System.Text.Json;

namespace TUSAS.HGU.Core.Services
{
    public enum LogCategory
    {
        AUTH,           // Authentication events
        USER_MGMT,      // User management (add, remove, modify users)
        CALIBRATION,    // Calibration operations
        SYSTEM,         // System start/stop, configuration changes
        MAINTENANCE,    // Maintenance operations
        ALARM,          // Alarm acknowledgements, resets
        CONFIG,         // Configuration changes
        AUDIT,          // Audit trail events
        OPC,            // OPC variable changes
        BACKUP,         // Backup/restore operations
        SECURITY        // Security events
    }

    public enum LogResult
    {
        SUCCESS,
        ERROR,
        WARNING,
        INFO
    }

    public class SystemLog
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; }
        public int? UserId { get; set; }
        public string Username { get; set; }
        public string Category { get; set; }
        public string Action { get; set; }
        public string Target { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
        public string Result { get; set; }
        public string ErrorMessage { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
        public int? Duration { get; set; }
        public string Details { get; set; }
    }

    public class LogFilter
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Username { get; set; }
        public LogCategory? Category { get; set; }
        public string Action { get; set; }
        public LogResult? Result { get; set; }
        public string SearchTerm { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public interface ILogService
    {
        Task LogAsync(string username, LogCategory category, string action, 
            string target = null, string oldValue = null, string newValue = null, 
            LogResult result = LogResult.SUCCESS, string errorMessage = null,
            string ipAddress = null, string userAgent = null, int? duration = null,
            Dictionary<string, object> details = null);
        
        Task<List<SystemLog>> GetLogsAsync(LogFilter filter);
        Task<int> GetLogCountAsync(LogFilter filter);
        Task<bool> DeleteLogsAsync(DateTime? beforeDate = null);
        Task<bool> ExportLogsAsync(string filePath, LogFilter filter);
    }

    public class LogService : ILogService
    {
        private readonly string _connectionString;

        public LogService(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task LogAsync(string username, LogCategory category, string action,
            string target = null, string oldValue = null, string newValue = null,
            LogResult result = LogResult.SUCCESS, string errorMessage = null,
            string ipAddress = null, string userAgent = null, int? duration = null,
            Dictionary<string, object> details = null)
        {
            try
            {
                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                var detailsJson = details != null ? JsonSerializer.Serialize(details) : null;

                var query = @"
                    INSERT INTO SystemLogs (
                        Username, Category, Action, Target, OldValue, NewValue, 
                        Result, ErrorMessage, IpAddress, UserAgent, Duration, Details
                    ) VALUES (
                        @Username, @Category, @Action, @Target, @OldValue, @NewValue,
                        @Result, @ErrorMessage, @IpAddress, @UserAgent, @Duration, @Details
                    )";

                using var command = new SQLiteCommand(query, connection);
                command.Parameters.AddWithValue("@Username", username);
                command.Parameters.AddWithValue("@Category", category.ToString());
                command.Parameters.AddWithValue("@Action", action);
                command.Parameters.AddWithValue("@Target", target ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@OldValue", oldValue ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@NewValue", newValue ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@Result", result.ToString());
                command.Parameters.AddWithValue("@ErrorMessage", errorMessage ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@IpAddress", ipAddress ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@UserAgent", userAgent ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@Duration", duration ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@Details", detailsJson ?? (object)DBNull.Value);

                await command.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error logging to database: {ex.Message}");
                // Don't throw - logging should not break the application
            }
        }

        public async Task<List<SystemLog>> GetLogsAsync(LogFilter filter)
        {
            try
            {
                var logs = new List<SystemLog>();

                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                var query = BuildFilterQuery(filter, false);
                using var command = new SQLiteCommand(query, connection);
                AddFilterParameters(command, filter);

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    logs.Add(MapToSystemLog((SQLiteDataReader)reader));
                }

                return logs;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"🚨 Error in GetLogsAsync: {ex.Message}");
                Console.WriteLine($"📊 Filter details: Page={filter.Page}, PageSize={filter.PageSize}");
                return new List<SystemLog>(); // Boş liste döndür
            }
        }

        public async Task<int> GetLogCountAsync(LogFilter filter)
        {
            try
            {
                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                var query = BuildFilterQuery(filter, true);
                using var command = new SQLiteCommand(query, connection);
                AddFilterParameters(command, filter);

                var result = await command.ExecuteScalarAsync();
                return Convert.ToInt32(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"🚨 Error in GetLogCountAsync: {ex.Message}");
                return 0; // Güvenli varsayılan değer
            }
        }

        public async Task<bool> DeleteLogsAsync(DateTime? beforeDate = null)
        {
            try
            {
                using var connection = new SQLiteConnection(_connectionString);
                await connection.OpenAsync();

                var query = beforeDate.HasValue
                    ? "DELETE FROM SystemLogs WHERE Timestamp < @BeforeDate"
                    : "DELETE FROM SystemLogs";

                using var command = new SQLiteCommand(query, connection);
                if (beforeDate.HasValue)
                {
                    command.Parameters.AddWithValue("@BeforeDate", beforeDate.Value);
                }

                await command.ExecuteNonQueryAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ExportLogsAsync(string filePath, LogFilter filter)
        {
            try
            {
                var logs = await GetLogsAsync(filter);
                var csv = new System.Text.StringBuilder();
                
                // Header
                csv.AppendLine("Timestamp,Username,Category,Action,Target,OldValue,NewValue,Result,ErrorMessage,Duration");
                
                // Data
                foreach (var log in logs)
                {
                    csv.AppendLine($"{log.Timestamp:yyyy-MM-dd HH:mm:ss},{log.Username},{log.Category}," +
                                 $"{log.Action},{log.Target},{log.OldValue},{log.NewValue}," +
                                 $"{log.Result},{log.ErrorMessage},{log.Duration}");
                }

                await System.IO.File.WriteAllTextAsync(filePath, csv.ToString());
                return true;
            }
            catch
            {
                return false;
            }
        }

        private string BuildFilterQuery(LogFilter filter, bool countOnly)
        {
            var query = countOnly 
                ? "SELECT COUNT(*) FROM SystemLogs WHERE 1=1"
                : "SELECT * FROM SystemLogs WHERE 1=1";

            if (filter.StartDate.HasValue)
                query += " AND Timestamp >= @StartDate";
            if (filter.EndDate.HasValue)
                query += " AND Timestamp <= @EndDate";
            if (!string.IsNullOrEmpty(filter.Username))
                query += " AND Username = @Username";
            if (filter.Category.HasValue)
                query += " AND Category = @Category";
            if (!string.IsNullOrEmpty(filter.Action))
                query += " AND Action LIKE @Action";
            if (filter.Result.HasValue)
                query += " AND Result = @Result";
            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                query += @" AND (Action LIKE @SearchTerm 
                          OR Target LIKE @SearchTerm 
                          OR OldValue LIKE @SearchTerm 
                          OR NewValue LIKE @SearchTerm 
                          OR Details LIKE @SearchTerm)";
            }

            if (!countOnly)
            {
                query += " ORDER BY Timestamp DESC";
                
                // Güvenlik kontrolü: OFFSET çok büyük olmamalı
                var offset = (filter.Page - 1) * filter.PageSize;
                if (offset < 0) offset = 0;
                if (offset > 100000) offset = 0; // Maksimum 100K kayıt limit
                
                query += $" LIMIT {filter.PageSize} OFFSET {offset}";
            }

            return query;
        }

        private void AddFilterParameters(SQLiteCommand command, LogFilter filter)
        {
            if (filter.StartDate.HasValue)
                command.Parameters.AddWithValue("@StartDate", filter.StartDate.Value);
            if (filter.EndDate.HasValue)
                command.Parameters.AddWithValue("@EndDate", filter.EndDate.Value);
            if (!string.IsNullOrEmpty(filter.Username))
                command.Parameters.AddWithValue("@Username", filter.Username);
            if (filter.Category.HasValue)
                command.Parameters.AddWithValue("@Category", filter.Category.Value.ToString());
            if (!string.IsNullOrEmpty(filter.Action))
                command.Parameters.AddWithValue("@Action", $"%{filter.Action}%");
            if (filter.Result.HasValue)
                command.Parameters.AddWithValue("@Result", filter.Result.Value.ToString());
            if (!string.IsNullOrEmpty(filter.SearchTerm))
                command.Parameters.AddWithValue("@SearchTerm", $"%{filter.SearchTerm}%");
        }

        private SystemLog MapToSystemLog(SQLiteDataReader reader)
        {
            return new SystemLog
            {
                Id = reader.GetInt32(reader.GetOrdinal("Id")),
                Timestamp = reader.GetDateTime(reader.GetOrdinal("Timestamp")),
                UserId = reader.IsDBNull(reader.GetOrdinal("UserId")) ? null : reader.GetInt32(reader.GetOrdinal("UserId")),
                Username = reader.GetString(reader.GetOrdinal("Username")),
                Category = reader.GetString(reader.GetOrdinal("Category")),
                Action = reader.GetString(reader.GetOrdinal("Action")),
                Target = reader.IsDBNull(reader.GetOrdinal("Target")) ? null : reader.GetString(reader.GetOrdinal("Target")),
                OldValue = reader.IsDBNull(reader.GetOrdinal("OldValue")) ? null : reader.GetString(reader.GetOrdinal("OldValue")),
                NewValue = reader.IsDBNull(reader.GetOrdinal("NewValue")) ? null : reader.GetString(reader.GetOrdinal("NewValue")),
                Result = reader.GetString(reader.GetOrdinal("Result")),
                ErrorMessage = reader.IsDBNull(reader.GetOrdinal("ErrorMessage")) ? null : reader.GetString(reader.GetOrdinal("ErrorMessage")),
                IpAddress = reader.IsDBNull(reader.GetOrdinal("IpAddress")) ? null : reader.GetString(reader.GetOrdinal("IpAddress")),
                UserAgent = reader.IsDBNull(reader.GetOrdinal("UserAgent")) ? null : reader.GetString(reader.GetOrdinal("UserAgent")),
                Duration = reader.IsDBNull(reader.GetOrdinal("Duration")) ? null : reader.GetInt32(reader.GetOrdinal("Duration")),
                Details = reader.IsDBNull(reader.GetOrdinal("Details")) ? null : reader.GetString(reader.GetOrdinal("Details"))
            };
        }
    }
}