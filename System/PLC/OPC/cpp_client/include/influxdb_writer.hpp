#pragma once

#include "common.hpp"
#include "config.hpp"

namespace tusas_hgu {

// HTTP response structure
struct HTTPResponse {
    long statusCode;
    std::string body;
    bool success;
    
    HTTPResponse() : statusCode(0), success(false) {}
};

// InfluxDB Line Protocol writer
class InfluxDBWriter {
private:
    const Config& config_;
    CURL* curl_;
    std::string baseUrl_;
    std::string authHeader_;
    bool connected_;
    
    // Connection settings
    long connectTimeout_;
    long requestTimeout_;
    
    // Retry logic
    int maxRetries_;
    int retryDelay_;
    
    // Statistics
    std::atomic<uint64_t> totalWrites_;
    std::atomic<uint64_t> successfulWrites_;
    std::atomic<uint64_t> failedWrites_;
    
public:
    explicit InfluxDBWriter(const Config& config);
    ~InfluxDBWriter();
    
    // Lifecycle
    bool initialize();
    bool connect();
    void disconnect();
    
    // Write operations
    bool writeSingle(const SensorData& data);
    bool writeBatch(const std::vector<SensorData>& data);
    
    // Health check
    bool ping();
    bool isConnected() const { return connected_; }
    
    // Statistics
    uint64_t getTotalWrites() const { return totalWrites_.load(); }
    uint64_t getSuccessfulWrites() const { return successfulWrites_.load(); }
    uint64_t getFailedWrites() const { return failedWrites_.load(); }
    double getSuccessRate() const;
    
private:
    // Line Protocol generation
    std::string generateLineProtocol(const SensorData& data) const;
    std::string generateBatchLineProtocol(const std::vector<SensorData>& data) const;
    
    // HTTP operations
    HTTPResponse httpPost(const std::string& url, const std::string& data);
    HTTPResponse httpGet(const std::string& url);
    
    // URL building
    std::string buildWriteUrl() const;
    std::string buildPingUrl() const;
    
    // Utility
    std::string escapeTagValue(const std::string& value) const;
    std::string escapeFieldValue(const std::string& value) const;
    std::string formatTimestamp(const TimePoint& timestamp) const;
    
    // CURL setup
    void setupCurl();
    void configureCurlOptions();
    
    // Error handling
    void logCurlError(CURLcode code, const std::string& operation) const;
    bool shouldRetry(long statusCode) const;
    
