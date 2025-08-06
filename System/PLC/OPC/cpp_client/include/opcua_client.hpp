#pragma once

#include "common.hpp"
#include "config.hpp"
#include "sensor_mapping.hpp"
#include "data_manager.hpp"

namespace tusas_hgu {

// OPC UA connection state
enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    SUBSCRIPTION_ACTIVE,
    ERROR
};

// Subscription data for monitoring changes
struct SubscriptionData {
    UA_UInt32 subscriptionId;
    UA_UInt32 monitoredItemId;
    std::string sensorId;
    bool active;
    
    SubscriptionData() : subscriptionId(0), monitoredItemId(0), active(false) {}
};

// High-performance OPC UA client
class OPCUAClient {
private:
    const Config& config_;
    DataManager& dataManager_;
    
    // OPC UA client
    UA_Client* client_;
    ConnectionState state_;
    std::atomic<bool> running_;
    
    // Connection settings
    std::string endpoint_;
    UA_MessageSecurityMode securityMode_;
    UA_String securityPolicy_;
    
    // Subscription management
    UA_UInt32 subscriptionId_;
    std::vector<SubscriptionData> subscriptions_;
    std::mutex subscriptionsMutex_;
    
    // Sensor nodes
    std::map<std::string, NodeInfo> sensorNodes_;
    std::vector<SensorMapping::SensorDefinition> sensorDefinitions_;
    
    // Threading
    std::thread connectionThread_;
    std::thread subscriptionThread_;
    std::mutex clientMutex_;
    
    // Reconnection logic
    std::atomic<int> reconnectAttempts_;
    std::chrono::steady_clock::time_point lastReconnectAttempt_;
    
    // Performance monitoring
    std::atomic<uint64_t> messagesReceived_;
    std::atomic<uint64_t> subscriptionErrors_;
    std::chrono::steady_clock::time_point lastDataTime_;
    
public:
    OPCUAClient(const Config& config, DataManager& dataManager);
    ~OPCUAClient();
    
    // Lifecycle
    bool initialize();
    bool connect();
    void disconnect();
    
    // Control
    void start();
    void stop();
    
    // Status
    ConnectionState getState() const { return state_; }
    bool isConnected() const { return state_ >= ConnectionState::CONNECTED; }
    bool isRunning() const { return running_.load(); }
    
    // Statistics
    uint64_t getMessagesReceived() const { return messagesReceived_.load(); }
    uint64_t getSubscriptionErrors() const { return subscriptionErrors_.load(); }
    
    // Node operations
    bool discoverNodes();
    bool createSubscriptions();
    
private:
    // Connection management
    void connectionThreadFunction();
    void subscriptionThreadFunction();
    bool performConnection();
    void handleDisconnection();
    
    // Subscription management
    bool createSubscription();
    bool addMonitoredItems();
    void removeSubscriptions();
    
    // Node discovery
    bool addSensorNode(const SensorMapping::SensorDefinition& sensor);
    UA_NodeId parseNodeId(const std::string& nodeIdString);
    
    // Data handling
    static void dataChangeCallback(UA_Client* client, UA_UInt32 subId, void* subContext,
                                 UA_UInt32 monId, void* monContext, UA_DataValue* value);
    void processDataChange(const std::string& sensorId, const UA_DataValue* value);
    
    // Utility methods
    void setState(ConnectionState newState);
    bool shouldReconnect() const;
    void incrementReconnectAttempts();
    void resetReconnectAttempts();
    
    // Security configuration
    void configureClientSecurity();
    UA_MessageSecurityMode parseSecurityMode(const std::string& mode);
    
    // Error handling
    void logUAError(UA_StatusCode status, const std::string& operation) const;
    bool isRetriableError(UA_StatusCode status) const;
    
    // Value conversion
    double convertUAVariantToDouble(const UA_Variant& variant) const;
    bool convertUAVariantToBool(const UA_Variant& variant) const;
    std::string getUADataTypeName(const UA_DataType* type) const;
};

