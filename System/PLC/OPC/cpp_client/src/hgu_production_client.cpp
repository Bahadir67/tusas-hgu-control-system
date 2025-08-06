#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <thread>
#include <chrono>
#include <optional>
#include <algorithm>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <open62541/client.h>
#include <open62541/client_config_default.h>

using json = nlohmann::json;

struct HGUSensor {
    std::string name;
    UA_NodeId nodeId;
    std::string dataType;
    bool isValid;
};

// Callback for curl response
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* response) {
    size_t totalSize = size * nmemb;
    response->append((char*)contents, totalSize);
    return totalSize;
}

class HGUProductionClient {
public:
    HGUProductionClient() : 
        client_(nullptr), 
        connected_(false),
        influxUrl_("http://localhost:8086"),
        influxToken_("87zzaBVQnKrHP2j8NNtXWZe_5CuvhcEzUONmltOz9ljJrgSMbvmAXQw6YuLPN_vz5dv6gEUiGLdxeLTdFqz_nA=="),
        influxOrg_("tusas"),
        influxBucket_("tusas_hgu") {
        
        // Initialize curl
        curl_global_init(CURL_GLOBAL_DEFAULT);
        
        std::cout << "🏭 TUSAS HGU Production OPC UA Client" << std::endl;
        std::cout << "📡 Target: opc.tcp://192.168.0.1:4840" << std::endl;
        std::cout << "💾 InfluxDB: " << influxUrl_ << std::endl;
    }
    
    ~HGUProductionClient() {
        disconnect();
        curl_global_cleanup();
    }
    
    bool connect() {
        try {
            client_ = UA_Client_new();
            if (!client_) {
                std::cout << "❌ Failed to create OPC UA client" << std::endl;
                return false;
            }
            
            UA_ClientConfig* config = UA_Client_getConfig(client_);
            UA_ClientConfig_setDefault(config);
            config->timeout = 30000;  // 30 seconds
            
            std::cout << "🔄 Connecting to PLCSIM..." << std::endl;
            UA_StatusCode retval = UA_Client_connect(client_, "opc.tcp://192.168.0.1:4840");
            
            if (retval != UA_STATUSCODE_GOOD) {
                std::cout << "❌ Connection failed: " << UA_StatusCode_name(retval) << std::endl;
                UA_Client_delete(client_);
                client_ = nullptr;
                return false;
            }
            
            connected_ = true;
            std::cout << "✅ Connected to PLCSIM successfully!" << std::endl;
            return true;
            
        } catch (...) {
            std::cout << "❌ Exception during connection" << std::endl;
            return false;
        }
    }
    
    void disconnect() {
        if (client_ && connected_) {
            try {
                UA_Client_disconnect(client_);
                UA_Client_delete(client_);
                client_ = nullptr;
                connected_ = false;
                std::cout << "✅ Disconnected from PLCSIM" << std::endl;
            } catch (...) {
                std::cout << "⚠️ Exception during disconnect" << std::endl;
            }
        }
    }
    
    bool discoverHGUSensors() {
        if (!connected_) return false;
        
        try {
            std::cout << "🔍 Discovering HGU sensors..." << std::endl;
            
            // Step 1: Browse Objects to find ServerInterfaces
            UA_NodeId objectsNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);
            if (!findServerInterfaces(objectsNodeId)) {
                return false;
            }
            
            std::cout << "✅ Found " << sensors_.size() << " HGU sensors:" << std::endl;
            for (const auto& sensor : sensors_) {
                std::cout << "   📊 " << sensor.name << " (" << sensor.dataType << ")" << std::endl;
            }
            
            return sensors_.size() > 0;
            
        } catch (...) {
            std::cout << "❌ Exception during sensor discovery" << std::endl;
            return false;
        }
    }
    
    bool collectAndSendData() {
        if (!connected_ || sensors_.empty()) {
            std::cout << "❌ No sensors available for data collection" << std::endl;
            return false;
        }
        
        try {
            std::cout << "🔄 Starting real-time data collection..." << std::endl;
            
            int cycle = 0;
            int successfulWrites = 0;
            
            while (true) {
                cycle++;
                auto startTime = std::chrono::steady_clock::now();
                
                // Read all sensors
                std::vector<std::pair<std::string, double>> sensorData;
                bool hasValidData = false;
                
                for (const auto& sensor : sensors_) {
                    double value;
                    if (readSensorValue(sensor, value)) {
                        sensorData.push_back(std::make_pair(sensor.name, value));
                        hasValidData = true;
                    }
                }
                
                // Send to InfluxDB
                if (hasValidData && writeToInfluxDB(sensorData)) {
                    successfulWrites++;
                }
                
                // Progress display
                if (cycle % 10 == 0) {
                    std::cout << "📊 Cycle " << cycle << ": " << sensorData.size() 
                              << " sensors, " << successfulWrites << " successful writes" << std::endl;
                    
                    // Show first 3 values
                    for (size_t i = 0; i < std::min(sensorData.size(), size_t(3)); ++i) {
                        std::cout << "   " << sensorData[i].first << ": " << sensorData[i].second << std::endl;
                    }
                }
                
                // Sleep for 1 second interval
                auto elapsed = std::chrono::steady_clock::now() - startTime;
                auto sleepTime = std::chrono::seconds(1) - elapsed;
                if (sleepTime > std::chrono::seconds(0)) {
                    std::this_thread::sleep_for(sleepTime);
                }
            }
            
        } catch (...) {
            std::cout << "❌ Exception during data collection" << std::endl;
            return false;
        }
    }
    