    // Callbacks for CURL
    static size_t writeCallback(void* contents, size_t size, size_t nmemb, std::string* response);
};

// Implementation
inline InfluxDBWriter::InfluxDBWriter(const Config& config) 
    : config_(config), curl_(nullptr), connected_(false),
      connectTimeout_(config.getInfluxDBTimeout()), 
      requestTimeout_(10000),
      maxRetries_(3), retryDelay_(1000),
      totalWrites_(0), successfulWrites_(0), failedWrites_(0) {
}

inline InfluxDBWriter::~InfluxDBWriter() {
    disconnect();
}

inline bool InfluxDBWriter::initialize() {
    Logger::info("Initializing InfluxDB writer...");
    
    try {
        // Initialize CURL globally
        curl_global_init(CURL_GLOBAL_DEFAULT);
        
        // Create CURL handle
        curl_ = curl_easy_init();
        if (!curl_) {
            Logger::error("Failed to initialize CURL");
            return false;
        }
        
        // Build base URL and auth header
        baseUrl_ = config_.getInfluxDBUrl();
        if (baseUrl_.back() == '/') {
            baseUrl_.pop_back(); // Remove trailing slash
        }
        
        std::string token = config_.getInfluxDBToken();
        if (!token.empty()) {
            authHeader_ = "Authorization: Token " + token;
        }
        
        // Configure CURL options
        configureCurlOptions();
        
        Logger::info("InfluxDB writer initialized for URL: {}", baseUrl_);
        return true;
        
    } catch (const std::exception& e) {
        Logger::error("Failed to initialize InfluxDB writer: {}", e.what());
        return false;
    }
}

inline bool InfluxDBWriter::connect() {
    if (connected_) {
        return true;
    }
    
    Logger::info("Connecting to InfluxDB...");
    
    // Test connection with ping
    if (ping()) {
        connected_ = true;
        Logger::info("Successfully connected to InfluxDB");
        return true;
    } else {
        Logger::error("Failed to connect to InfluxDB");
        return false;
    }
}

inline void InfluxDBWriter::disconnect() {
    if (curl_) {
        curl_easy_cleanup(curl_);
        curl_ = nullptr;
    }
    
    curl_global_cleanup();
    connected_ = false;
    
    Logger::info("Disconnected from InfluxDB");
}

inline bool InfluxDBWriter::writeSingle(const SensorData& data) {
    if (!connected_) {
        Logger::warn("Not connected to InfluxDB");
        return false;
    }
    
    std::string lineProtocol = generateLineProtocol(data);
    std::string url = buildWriteUrl();
    
    totalWrites_.fetch_add(1);
    
    int retries = 0;
    while (retries <= maxRetries_) {
        HTTPResponse response = httpPost(url, lineProtocol);
        
        if (response.success && response.statusCode == 204) {
            successfulWrites_.fetch_add(1);
            Logger::debug("Successfully wrote sensor data: {}", data.id);
            return true;
        }
        
        if (!shouldRetry(response.statusCode)) {
            break;
        }
        
        retries++;
        if (retries <= maxRetries_) {
            Logger::debug("Retrying write for sensor {} (attempt {})", data.id, retries);
            sleepMs(retryDelay_ * retries); // Exponential backoff
        }
    }
    
    failedWrites_.fetch_add(1);
    Logger::warn("Failed to write sensor data after {} retries: {}", maxRetries_, data.id);
    return false;
}

inline bool InfluxDBWriter::writeBatch(const std::vector<SensorData>& data) {
    if (!connected_ || data.empty()) {
        return false;
    }
    
    std::string lineProtocol = generateBatchLineProtocol(data);
    std::string url = buildWriteUrl();
    
    totalWrites_.fetch_add(1);
    
    int retries = 0;
    while (retries <= maxRetries_) {
        HTTPResponse response = httpPost(url, lineProtocol);
        
        if (response.success && response.statusCode == 204) {
            successfulWrites_.fetch_add(1);
            Logger::debug("Successfully wrote batch of {} samples", data.size());
            return true;
        }
        
        if (!shouldRetry(response.statusCode)) {
            Logger::error("InfluxDB write failed with status {}: {}", 
                         response.statusCode, response.body);
            break;
        }
        
        retries++;
        if (retries <= maxRetries_) {
            Logger::debug("Retrying batch write (attempt {})", retries);
            sleepMs(retryDelay_ * retries);
        }
    }
    
    failedWrites_.fetch_add(1);
    Logger::warn("Failed to write batch after {} retries", maxRetries_);
    return false;
}

inline bool InfluxDBWriter::ping() {
    if (!curl_) {
        return false;
    }
    
    std::string url = buildPingUrl();
    HTTPResponse response = httpGet(url);
    
    return response.success && response.statusCode == 200;
}

inline double InfluxDBWriter::getSuccessRate() const {
    uint64_t total = totalWrites_.load();
    if (total == 0) {
        return 0.0;
    }
    
    return (double)successfulWrites_.load() / total * 100.0;
}

inline std::string InfluxDBWriter::generateLineProtocol(const SensorData& data) const {
    std::ostringstream ss;
    
    // Measurement name
    ss << config_.getInfluxDBMeasurement();
    
    // Tags
    ss << ",sensor_id=" << escapeTagValue(data.id);
    ss << ",sensor_name=" << escapeTagValue(data.name);
    ss << ",location=" << escapeTagValue(config_.getSystemLocation());
    ss << ",equipment=" << escapeTagValue(config_.getEquipmentId());
    
    if (!data.unit.empty()) {
        ss << ",unit=" << escapeTagValue(data.unit);
    }
    
    // Fields
    ss << " ";
    ss << "value=" << std::fixed << std::setprecision(6) << data.value;
    ss << ",quality=\"" << escapeFieldValue(data.quality) << "\"";
    
    // Timestamp (nanoseconds)
    ss << " " << formatTimestamp(data.timestamp);
    
    return ss.str();
}

inline std::string InfluxDBWriter::generateBatchLineProtocol(const std::vector<SensorData>& data) const {
    std::ostringstream ss;
    
    for (size_t i = 0; i < data.size(); ++i) {
        if (i > 0) {
            ss << "\n";
        }
        ss << generateLineProtocol(data[i]);
    }
    
    return ss.str();
}

inline HTTPResponse InfluxDBWriter::httpPost(const std::string& url, const std::string& data) {
    HTTPResponse response;
    
    if (!curl_) {
        return response;
    }
    
    // Set URL
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl_, CURLOPT_POSTFIELDSIZE, data.length());
    
    // Set headers
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: text/plain; charset=utf-8");
    if (!authHeader_.empty()) {
        headers = curl_slist_append(headers, authHeader_.c_str());
    }
    curl_easy_setopt(curl_, CURLOPT_HTTPHEADER, headers);
    
