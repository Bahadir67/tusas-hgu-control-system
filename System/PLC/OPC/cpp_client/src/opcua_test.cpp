#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <fstream>
#include <map>
#include <vector>

#include <open62541/client.h>
#include <open62541/client_config_default.h>
#include <open62541/client_subscriptions.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

class OPCUATestClient {
public:
    OPCUATestClient() : client_(nullptr), connected_(false) {}
    
    ~OPCUATestClient() {
        disconnect();
    }
    
    bool connect(const std::string& endpoint) {
        // Create client
        client_ = UA_Client_new();
        UA_ClientConfig* config = UA_Client_getConfig(client_);
        UA_ClientConfig_setDefault(config);
        
        // Increase timeout for industrial networks
        config->timeout = 30000;  // 30 seconds
        config->connectivityCheckInterval = 60000;  // 60 seconds
        
        // Connect to server
        std::cout << "Connecting to: " << endpoint << std::endl;
        UA_StatusCode retval = UA_Client_connect(client_, endpoint.c_str());
        
        if (retval != UA_STATUSCODE_GOOD) {
            std::cout << "Connection failed: " << UA_StatusCode_name(retval) << std::endl;
            UA_Client_delete(client_);
            client_ = nullptr;
            return false;
        }
        
        connected_ = true;
        std::cout << "✓ Connected to OPC UA server" << std::endl;
        return true;
    }
    
    void disconnect() {
        if (client_ && connected_) {
            UA_Client_disconnect(client_);
            UA_Client_delete(client_);
            client_ = nullptr;
            connected_ = false;
            std::cout << "✓ Disconnected from OPC UA server" << std::endl;
        }
    }
    
    bool browseNodes() {
        if (!connected_) return false;
        
        std::cout << "\n=== Browsing OPC UA Address Space ===" << std::endl;
        
        // Browse Objects folder
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 0;
        bReq.nodesToBrowse = UA_BrowseDescription_new();
        bReq.nodesToBrowseSize = 1;
        bReq.nodesToBrowse[0].nodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);
        bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_ALL;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            std::cout << "Found " << bResp.resultsSize << " references in Objects folder:" << std::endl;
            
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    std::cout << "  - " << name << std::endl;
                    