// Implementation
inline OPCUAClient::OPCUAClient(const Config& config, DataManager& dataManager)
    : config_(config), dataManager_(dataManager), client_(nullptr), 
      state_(ConnectionState::DISCONNECTED), running_(false),
      subscriptionId_(0), reconnectAttempts_(0),
      messagesReceived_(0), subscriptionErrors_(0) {
    
    endpoint_ = config_.getOPCUAEndpoint();
    securityMode_ = parseSecurityMode(config_.getSecurityMode());
    
    // Load sensor definitions
    sensorDefinitions_ = SensorMapping::getAllSensors();
    
    Logger::info("OPC UA Client created for endpoint: {}", endpoint_);
}

inline OPCUAClient::~OPCUAClient() {
    stop();
    disconnect();
}

inline bool OPCUAClient::initialize() {
    Logger::info("Initializing OPC UA client...");
    
    try {
        // Create client
        client_ = UA_Client_new();
        if (!client_) {
            Logger::error("Failed to create OPC UA client");
            return false;
        }
        
        // Configure client
        UA_ClientConfig* config = UA_Client_getConfig(client_);
        UA_ClientConfig_setDefault(config);
        
        // Set timeouts
        config->timeout = config_.getConnectionTimeout();
        config->connectivityCheckInterval = 30000; // 30 seconds
        
        // Configure security
        configureClientSecurity();
        
        setState(ConnectionState::DISCONNECTED);
        
        Logger::info("OPC UA client initialized successfully");
        return true;
        
    } catch (const std::exception& e) {
        Logger::error("Failed to initialize OPC UA client: {}", e.what());
        return false;
    }
}

inline bool OPCUAClient::connect() {
    if (isConnected()) {
        return true;
    }
    
    Logger::info("Connecting to OPC UA server: {}", endpoint_);
    setState(ConnectionState::CONNECTING);
    
    std::lock_guard<std::mutex> lock(clientMutex_);
    
    UA_StatusCode status = UA_Client_connect(client_, endpoint_.c_str());
    
    if (status != UA_STATUSCODE_GOOD) {
        logUAError(status, "connect");
        setState(ConnectionState::ERROR);
        return false;
    }
    
    setState(ConnectionState::CONNECTED);
    resetReconnectAttempts();
    
    Logger::info("Successfully connected to OPC UA server");
    
    // Discover nodes and create subscriptions
    if (!discoverNodes()) {
        Logger::error("Failed to discover sensor nodes");
        return false;
    }
    
    if (!createSubscriptions()) {
        Logger::error("Failed to create subscriptions");
        return false;
    }
    
    setState(ConnectionState::SUBSCRIPTION_ACTIVE);
    lastDataTime_ = std::chrono::steady_clock::now();
    
    return true;
}

inline void OPCUAClient::disconnect() {
    if (client_) {
        std::lock_guard<std::mutex> lock(clientMutex_);
        
        // Remove subscriptions first
        removeSubscriptions();
        
        // Disconnect client
        UA_Client_disconnect(client_);
        UA_Client_delete(client_);
        client_ = nullptr;
    }
    
    setState(ConnectionState::DISCONNECTED);
    Logger::info("Disconnected from OPC UA server");
}

inline void OPCUAClient::start() {
    if (running_.load()) {
        return;
    }
    
    Logger::info("Starting OPC UA client...");
    running_ = true;
    
    // Start background threads
    connectionThread_ = std::thread(&OPCUAClient::connectionThreadFunction, this);
    subscriptionThread_ = std::thread(&OPCUAClient::subscriptionThreadFunction, this);
    
    Logger::info("OPC UA client started");
}

inline void OPCUAClient::stop() {
    if (!running_.load()) {
        return;
    }
    
    Logger::info("Stopping OPC UA client...");
    running_ = false;
    
    // Wait for threads to finish
    if (connectionThread_.joinable()) {
        connectionThread_.join();
    }
    
    if (subscriptionThread_.joinable()) {
        subscriptionThread_.join();
    }
    
    Logger::info("OPC UA client stopped");
}

