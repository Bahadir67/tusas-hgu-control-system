#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <queue>
#include <map>
#include <iostream>
#include <sstream>
#include <fstream>

// Platform-specific includes
#ifdef _WIN32
    #include <windows.h>
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
    #pragma comment(lib, "advapi32.lib")
#else
    #include <unistd.h>
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
#endif

// Third-party includes
#include <open62541/client.h>
#include <open62541/client_config_default.h>
#include <open62541/plugin/log_stdout.h>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// Additional C++ includes needed for implementations
#include <iomanip>
#include <algorithm>
#include <cstdio>
#include <ctime>
#include <cstdlib>

namespace tusas_hgu {

// Type aliases
using json = nlohmann::json;
using TimePoint = std::chrono::system_clock::time_point;
using Duration = std::chrono::milliseconds;

// Constants
constexpr size_t MAX_BUFFER_SIZE = 10000;
constexpr size_t DEFAULT_BATCH_SIZE = 100;
constexpr int DEFAULT_THREAD_COUNT = 4;
constexpr int DEFAULT_SCAN_INTERVAL_MS = 1000;
constexpr int DEFAULT_RECONNECT_DELAY_MS = 5000;
constexpr int MAX_RECONNECT_ATTEMPTS = 10;

// Forward declarations
class OPCUAClient;
class DataManager;
class InfluxDBWriter;
class Config;
class Logger;

// Sensor data structure
struct SensorData {
    std::string id;
    std::string name;
    double value;
    std::string unit;
    std::string quality;
    TimePoint timestamp;
    
    SensorData() : value(0.0), timestamp(std::chrono::system_clock::now()) {}
    
    SensorData(const std::string& sensor_id, const std::string& sensor_name, 
               double sensor_value, const std::string& sensor_unit = "",
               const std::string& sensor_quality = "good")
        : id(sensor_id), name(sensor_name), value(sensor_value), 
          unit(sensor_unit), quality(sensor_quality), 
          timestamp(std::chrono::system_clock::now()) {}
};

// OPC UA node information
struct NodeInfo {
    std::string id;
    std::string name;
    UA_NodeId nodeId;
    std::string dataType;
    bool isSubscribed;
    
    NodeInfo() : isSubscribed(false) {}
    
    NodeInfo(const std::string& node_id, const std::string& node_name, 
             const UA_NodeId& node_id_ua, const std::string& data_type = "")
        : id(node_id), name(node_name), nodeId(node_id_ua), 
          dataType(data_type), isSubscribed(false) {}
};

// Application state
enum class AppState {
    STOPPED,
    STARTING,
    RUNNING,
    STOPPING,
    ERROR
};

// Error codes
enum class ErrorCode {
    SUCCESS = 0,
    CONFIG_ERROR = 1,
    OPCUA_CONNECTION_ERROR = 2,
    INFLUXDB_CONNECTION_ERROR = 3,
    SUBSCRIPTION_ERROR = 4,
    DATA_WRITE_ERROR = 5,
    GENERIC_ERROR = 99
};

// Utility functions
inline std::string getCurrentTimeString() {
    auto now = std::chrono::system_clock::now();
    std::time_t time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
    
    std::stringstream ss;
    char buffer[100];
    std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", std::localtime(&time_t));
    ss << buffer;
    ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
    return ss.str();
}

inline uint64_t getCurrentTimestamp() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

inline std::string escapeString(const std::string& str) {
    std::string result;
    result.reserve(str.size() + 10);
    
    for (char c : str) {
        switch (c) {
            case '"':  result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:   result += c; break;
        }
    }
    return result;
}

inline void sleepMs(int milliseconds) {
    std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
}

// Thread-safe counter
class ThreadSafeCounter {
private:
    std::atomic<uint64_t> counter_;
    
public:
    ThreadSafeCounter() : counter_(0) {}
    
    uint64_t increment() {
        return ++counter_;
    }
    
    uint64_t get() const {
        return counter_.load();
    }
    
    void reset() {
        counter_.store(0);
    }
};

// Performance metrics
struct PerformanceMetrics {
    ThreadSafeCounter totalSamples;
    ThreadSafeCounter successfulWrites;
    ThreadSafeCounter failedWrites;
    ThreadSafeCounter reconnects;
    std::atomic<double> avgLatency;
    std::atomic<uint64_t> lastUpdateTime;
    
    PerformanceMetrics() : avgLatency(0.0), lastUpdateTime(0) {}
    
    void updateLatency(double latency) {
        avgLatency.store(latency);
        lastUpdateTime.store(getCurrentTimestamp());
    }
    
    json toJson() const {
        return json{
            {"total_samples", totalSamples.get()},
            {"successful_writes", successfulWrites.get()},
            {"failed_writes", failedWrites.get()},
            {"reconnects", reconnects.get()},
            {"avg_latency_ms", avgLatency.load()},
            {"last_update", lastUpdateTime.load()}
        };
    }
};

} // namespace tusas_hgu