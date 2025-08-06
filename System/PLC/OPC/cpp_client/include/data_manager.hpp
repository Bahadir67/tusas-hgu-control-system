#pragma once

#include "common.hpp"
#include "config.hpp"

namespace tusas_hgu {

// Forward declaration
class InfluxDBWriter;

// Thread-safe data manager for sensor data
class DataManager {
private:
    const Config& config_;
    std::atomic<bool> running_;
    
    // Data storage
    std::queue<SensorData> dataQueue_;
    std::mutex queueMutex_;
    std::condition_variable queueCondition_;
    
    // Worker threads
    std::vector<std::thread> workerThreads_;
    
    // Data writer interface
    InfluxDBWriter* dataWriter_;
    
    // Performance metrics
    PerformanceMetrics metrics_;
    
    // Data validation
    std::map<std::string, SensorData> lastValues_;
    std::mutex lastValuesMutex_;
    
    // Batch processing
    std::vector<SensorData> currentBatch_;
    std::mutex batchMutex_;
    TimePoint lastFlush_;
    
public:
    explicit DataManager(const Config& config);
    ~DataManager();
    
    // Lifecycle
    bool initialize();
    void shutdown();
    
    // Data operations
    void addSensorData(const SensorData& data);
    void addSensorData(const std::vector<SensorData>& dataList);
    
    // Writer interface
    void setDataWriter(InfluxDBWriter* writer);
    
    // Statistics
    const PerformanceMetrics& getMetrics() const { return metrics_; }
    size_t getQueueSize() const;
    bool isHealthy() const;
    
    // Configuration
    void updateBatchSize(int newSize);
    void updateFlushInterval(int intervalMs);
    
private:
    // Worker thread function
    void workerThread();
    
    // Data processing
    bool validateSensorData(const SensorData& data);
    bool detectOutlier(const SensorData& data);
    void updateLastValue(const SensorData& data);
    
    // Batch operations
    void addToBatch(const SensorData& data);
    void flushBatch();
    bool shouldFlush() const;
    