inline bool OPCUAClient::discoverNodes() {
    Logger::info("Discovering sensor nodes...");
    
    sensorNodes_.clear();
    int discoveredCount = 0;
    
    for (const auto& sensor : sensorDefinitions_) {
        if (addSensorNode(sensor)) {
            discoveredCount++;
        }
    }
    
    Logger::info("Discovered {}/{} sensor nodes", discoveredCount, sensorDefinitions_.size());
    return discoveredCount > 0;
}

inline bool OPCUAClient::createSubscriptions() {
    Logger::info("Creating OPC UA subscriptions...");
    
    if (!createSubscription()) {
        return false;
    }
    
    if (!addMonitoredItems()) {
        return false;
    }
    
    Logger::info("Successfully created subscriptions for {} nodes", sensorNodes_.size());
    return true;
}

inline void OPCUAClient::connectionThreadFunction() {
    Logger::debug("Connection thread started");
    
    while (running_.load()) {
        try {
            if (!isConnected() && shouldReconnect()) {
                Logger::info("Attempting to reconnect to OPC UA server...");
                
                if (performConnection()) {
                    Logger::info("Reconnection successful");
                } else {
                    incrementReconnectAttempts();
                    
                    if (reconnectAttempts_.load() >= config_.getMaxReconnectAttempts()) {
                        Logger::error("Maximum reconnection attempts reached, stopping");
                        running_ = false;
                        break;
                    }
                }
            }
            
            // Check connection health
            if (isConnected()) {
                auto now = std::chrono::steady_clock::now();
                auto timeSinceLastData = std::chrono::duration_cast<std::chrono::seconds>(
                    now - lastDataTime_).count();
                
                if (timeSinceLastData > 60) { // No data for 60 seconds
                    Logger::warn("No data received for {} seconds, checking connection", timeSinceLastData);
                    
                    // Perform a simple read to test connection
                    if (!sensorNodes_.empty()) {
                        auto firstNode = sensorNodes_.begin();
                        UA_Variant value;
                        UA_StatusCode status = UA_Client_readValueAttribute(
                            client_, firstNode->second.nodeId, &value);
                        
                        if (status != UA_STATUSCODE_GOOD) {
                            Logger::warn("Connection test failed, will attempt reconnection");
                            handleDisconnection();
                        } else {
                            lastDataTime_ = now;
                            UA_Variant_clear(&value);
                        }
                    }
                }
            }
            
            std::this_thread::sleep_for(std::chrono::seconds(5));
            
        } catch (const std::exception& e) {
            Logger::error("Connection thread error: {}", e.what());
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }
    
    Logger::debug("Connection thread stopped");
}

inline void OPCUAClient::subscriptionThreadFunction() {
    Logger::debug("Subscription thread started");
    
    while (running_.load()) {
        try {
            if (isConnected() && client_) {
                std::lock_guard<std::mutex> lock(clientMutex_);
                
                // Process subscription events
                UA_StatusCode status = UA_Client_run_iterate(client_, 100); // 100ms timeout
                
                if (status != UA_STATUSCODE_GOOD && status != UA_STATUSCODE_TIMEOUT) {
                    logUAError(status, "run_iterate");
                    
                    if (!isRetriableError(status)) {
                        Logger::error("Non-retriable error, disconnecting");
                        handleDisconnection();
                    }
                }
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
            }
            
        } catch (const std::exception& e) {
            Logger::error("Subscription thread error: {}", e.what());
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    Logger::debug("Subscription thread stopped");
}

inline bool OPCUAClient::performConnection() {
    try {
        // Clean up existing connection
        if (client_) {
            disconnect();
        }
        
        // Reinitialize and connect
        if (!initialize()) {
            return false;
        }
        
        return connect();
        
    } catch (const std::exception& e) {
        Logger::error("Connection attempt failed: {}", e.what());
        return false;
    }
}

inline void OPCUAClient::handleDisconnection() {
    setState(ConnectionState::DISCONNECTED);
    subscriptions_.clear();
}

inline bool OPCUAClient::createSubscription() {
    UA_CreateSubscriptionRequest request = UA_CreateSubscriptionRequest_default();
    request.requestedPublishingInterval = config_.getSubscriptionInterval();
    request.requestedLifetimeCount = 10000;
    request.requestedMaxKeepAliveCount = 10;
    request.maxNotificationsPerPublish = 1000;
    request.publishingEnabled = true;
    request.priority = 0;
    
    UA_CreateSubscriptionResponse response = UA_Client_Subscriptions_create(
        client_, request, this, nullptr, nullptr);
    
    if (response.responseHeader.serviceResult != UA_STATUSCODE_GOOD) {
        logUAError(response.responseHeader.serviceResult, "create subscription");
        return false;
    }
    
    subscriptionId_ = response.subscriptionId;
    Logger::debug("Created subscription with ID: {}", subscriptionId_);
    
    return true;
}

inline bool OPCUAClient::addMonitoredItems() {
    for (const auto& [sensorId, nodeInfo] : sensorNodes_) {
        UA_MonitoredItemCreateRequest request = UA_MonitoredItemCreateRequest_default(nodeInfo.nodeId);
        request.requestedParameters.samplingInterval = config_.getSubscriptionInterval();
        request.requestedParameters.queueSize = 1;
        request.requestedParameters.discardOldest = true;
        
        SubscriptionData* subData = new SubscriptionData();
        subData->sensorId = sensorId;
        subData->subscriptionId = subscriptionId_;
        
        UA_MonitoredItemCreateResult result = UA_Client_MonitoredItems_createDataChange(
            client_, subscriptionId_, UA_TIMESTAMPSTORETURN_BOTH, request,
            subData, dataChangeCallback, nullptr);
        
        if (result.statusCode == UA_STATUSCODE_GOOD) {
            subData->monitoredItemId = result.monitoredItemId;
            subData->active = true;
            
            std::lock_guard<std::mutex> lock(subscriptionsMutex_);
            subscriptions_.push_back(*subData);
            
            Logger::debug("Added monitored item for sensor: {}", sensorId);
        } else {
            logUAError(result.statusCode, "create monitored item for " + sensorId);
            delete subData;
        }
    }
    
    return !subscriptions_.empty();
}

inline void OPCUAClient::removeSubscriptions() {
    if (subscriptionId_ != 0 && client_) {
        UA_Client_Subscriptions_deleteSingle(client_, subscriptionId_);
        subscriptionId_ = 0;
    }
    
    std::lock_guard<std::mutex> lock(subscriptionsMutex_);
    subscriptions_.clear();
}

inline bool OPCUAClient::addSensorNode(const SensorMapping::SensorDefinition& sensor) {
    try {
        UA_NodeId nodeId = parseNodeId(sensor.nodeId);
        
        // Test if node exists by reading its value
        UA_Variant value;
        UA_StatusCode status = UA_Client_readValueAttribute(client_, nodeId, &value);
        
        if (status == UA_STATUSCODE_GOOD) {
            NodeInfo nodeInfo(sensor.id, sensor.name, nodeId, "");
            sensorNodes_[sensor.id] = nodeInfo;
            
            UA_Variant_clear(&value);
            Logger::debug("Added sensor node: {} -> {}", sensor.id, sensor.nodeId);
            return true;
        } else {
            Logger::warn("Sensor node not accessible: {} ({})", sensor.id, UA_StatusCode_name(status));
            return false;
        }
        
    } catch (const std::exception& e) {
        Logger::error("Error adding sensor node {}: {}", sensor.id, e.what());
        return false;
    }
}

inline UA_NodeId OPCUAClient::parseNodeId(const std::string& nodeIdString) {
    // Parse node ID string format: "ns=2;s=\"DB100\".\"Pressure_Supply\""
    
    size_t nsPos = nodeIdString.find("ns=");
    size_t sPos = nodeIdString.find(";s=");
    
    if (nsPos == std::string::npos || sPos == std::string::npos) {
        throw std::invalid_argument("Invalid node ID format: " + nodeIdString);
    }
    
    // Extract namespace
    int ns = std::stoi(nodeIdString.substr(nsPos + 3, sPos - nsPos - 3));
    
    // Extract identifier (remove quotes if present)
    std::string identifier = nodeIdString.substr(sPos + 3);
    if (identifier.front() == '"' && identifier.back() == '"') {
        identifier = identifier.substr(1, identifier.length() - 2);
    }
    
    return UA_NODEID_STRING(ns, const_cast<char*>(identifier.c_str()));
}

inline void OPCUAClient::dataChangeCallback(UA_Client* client, UA_UInt32 subId, void* subContext,
                                          UA_UInt32 monId, void* monContext, UA_DataValue* value) {
    if (!monContext || !value) {
        return;
    }
    
    OPCUAClient* opcClient = static_cast<OPCUAClient*>(subContext);
    SubscriptionData* subData = static_cast<SubscriptionData*>(monContext);
    
    opcClient->processDataChange(subData->sensorId, value);
}

inline void OPCUAClient::processDataChange(const std::string& sensorId, const UA_DataValue* value) {
    try {
        messagesReceived_.fetch_add(1);
        lastDataTime_ = std::chrono::steady_clock::now();
        
        if (!value || !value->hasValue) {
            Logger::warn("Received empty value for sensor: {}", sensorId);
            subscriptionErrors_.fetch_add(1);
            return;
        }
        
        // Find sensor definition
        auto sensorDef = SensorMapping::getSensorById(sensorId);
        if (sensorDef.id.empty()) {
            Logger::warn("Unknown sensor ID: {}", sensorId);
            return;
        }
        
        // Convert value
        double numericValue = 0.0;
        std::string quality = "good";
        
        if (sensorDef.isDigital) {
            numericValue = convertUAVariantToBool(value->value) ? 1.0 : 0.0;
        } else {
            numericValue = convertUAVariantToDouble(value->value);
        }
        
        // Check value quality
        if (value->hasStatus && value->status != UA_STATUSCODE_GOOD) {
            quality = "bad";
            Logger::debug("Poor quality data for sensor {}: {}", sensorId, UA_StatusCode_name(value->status));
        }
        
        // Create sensor data
        SensorData data(sensorId, sensorDef.name, numericValue, sensorDef.unit, quality);
        
        // Set timestamp from server if available
        if (value->hasServerTimestamp) {
            auto serverTime = std::chrono::system_clock::from_time_t(
                value->serverTimestamp / 10000000 - 11644473600LL); // UA to Unix epoch
            data.timestamp = serverTime;
        }
        
        // Validate value range
        if (!SensorMapping::validateSensorValue(sensorDef, numericValue)) {
            Logger::warn("Value out of range for sensor {}: {} (expected {}-{})", 
                        sensorId, numericValue, sensorDef.minValue, sensorDef.maxValue);
            quality = "uncertain";
            data.quality = quality;
        }
        
        // Send to data manager
        dataManager_.addSensorData(data);
        
        Logger::debug("Processed data for sensor {}: {} {}", sensorId, numericValue, sensorDef.unit);
        
    } catch (const std::exception& e) {
        Logger::error("Error processing data change for sensor {}: {}", sensorId, e.what());
        subscriptionErrors_.fetch_add(1);
    }
}

inline void OPCUAClient::setState(ConnectionState newState) {
    if (state_ != newState) {
        Logger::debug("OPC UA state change: {} -> {}", (int)state_, (int)newState);
        state_ = newState;
    }
}

inline bool OPCUAClient::shouldReconnect() const {
    if (isConnected() || !config_.getAutoReconnect()) {
        return false;
    }
    
    auto now = std::chrono::steady_clock::now();
    auto timeSinceLastAttempt = std::chrono::duration_cast<std::chrono::seconds>(
        now - lastReconnectAttempt_).count();
    
    return timeSinceLastAttempt >= config_.getReconnectDelay() / 1000;
}

inline void OPCUAClient::incrementReconnectAttempts() {
    reconnectAttempts_.fetch_add(1);
    lastReconnectAttempt_ = std::chrono::steady_clock::now();
}

inline void OPCUAClient::resetReconnectAttempts() {
    reconnectAttempts_ = 0;
}

inline void OPCUAClient::configureClientSecurity() {
    if (!client_) return;
    
    UA_ClientConfig* config = UA_Client_getConfig(client_);
    
    // Set security mode
    config->securityMode = securityMode_;
    
    // TODO: Configure certificates and encryption if needed
    if (securityMode_ != UA_MESSAGESECURITYMODE_NONE) {
        Logger::info("Security mode configured: {}", config_.getSecurityMode());
        // Additional certificate configuration would go here
    }
}

inline UA_MessageSecurityMode OPCUAClient::parseSecurityMode(const std::string& mode) {
    if (mode == "Sign") return UA_MESSAGESECURITYMODE_SIGN;
    if (mode == "SignAndEncrypt") return UA_MESSAGESECURITYMODE_SIGNANDENCRYPT;
    return UA_MESSAGESECURITYMODE_NONE; // Default
}

inline void OPCUAClient::logUAError(UA_StatusCode status, const std::string& operation) const {
    Logger::error("OPC UA {} error: {} (0x{:08X})", operation, UA_StatusCode_name(status), status);
}

inline bool OPCUAClient::isRetriableError(UA_StatusCode status) const {
    return status == UA_STATUSCODE_BADCONNECTIONCLOSED ||
           status == UA_STATUSCODE_BADSERVERNOTCONNECTED ||
           status == UA_STATUSCODE_BADTIMEOUT ||
           status == UA_STATUSCODE_BADCOMMUNICATIONERROR;
}

inline double OPCUAClient::convertUAVariantToDouble(const UA_Variant& variant) const {
    if (variant.type == &UA_TYPES[UA_TYPES_DOUBLE]) {
        return *(UA_Double*)variant.data;
    } else if (variant.type == &UA_TYPES[UA_TYPES_FLOAT]) {
        return (double)(*(UA_Float*)variant.data);
    } else if (variant.type == &UA_TYPES[UA_TYPES_INT32]) {
        return (double)(*(UA_Int32*)variant.data);
    } else if (variant.type == &UA_TYPES[UA_TYPES_INT16]) {
        return (double)(*(UA_Int16*)variant.data);
    } else if (variant.type == &UA_TYPES[UA_TYPES_UINT32]) {
        return (double)(*(UA_UInt32*)variant.data);
    } else if (variant.type == &UA_TYPES[UA_TYPES_UINT16]) {
        return (double)(*(UA_UInt16*)variant.data);
    }
    
    Logger::warn("Unsupported data type for numeric conversion: {}", 
                getUADataTypeName(variant.type));
    return 0.0;
}

inline bool OPCUAClient::convertUAVariantToBool(const UA_Variant& variant) const {
    if (variant.type == &UA_TYPES[UA_TYPES_BOOLEAN]) {
        return *(UA_Boolean*)variant.data;
    } else if (variant.type == &UA_TYPES[UA_TYPES_BYTE]) {
        return (*(UA_Byte*)variant.data) != 0;
    } else {
        // Try to convert numeric types to boolean
        double value = convertUAVariantToDouble(variant);
        return value != 0.0;
    }
}

inline std::string OPCUAClient::getUADataTypeName(const UA_DataType* type) const {
    if (!type || !type->typeName.data) {
        return "Unknown";
    }
    
    return std::string((char*)type->typeName.data, type->typeName.length);
}

} // namespace tusas_hgu