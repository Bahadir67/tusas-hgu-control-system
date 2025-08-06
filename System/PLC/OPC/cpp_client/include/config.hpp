#pragma once

#include "common.hpp"

namespace tusas_hgu {

class Config {
private:
    json configData_;
    std::string configFilePath_;
    
public:
    explicit Config(const std::string& configFile = "config/config.json");
    
    // Load configuration from file
    bool load(const std::string& configFile);
    
    // Save configuration to file
    bool save(const std::string& configFile = "");
    
    // OPC UA Configuration
    std::string getOPCUAEndpoint() const {
        return configData_["opcua"]["endpoint"].get<std::string>();
    }
    
    int getOPCUANamespace() const {
        return configData_["opcua"]["namespace"].get<int>();
    }
    
    std::string getSecurityMode() const {
        return configData_["opcua"]["security_mode"].get<std::string>();
    }
    
    std::string getSecurityPolicy() const {
        return configData_["opcua"]["security_policy"].get<std::string>();
    }
    
    int getConnectionTimeout() const {
        return configData_["opcua"]["connection_timeout_ms"].get<int>();
    }
    
    int getSubscriptionInterval() const {
        return configData_["opcua"]["subscription_interval_ms"].get<int>();
    }
    
    bool getAutoReconnect() const {
        return configData_["opcua"]["auto_reconnect"].get<bool>();
    }
    
    int getReconnectDelay() const {
        return configData_["opcua"]["reconnect_delay_ms"].get<int>();
    }
    
    int getMaxReconnectAttempts() const {
        return configData_["opcua"]["max_reconnect_attempts"].get<int>();
    }
    
    // InfluxDB Configuration
    std::string getInfluxDBUrl() const {
        return configData_["influxdb"]["url"].get<std::string>();
    }
    
    std::string getInfluxDBToken() const {
        return configData_["influxdb"]["token"].get<std::string>();
    }
    
    std::string getInfluxDBOrg() const {
        return configData_["influxdb"]["organization"].get<std::string>();
    }
    
    std::string getInfluxDBBucket() const {
        return configData_["influxdb"]["bucket"].get<std::string>();
    }
    
    std::string getInfluxDBMeasurement() const {
        return configData_["influxdb"]["measurement"].get<std::string>();
    }
    
    int getBatchSize() const {
        return configData_["influxdb"]["batch_size"].get<int>();
    }
    
    int getFlushInterval() const {
        return configData_["influxdb"]["flush_interval_ms"].get<int>();
    }
    
    int getInfluxDBTimeout() const {
        return configData_["influxdb"]["connection_timeout_ms"].get<int>();
    }
    
    // Performance Configuration
    int getWorkerThreads() const {
        return configData_["performance"]["worker_threads"].get<int>();
    }
    
    int getDataBufferSize() const {
        return configData_["performance"]["data_buffer_size"].get<int>();
    }
    
    bool getEnableMetrics() const {
        return configData_["performance"]["enable_metrics"].get<bool>();
    }
    
    int getMetricsInterval() const {
        return configData_["performance"]["metrics_interval_ms"].get<int>();
    }
    
    // Logging Configuration
    std::string getLogLevel() const {
        return configData_["logging"]["level"].get<std::string>();
    }
    
    std::string getLogFilePath() const {
        return configData_["logging"]["file_path"].get<std::string>();
    }
    
    bool getLogToConsole() const {
        return configData_["logging"]["log_to_console"].get<bool>();
    }
    
    bool getLogToFile() const {
        return configData_["logging"]["log_to_file"].get<bool>();
    }
    
    int getMaxFileSize() const {
        return configData_["logging"]["max_file_size_mb"].get<int>();
    }
    
    // System Configuration
    std::string getSystemLocation() const {
        return configData_["system"]["location"].get<std::string>();
    }
    
    std::string getEquipmentId() const {
        return configData_["system"]["equipment_id"].get<std::string>();
    }
    
    std::string getSystemName() const {
        return configData_["system"]["system_name"].get<std::string>();
    }
    
    bool getEnableHeartbeat() const {
        return configData_["system"]["enable_heartbeat"].get<bool>();
    }
    