    // Perform request
    CURLcode res = curl_easy_perform(curl_);
    
    // Get response code
    curl_easy_getinfo(curl_, CURLINFO_RESPONSE_CODE, &response.statusCode);
    
    response.success = (res == CURLE_OK);
    if (!response.success) {
        logCurlError(res, "POST");
    }
    
    // Cleanup
    curl_slist_free_all(headers);
    
    return response;
}

inline HTTPResponse InfluxDBWriter::httpGet(const std::string& url) {
    HTTPResponse response;
    
    if (!curl_) {
        return response;
    }
    
    // Set URL and method
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_, CURLOPT_HTTPGET, 1L);
    
    // Set auth header if available
    struct curl_slist* headers = nullptr;
    if (!authHeader_.empty()) {
        headers = curl_slist_append(headers, authHeader_.c_str());
        curl_easy_setopt(curl_, CURLOPT_HTTPHEADER, headers);
    }
    
    // Perform request
    CURLcode res = curl_easy_perform(curl_);
    
    // Get response code
    curl_easy_getinfo(curl_, CURLINFO_RESPONSE_CODE, &response.statusCode);
    
    response.success = (res == CURLE_OK);
    if (!response.success) {
        logCurlError(res, "GET");
    }
    
    // Cleanup
    if (headers) {
        curl_slist_free_all(headers);
    }
    
    return response;
}

inline std::string InfluxDBWriter::buildWriteUrl() const {
    std::ostringstream ss;
    ss << baseUrl_ << "/api/v2/write";
    ss << "?org=" << config_.getInfluxDBOrg();
    ss << "&bucket=" << config_.getInfluxDBBucket();
    ss << "&precision=ms";
    return ss.str();
}

inline std::string InfluxDBWriter::buildPingUrl() const {
    return baseUrl_ + "/ping";
}

inline std::string InfluxDBWriter::escapeTagValue(const std::string& value) const {
    std::string result;
    result.reserve(value.size() + 10);
    
    for (char c : value) {
        switch (c) {
            case ' ':
            case ',':
            case '=':
            case '\\':
                result += '\\';
                result += c;
                break;
            default:
                result += c;
                break;
        }
    }
    
    return result;
}

inline std::string InfluxDBWriter::escapeFieldValue(const std::string& value) const {
    std::string result;
    result.reserve(value.size() + 10);
    
    for (char c : value) {
        switch (c) {
            case '"':
            case '\\':
                result += '\\';
                result += c;
                break;
            default:
                result += c;
                break;
        }
    }
    
    return result;
}

inline std::string InfluxDBWriter::formatTimestamp(const TimePoint& timestamp) const {
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        timestamp.time_since_epoch());
    return std::to_string(ms.count());
}

inline void InfluxDBWriter::configureCurlOptions() {
    if (!curl_) return;
    
    // Timeouts
    curl_easy_setopt(curl_, CURLOPT_CONNECTTIMEOUT_MS, connectTimeout_);
    curl_easy_setopt(curl_, CURLOPT_TIMEOUT_MS, requestTimeout_);
    
    // Response handling
    curl_easy_setopt(curl_, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl_, CURLOPT_WRITEDATA, &HTTPResponse().body);
    
    // SSL/TLS
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYPEER, 0L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYHOST, 0L);
    
    // User agent
    curl_easy_setopt(curl_, CURLOPT_USERAGENT, "TUSAS-HGU-OPC-Client/1.0");
    
    // Follow redirects
    curl_easy_setopt(curl_, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl_, CURLOPT_MAXREDIRS, 3L);
    
    // Compression
    curl_easy_setopt(curl_, CURLOPT_ACCEPT_ENCODING, "gzip, deflate");
}

inline void InfluxDBWriter::logCurlError(CURLcode code, const std::string& operation) const {
    Logger::error("CURL {} error: {} ({})", operation, curl_easy_strerror(code), (int)code);
}

inline bool InfluxDBWriter::shouldRetry(long statusCode) const {
    // Retry on temporary errors
    return statusCode == 429 ||  // Too Many Requests
           statusCode == 502 ||  // Bad Gateway
           statusCode == 503 ||  // Service Unavailable
           statusCode == 504 ||  // Gateway Timeout
           statusCode == 0;      // Network error
}

inline size_t InfluxDBWriter::writeCallback(void* contents, size_t size, size_t nmemb, std::string* response) {
    size_t totalSize = size * nmemb;
    if (response) {
        response->append((char*)contents, totalSize);
    }
    return totalSize;
}

} // namespace tusas_hgu