private:
    bool findServerInterfaces(const UA_NodeId& objectsNodeId) {
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 10;
        bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
        bReq.nodesToBrowseSize = 1;
        bReq.nodesToBrowse[0].nodeId = objectsNodeId;
        bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        bool found = false;
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    
                    if (name == "ServerInterfaces") {
                        std::cout << "   Found ServerInterfaces" << std::endl;
                        found = findHGUInterface(ref->nodeId.nodeId);
                        break;
                    }
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        return found;
    }
    
    bool findHGUInterface(const UA_NodeId& serverInterfacesId) {
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 10;
        bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
        bReq.nodesToBrowseSize = 1;
        bReq.nodesToBrowse[0].nodeId = serverInterfacesId;
        bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        bool found = false;
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    
                    if (name == "HGU_Interface") {
                        std::cout << "   Found HGU_Interface" << std::endl;
                        found = discoverSensors(ref->nodeId.nodeId);
                        break;
                    }
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        return found;
    }
    
    bool discoverSensors(const UA_NodeId& hguInterfaceId) {
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 20;
        bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
        bReq.nodesToBrowseSize = 1;
        bReq.nodesToBrowse[0].nodeId = hguInterfaceId;
        bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    
                    HGUSensor sensor;
                    sensor.name = name;
                    UA_NodeId_copy(&ref->nodeId.nodeId, &sensor.nodeId);
                    sensor.dataType = "REAL";  // Default assumption
                    sensor.isValid = true;
                    
                    sensors_.push_back(sensor);
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        return sensors_.size() > 0;
    }
    
    bool readSensorValue(const HGUSensor& sensor, double& result) {
        try {
            UA_ReadValueId rvi;
            UA_ReadValueId_init(&rvi);
            rvi.nodeId = sensor.nodeId;
            rvi.attributeId = UA_ATTRIBUTEID_VALUE;
            
            UA_ReadRequest request;
            UA_ReadRequest_init(&request);
            request.nodesToRead = &rvi;
            request.nodesToReadSize = 1;
            
            UA_ReadResponse response = UA_Client_Service_read(client_, request);
            
            bool success = false;
            
            if (response.responseHeader.serviceResult == UA_STATUSCODE_GOOD &&
                response.results[0].hasValue) {
                
                UA_Variant* value = &response.results[0].value;
                
                if (value->type == &UA_TYPES[UA_TYPES_DOUBLE]) {
                    result = *(UA_Double*)value->data;
                    success = true;
                } else if (value->type == &UA_TYPES[UA_TYPES_FLOAT]) {
                    result = (double)(*(UA_Float*)value->data);
                    success = true;
                } else if (value->type == &UA_TYPES[UA_TYPES_BOOLEAN]) {
                    result = (double)(*(UA_Boolean*)value->data ? 1.0 : 0.0);
                    success = true;
                } else if (value->type == &UA_TYPES[UA_TYPES_INT32]) {
                    result = (double)(*(UA_Int32*)value->data);
                    success = true;
                }
            }
            
            UA_ReadResponse_clear(&response);
            return success;
            
        } catch (...) {
            return false;
        }
    }
    
    bool writeToInfluxDB(const std::vector<std::pair<std::string, double>>& sensorData) {
        try {
            CURL* curl = curl_easy_init();
            if (!curl) return false;
            
            // Build line protocol data
            std::string lineProtocol;
            auto now = std::chrono::duration_cast<std::chrono::nanoseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();
            
            for (const auto& sensor : sensorData) {
                lineProtocol += "hgu_real_data,sensor_id=" + sensor.first + 
                               ",location=PLCSIM,equipment=hgu_main,source=opcua_cpp ";
                lineProtocol += "value=" + std::to_string(sensor.second) + " ";
                lineProtocol += std::to_string(now) + "\n";
            }
            
            // Set URL
            std::string url = influxUrl_ + "/api/v2/write?org=" + influxOrg_ + "&bucket=" + influxBucket_;
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            
            // Set headers
            struct curl_slist* headers = nullptr;
            std::string authHeader = "Authorization: Token " + influxToken_;
            headers = curl_slist_append(headers, "Content-Type: text/plain; charset=utf-8");
            headers = curl_slist_append(headers, authHeader.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            
            // Set POST data
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, lineProtocol.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, lineProtocol.length());
            
            // Response handling
            std::string response;
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
            
            // Perform request
            CURLcode res = curl_easy_perform(curl);
            long responseCode;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
            
            // Cleanup
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);
            
            return (res == CURLE_OK && responseCode >= 200 && responseCode < 300);
            
        } catch (...) {
            return false;
        }
    }
    
    UA_Client* client_;
    bool connected_;
    std::vector<HGUSensor> sensors_;
    
    // InfluxDB config
    std::string influxUrl_;
    std::string influxToken_;
    std::string influxOrg_;
    std::string influxBucket_;
};

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "🏭 TUSAS HGU Production Client v1.0" << std::endl;
    std::cout << "========================================" << std::endl;
    
    HGUProductionClient client;
    
    try {
        // Connect to PLCSIM
        if (!client.connect()) {
            std::cout << "❌ Failed to connect to PLCSIM" << std::endl;
            return 1;
        }
        
        // Discover HGU sensors
        if (!client.discoverHGUSensors()) {
            std::cout << "❌ Failed to discover HGU sensors" << std::endl;
            return 1;
        }
        
        // Start real-time data collection
        std::cout << "🚀 Starting production data collection..." << std::endl;
        std::cout << "Press Ctrl+C to stop" << std::endl;
        client.collectAndSendData();
        
    } catch (...) {
        std::cout << "❌ Unexpected exception in main" << std::endl;
        return 1;
    }
    
    return 0;
}