    int getHeartbeatInterval() const {
        return configData_["system"]["heartbeat_interval_ms"].get<int>();
    }
    
    // Sensor Configuration
    bool getEnableValidation() const {
        return configData_["sensors"]["enable_validation"].get<bool>();
    }
    
    std::string getDefaultQuality() const {
        return configData_["sensors"]["default_quality"].get<std::string>();
    }
    
    bool getOutlierDetection() const {
        return configData_["sensors"]["outlier_detection"].get<bool>();
    }
    
    double getOutlierThreshold() const {
        return configData_["sensors"]["outlier_threshold_percent"].get<double>();
    }
    
    // Utility methods
    int getScanInterval() const {
        return getSubscriptionInterval();
    }
    
    // Get raw JSON for advanced access
    const json& getRawConfig() const {
        return configData_;
    }
    
    // Update configuration values
    void setOPCUAEndpoint(const std::string& endpoint) {
        configData_["opcua"]["endpoint"] = endpoint;
    }
    
    void setInfluxDBToken(const std::string& token) {
        configData_["influxdb"]["token"] = token;
    }
    
    void setLogLevel(const std::string& level) {
        configData_["logging"]["level"] = level;
    }
    
    // Validation
    bool validate() const;
    std::vector<std::string> getValidationErrors() const;
    
    // Environment variable support
    void loadFromEnvironment();
    
private:
    // Apply default values for missing keys
    void applyDefaults();
    
    // Expand environment variables in strings
    std::string expandEnvironmentVariables(const std::string& str) const;
    