    // Performance monitoring
    void updateMetrics(bool success);
    void calculateLatency(const TimePoint& startTime);
};

// Implementation
inline DataManager::DataManager(const Config& config) 
    : config_(config), running_(false), dataWriter_(nullptr) {
    lastFlush_ = std::chrono::system_clock::now();
    currentBatch_.reserve(config_.getBatchSize());
}

inline DataManager::~DataManager() {
    shutdown();
}

inline bool DataManager::initialize() {
    if (running_.load()) {
        return true; // Already initialized
    }
    
    Logger::info("Initializing data manager...");
    
    try {
        // Start worker threads
        int threadCount = config_.getWorkerThreads();
        workerThreads_.reserve(threadCount);
        
        running_ = true;
        
        for (int i = 0; i < threadCount; ++i) {
            workerThreads_.emplace_back(&DataManager::workerThread, this);
            Logger::debug("Started worker thread {}", i + 1);
        }
        
        Logger::info("Data manager initialized with {} worker threads", threadCount);
        return true;
        
    } catch (const std::exception& e) {
        Logger::error("Failed to initialize data manager: {}", e.what());
        return false;
    }
}

inline void DataManager::shutdown() {
    if (!running_.load()) {
        return; // Already shutdown
    }
    
    Logger::info("Shutting down data manager...");
    
    running_ = false;
    
    // Wake up all worker threads
    queueCondition_.notify_all();
    
    // Wait for all threads to finish
    for (auto& thread : workerThreads_) {
        if (thread.joinable()) {
            thread.join();
        }
    }
    
    workerThreads_.clear();
    
    // Flush remaining data
    std::lock_guard<std::mutex> lock(batchMutex_);
    if (!currentBatch_.empty()) {
        flushBatch();
    }
    
    Logger::info("Data manager shutdown completed");
}

inline void DataManager::addSensorData(const SensorData& data) {
    if (!running_.load()) {
        return;
    }
    
    // Validate data
    if (!validateSensorData(data)) {
        Logger::warn("Invalid sensor data rejected: {}", data.id);
        metrics_.failedWrites.increment();
        return;
    }
    
    // Add to queue
    {
        std::lock_guard<std::mutex> lock(queueMutex_);
        dataQueue_.push(data);
    }
    
    // Notify worker threads
    queueCondition_.notify_one();
    
    metrics_.totalSamples.increment();
}

inline void DataManager::addSensorData(const std::vector<SensorData>& dataList) {
    if (!running_.load() || dataList.empty()) {
        return;
    }
    
    // Batch add for better performance
    {
        std::lock_guard<std::mutex> lock(queueMutex_);
        for (const auto& data : dataList) {
            if (validateSensorData(data)) {
                dataQueue_.push(data);
                metrics_.totalSamples.increment();
            } else {
                metrics_.failedWrites.increment();
            }
        }
    }
    
    // Notify worker threads
    queueCondition_.notify_all();
}

inline void DataManager::setDataWriter(InfluxDBWriter* writer) {
    dataWriter_ = writer;
}

inline size_t DataManager::getQueueSize() const {
    std::lock_guard<std::mutex> lock(queueMutex_);
    return dataQueue_.size();
}

inline bool DataManager::isHealthy() const {
    // Consider healthy if:
    // 1. Running
    // 2. Queue not overflowing
    // 3. Recent successful writes
    
    if (!running_.load()) {
        return false;
    }
    
    size_t queueSize = getQueueSize();
    if (queueSize > config_.getDataBufferSize() * 0.8) {
        return false; // Queue nearly full
    }
    
    auto now = getCurrentTimestamp();
    auto lastUpdate = metrics_.lastUpdateTime.load();
    if (now - lastUpdate > 60000) { // No updates in 60 seconds
        return false;
    }
    
    return true;
}

inline void DataManager::updateBatchSize(int newSize) {
    std::lock_guard<std::mutex> lock(batchMutex_);
    currentBatch_.reserve(newSize);
    Logger::info("Batch size updated to {}", newSize);
}

inline void DataManager::updateFlushInterval(int intervalMs) {
    Logger::info("Flush interval updated to {}ms", intervalMs);
    // Note: This would require updating the config, 
    // or storing the interval separately
}

inline void DataManager::workerThread() {
    Logger::debug("Worker thread started");
    
    while (running_.load()) {
        try {
            SensorData data;
            
            // Wait for data or timeout
            {
                std::unique_lock<std::mutex> lock(queueMutex_);
                
                if (queueCondition_.wait_for(lock, std::chrono::milliseconds(100),
                    [this] { return !dataQueue_.empty() || !running_.load(); })) {
                    
                    if (!running_.load()) {
                        break;
                    }
                    
                    if (!dataQueue_.empty()) {
                        data = dataQueue_.front();
                        dataQueue_.pop();
                    } else {
                        continue;
                    }
                } else {
                    // Timeout - check if we should flush
                    lock.unlock();
                    std::lock_guard<std::mutex> batchLock(batchMutex_);
                    if (shouldFlush()) {
                        flushBatch();
                    }
                    continue;
                }
            }
            
            // Process the data
            auto startTime = std::chrono::system_clock::now();
            
            // Update last values for outlier detection
            updateLastValue(data);
            
            // Add to batch
            addToBatch(data);
            
            // Calculate processing latency
            calculateLatency(startTime);
            
        } catch (const std::exception& e) {
            Logger::error("Worker thread error: {}", e.what());
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    Logger::debug("Worker thread stopped");
}

inline bool DataManager::validateSensorData(const SensorData& data) {
    if (!config_.getEnableValidation()) {
        return true;
    }
    
    // Basic validation
    if (data.id.empty() || data.name.empty()) {
        return false;
    }
    
    // Quality check
    if (data.quality != "good" && data.quality != "uncertain") {
        return false;
    }
    
    // Outlier detection
    if (config_.getOutlierDetection() && detectOutlier(data)) {
        Logger::debug("Outlier detected for sensor {}: {}", data.id, data.value);
        return false;
    }
    
    return true;
}

inline bool DataManager::detectOutlier(const SensorData& data) {
    std::lock_guard<std::mutex> lock(lastValuesMutex_);
    
    auto it = lastValues_.find(data.id);
    if (it == lastValues_.end()) {
        return false; // No previous value to compare
    }
    
    double lastValue = it->second.value;
    double threshold = config_.getOutlierThreshold() / 100.0;
    
    // Check if change is too large
    double change = std::abs(data.value - lastValue) / std::abs(lastValue);
    return change > threshold;
}

inline void DataManager::updateLastValue(const SensorData& data) {
    std::lock_guard<std::mutex> lock(lastValuesMutex_);
    lastValues_[data.id] = data;
}

inline void DataManager::addToBatch(const SensorData& data) {
    std::lock_guard<std::mutex> lock(batchMutex_);
    
    currentBatch_.push_back(data);
    
    // Check if we should flush
    if (shouldFlush()) {
        flushBatch();
    }
}

inline void DataManager::flushBatch() {
    // Note: batchMutex_ should already be locked when calling this
    
    if (currentBatch_.empty() || !dataWriter_) {
        return;
    }
    
    try {
        // Write batch to InfluxDB
        bool success = dataWriter_->writeBatch(currentBatch_);
        
        if (success) {
            metrics_.successfulWrites.increment();
            Logger::debug("Flushed batch of {} samples", currentBatch_.size());
        } else {
            metrics_.failedWrites.increment();
            Logger::warn("Failed to flush batch of {} samples", currentBatch_.size());
        }
        
        updateMetrics(success);
        
    } catch (const std::exception& e) {
        Logger::error("Error flushing batch: {}", e.what());
        metrics_.failedWrites.increment();
    }
    
    // Clear batch and update flush time
    currentBatch_.clear();
    lastFlush_ = std::chrono::system_clock::now();
}

inline bool DataManager::shouldFlush() const {
    // Flush if batch is full or timeout reached
    if (currentBatch_.size() >= static_cast<size_t>(config_.getBatchSize())) {
        return true;
    }
    
    auto now = std::chrono::system_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastFlush_);
    
    return elapsed.count() >= config_.getFlushInterval();
}

inline void DataManager::updateMetrics(bool success) {
    if (success) {
        metrics_.successfulWrites.increment();
    } else {
        metrics_.failedWrites.increment();
    }
    
    metrics_.lastUpdateTime.store(getCurrentTimestamp());
}

inline void DataManager::calculateLatency(const TimePoint& startTime) {
    auto endTime = std::chrono::system_clock::now();
    auto latency = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    
    // Simple moving average for latency
    double currentAvg = metrics_.avgLatency.load();
    double newLatency = latency.count() / 1000.0; // Convert to milliseconds
    double newAvg = (currentAvg * 0.9) + (newLatency * 0.1); // Exponential smoothing
    
    metrics_.avgLatency.store(newAvg);
}

} // namespace tusas_hgu