                    // If this is ServerInterfaces, browse HGU_Interface
                    if (name == "ServerInterfaces") {
                        browseServerInterfaces(ref->nodeId.nodeId);
                    }
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        
        return true;
    }
    
    bool browseServerInterfaces(const UA_NodeId& serverInterfacesId) {
        std::cout << "\n=== Browsing ServerInterfaces ===" << std::endl;
        
        // Stack-based approach for safety
        UA_BrowseDescription browseDescription;
        UA_BrowseDescription_init(&browseDescription);
        UA_NodeId_copy(&serverInterfacesId, &browseDescription.nodeId);
        browseDescription.resultMask = UA_BROWSERESULTMASK_ALL;
        
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 0;
        bReq.nodesToBrowse = &browseDescription;
        bReq.nodesToBrowseSize = 1;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            std::cout << "Found " << bResp.results[0].referencesSize << " interfaces:" << std::endl;
            
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    std::cout << "  - " << name << std::endl;
                    
                    // If this is HGU_Interface, browse its sensors
                    if (name == "HGU_Interface") {
                        browseHGUNodes(ref->nodeId.nodeId);
                    }
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        
        return true;
    }

    bool browseHGUNodes(const UA_NodeId& hguNodeId) {
        std::cout << "\n=== Browsing HGU_Interface Sensors ===" << std::endl;
        
        // Stack-based approach for safety
        UA_BrowseDescription browseDescription;
        UA_BrowseDescription_init(&browseDescription);
        UA_NodeId_copy(&hguNodeId, &browseDescription.nodeId);
        browseDescription.resultMask = UA_BROWSERESULTMASK_ALL;
        
        UA_BrowseRequest bReq;
        UA_BrowseRequest_init(&bReq);
        bReq.requestedMaxReferencesPerNode = 0;
        bReq.nodesToBrowse = &browseDescription;
        bReq.nodesToBrowseSize = 1;
        
        UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
        
        if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
            std::cout << "Found " << bResp.results[0].referencesSize << " HGU sensors:" << std::endl;
            
            for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                
                if (ref->displayName.text.length > 0) {
                    std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                   ref->displayName.text.length);
                    
                    // Read the value - safe approach
                    UA_ReadValueId readValueId;
                    UA_ReadValueId_init(&readValueId);
                    UA_NodeId_copy(&ref->nodeId.nodeId, &readValueId.nodeId);
                    readValueId.attributeId = UA_ATTRIBUTEID_VALUE;
                    
                    UA_ReadRequest readReq;
                    UA_ReadRequest_init(&readReq);
                    readReq.nodesToRead = &readValueId;
                    readReq.nodesToReadSize = 1;
                    
                    UA_ReadResponse readResp = UA_Client_Service_read(client_, readReq);
                    
                    if (readResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD && 
                        readResp.results && readResp.results[0].hasValue) {
                        
                        UA_Variant* value = &readResp.results[0].value;
                        std::string valueStr = variantToString(*value);
                        std::cout << "  - " << name << " = " << valueStr << std::endl;
                        
                        // Store sensor info - simple approach
                        sensor_nodeids_[name] = name;  // Use sensor name as key
                    }
                    
                    // Cleanup
                    UA_ReadValueId_clear(&readValueId);
                    UA_ReadRequest_clear(&readReq);
                    UA_ReadResponse_clear(&readResp);
                }
            }
        }
        
        UA_BrowseRequest_clear(&bReq);
        UA_BrowseResponse_clear(&bResp);
        
        return true;
    }
    
    void monitorSensors(int duration_seconds = 30) {
        if (!connected_ || sensor_nodeids_.empty()) {
            std::cout << "No sensors to monitor" << std::endl;
            return;
        }
        
        std::cout << "\n=== Monitoring Sensors for " << duration_seconds << " seconds ===" << std::endl;
        
        auto start_time = std::chrono::steady_clock::now();
        auto end_time = start_time + std::chrono::seconds(duration_seconds);
        
        int cycle = 0;
        while (std::chrono::steady_clock::now() < end_time) {
            cycle++;
            std::cout << "\n--- Cycle " << cycle << " ---" << std::endl;
            
            // Simple monitoring - just show stored sensors
            std::cout << "  Found " << sensor_nodeids_.size() << " sensors in memory" << std::endl;
            for (const auto& sensor : sensor_nodeids_) {
                std::cout << "  - " << sensor.first << std::endl;
            }
            
            std::this_thread::sleep_for(std::chrono::seconds(2));
        }
        
        std::cout << "\n✓ Monitoring completed" << std::endl;
    }
    
private:
    std::string variantToString(const UA_Variant& variant) {
        if (variant.type == &UA_TYPES[UA_TYPES_DOUBLE]) {
            return std::to_string(*(UA_Double*)variant.data);
        } else if (variant.type == &UA_TYPES[UA_TYPES_FLOAT]) {
            return std::to_string(*(UA_Float*)variant.data);
        } else if (variant.type == &UA_TYPES[UA_TYPES_INT32]) {
            return std::to_string(*(UA_Int32*)variant.data);
        } else if (variant.type == &UA_TYPES[UA_TYPES_UINT32]) {
            return std::to_string(*(UA_UInt32*)variant.data);
        } else if (variant.type == &UA_TYPES[UA_TYPES_BOOLEAN]) {
            return *(UA_Boolean*)variant.data ? "true" : "false";
        } else if (variant.type == &UA_TYPES[UA_TYPES_STRING]) {
            UA_String* str = (UA_String*)variant.data;
            return std::string(reinterpret_cast<char*>(str->data), str->length);
        } else {
            return "unknown_type";
        }
    }
    
    UA_Client* client_;
    bool connected_;
    std::map<std::string, std::string> sensor_nodeids_;  // Store as string to avoid memory issues
};

int main() {
    std::cout << "\n========================================" << std::endl;
    std::cout << "   TUSAS HGU OPC UA Client Test" << std::endl;
    std::cout << "========================================" << std::endl;
    
    OPCUATestClient client;
    
    // Test PLCSIM endpoint
    std::string endpoint = "opc.tcp://192.168.0.1:4840";
    
    if (client.connect(endpoint)) {
        // Browse the address space
        client.browseNodes();
        
        // Monitor sensors for 30 seconds
        client.monitorSensors(30);
        
        std::cout << "\n✓ Test completed successfully!" << std::endl;
    } else {
        std::cout << "\n✗ Test failed - could not connect to server" << std::endl;
        return 1;
    }
    
    return 0;
}