    // Validate individual sections
    bool validateOPCUA() const;
    bool validateInfluxDB() const;
    bool validatePerformance() const;
    bool validateLogging() const;
};

// Implementation
inline Config::Config(const std::string& configFile) : configFilePath_(configFile) {
    if (!load(configFile)) {
        throw std::runtime_error("Failed to load configuration from: " + configFile);
    }
}

inline bool Config::load(const std::string& configFile) {
    try {
        std::ifstream file(configFile);
        if (!file.is_open()) {
            std::cerr << "Cannot open config file: " << configFile << std::endl;
            return false;
        }
        
        file >> configData_;
        configFilePath_ = configFile;
        
        // Apply defaults for missing values
        applyDefaults();
        
        // Load environment variable overrides
        loadFromEnvironment();
        
        // Validate configuration
        if (!validate()) {
            auto errors = getValidationErrors();
            std::cerr << "Configuration validation failed:" << std::endl;
            for (const auto& error : errors) {
                std::cerr << "  - " << error << std::endl;
            }
            return false;
        }
        
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Error loading config: " << e.what() << std::endl;
        return false;
    }
}

inline bool Config::save(const std::string& configFile) {
    try {
        std::string fileName = configFile.empty() ? configFilePath_ : configFile;
        std::ofstream file(fileName);
        if (!file.is_open()) {
            return false;
        }
        
        file << std::setw(2) << configData_ << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Error saving config: " << e.what() << std::endl;
        return false;
    }
}

inline void Config::applyDefaults() {
    // OPC UA defaults
    if (!configData_.contains("opcua")) configData_["opcua"] = json::object();
    if (!configData_["opcua"].contains("endpoint")) 
        configData_["opcua"]["endpoint"] = "opc.tcp://192.168.100.10:4840";
    if (!configData_["opcua"].contains("namespace")) 
        configData_["opcua"]["namespace"] = 2;
    if (!configData_["opcua"].contains("security_mode")) 
        configData_["opcua"]["security_mode"] = "None";
    if (!configData_["opcua"].contains("connection_timeout_ms")) 
        configData_["opcua"]["connection_timeout_ms"] = 30000;
    if (!configData_["opcua"].contains("subscription_interval_ms")) 
        configData_["opcua"]["subscription_interval_ms"] = 1000;
    if (!configData_["opcua"].contains("auto_reconnect")) 
        configData_["opcua"]["auto_reconnect"] = true;
    if (!configData_["opcua"].contains("reconnect_delay_ms")) 
        configData_["opcua"]["reconnect_delay_ms"] = 5000;
    if (!configData_["opcua"].contains("max_reconnect_attempts")) 
        configData_["opcua"]["max_reconnect_attempts"] = 10;
    
    // InfluxDB defaults
    if (!configData_.contains("influxdb")) configData_["influxdb"] = json::object();
    if (!configData_["influxdb"].contains("url")) 
        configData_["influxdb"]["url"] = "http://localhost:8086";
    if (!configData_["influxdb"].contains("organization")) 
        configData_["influxdb"]["organization"] = "tusas";
    if (!configData_["influxdb"].contains("bucket")) 
        configData_["influxdb"]["bucket"] = "tusas_hgu";
    if (!configData_["influxdb"].contains("measurement")) 
        configData_["influxdb"]["measurement"] = "hgu_sensors";
    if (!configData_["influxdb"].contains("batch_size")) 
        configData_["influxdb"]["batch_size"] = 100;
    if (!configData_["influxdb"].contains("flush_interval_ms")) 
        configData_["influxdb"]["flush_interval_ms"] = 1000;
    
    // Performance defaults
    if (!configData_.contains("performance")) configData_["performance"] = json::object();
    if (!configData_["performance"].contains("worker_threads")) 
        configData_["performance"]["worker_threads"] = 4;
    if (!configData_["performance"].contains("data_buffer_size")) 
        configData_["performance"]["data_buffer_size"] = 1000;
    if (!configData_["performance"].contains("enable_metrics")) 
        configData_["performance"]["enable_metrics"] = true;
    
    // Logging defaults
    if (!configData_.contains("logging")) configData_["logging"] = json::object();
    if (!configData_["logging"].contains("level")) 
        configData_["logging"]["level"] = "INFO";
    if (!configData_["logging"].contains("file_path")) 
        configData_["logging"]["file_path"] = "logs/tusas_hgu_opcua.log";
    if (!configData_["logging"].contains("log_to_console")) 
        configData_["logging"]["log_to_console"] = true;
    if (!configData_["logging"].contains("log_to_file")) 
        configData_["logging"]["log_to_file"] = true;
}

inline void Config::loadFromEnvironment() {
    // Override with environment variables if present
    const char* endpoint = std::getenv("OPCUA_ENDPOINT");
    if (endpoint) configData_["opcua"]["endpoint"] = endpoint;
    
    const char* influxUrl = std::getenv("INFLUXDB_URL");
    if (influxUrl) configData_["influxdb"]["url"] = influxUrl;
    
    const char* influxToken = std::getenv("INFLUXDB_TOKEN");
    if (influxToken) configData_["influxdb"]["token"] = influxToken;
    
    const char* logLevel = std::getenv("LOG_LEVEL");
    if (logLevel) configData_["logging"]["level"] = logLevel;
}

inline bool Config::validate() const {
    return validateOPCUA() && validateInfluxDB() && validatePerformance() && validateLogging();
}

inline std::vector<std::string> Config::getValidationErrors() const {
    std::vector<std::string> errors;
    
    // Basic validation - could be expanded
    if (getOPCUAEndpoint().empty()) {
        errors.push_back("OPC UA endpoint cannot be empty");
    }
    
    if (getInfluxDBUrl().empty()) {
        errors.push_back("InfluxDB URL cannot be empty");
    }
    
    if (getBatchSize() <= 0 || getBatchSize() > 10000) {
        errors.push_back("Batch size must be between 1 and 10000");
    }
    
    if (getWorkerThreads() <= 0 || getWorkerThreads() > 32) {
        errors.push_back("Worker threads must be between 1 and 32");
    }
    
    return errors;
}

inline bool Config::validateOPCUA() const {
    return !getOPCUAEndpoint().empty() && getConnectionTimeout() > 0;
}

inline bool Config::validateInfluxDB() const {
    return !getInfluxDBUrl().empty() && getBatchSize() > 0;
}

inline bool Config::validatePerformance() const {
    return getWorkerThreads() > 0 && getDataBufferSize() > 0;
}

inline bool Config::validateLogging() const {
    return !getLogLevel().empty() && !getLogFilePath().empty();
}

} // namespace tusas_hgu