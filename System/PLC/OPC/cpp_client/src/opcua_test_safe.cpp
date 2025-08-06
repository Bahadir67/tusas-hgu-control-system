#include <iostream>
#include <string>
#include <thread>
#include <chrono>

#include <open62541/client.h>
#include <open62541/client_config_default.h>

class SafeOPCUATestClient {
public:
    SafeOPCUATestClient() : client_(nullptr), connected_(false) {}
    
    ~SafeOPCUATestClient() {
        disconnect();
    }
    
    bool connect(const std::string& endpoint) {
        try {
            // Create client
            client_ = UA_Client_new();
            if (!client_) {
                std::cout << "Failed to create UA_Client" << std::endl;
                return false;
            }
            
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
            
        } catch (...) {
            std::cout << "Exception during connection" << std::endl;
            if (client_) {
                UA_Client_delete(client_);
                client_ = nullptr;
            }
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
                std::cout << "✓ Disconnected from OPC UA server" << std::endl;
            } catch (...) {
                std::cout << "Exception during disconnect" << std::endl;
            }
        }
    }
    
    bool testSimpleRead() {
        if (!connected_) return false;
        
        try {
            std::cout << "\\n=== Testing Simple Node Read ===" << std::endl;
            
            // Test read server status - use modern API
            UA_NodeId serverStatusNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_SERVER_SERVERSTATUS_STATE);
            
            UA_ReadRequest readReq;
            UA_ReadRequest_init(&readReq);
            readReq.nodesToRead = (UA_ReadValueId*)UA_Array_new(1, &UA_TYPES[UA_TYPES_READVALUEID]);
            readReq.nodesToReadSize = 1;
            readReq.nodesToRead[0].nodeId = serverStatusNodeId;
            readReq.nodesToRead[0].attributeId = UA_ATTRIBUTEID_VALUE;
            
            UA_ReadResponse readResp = UA_Client_Service_read(client_, readReq);
            UA_StatusCode retval = readResp.responseHeader.serviceResult;
            
            if (retval == UA_STATUSCODE_GOOD) {
                std::cout << "✓ Server status read successful" << std::endl;
            } else {
                std::cout << "✗ Server status read failed: " << UA_StatusCode_name(retval) << std::endl;
            }
            
            // Cleanup
            UA_ReadRequest_clear(&readReq);
            UA_ReadResponse_clear(&readResp);
            
            return (retval == UA_STATUSCODE_GOOD);
            
        } catch (...) {
            std::cout << "Exception during read test" << std::endl;
            return false;
        }
    }
    
    bool browseMinimal() {
        if (!connected_) return false;
        
        try {
            std::cout << "\\n=== Minimal Browse Test ===" << std::endl;
            
            // Browse Objects folder only
            UA_NodeId objectsFolderNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);
            
            UA_BrowseRequest bReq;
            UA_BrowseRequest_init(&bReq);
            bReq.requestedMaxReferencesPerNode = 10;  // Limit to 10
            bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
            bReq.nodesToBrowseSize = 1;
            bReq.nodesToBrowse[0].nodeId = objectsFolderNodeId;
            bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
            
            UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
            
            if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
                std::cout << "Found " << bResp.results[0].referencesSize << " objects:" << std::endl;
                
                for (size_t i = 0; i < bResp.results[0].referencesSize && i < 10; ++i) {
                    UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                    
                    if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                        std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                       ref->displayName.text.length);
                        std::cout << "  - " << name << std::endl;
                        
                        // If ServerInterfaces found, browse HGU sensors
                        if (name == "ServerInterfaces") {
                            browseHGUSensors(ref->nodeId.nodeId);
                        }
                    }
                }
            }
            
            // Cleanup properly
            UA_BrowseRequest_clear(&bReq);
            UA_BrowseResponse_clear(&bResp);
            
            return true;
            
        } catch (...) {
            std::cout << "Exception during browse" << std::endl;
            return false;
        }
    }
    
    bool browseHGUSensors(const UA_NodeId& serverInterfacesId) {
        try {
            std::cout << "\\n  ==> Browsing HGU Sensors..." << std::endl;
            
            // Browse ServerInterfaces for HGU_Interface
            UA_BrowseRequest bReq;
            UA_BrowseRequest_init(&bReq);
            bReq.requestedMaxReferencesPerNode = 10;
            bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
            bReq.nodesToBrowseSize = 1;
            bReq.nodesToBrowse[0].nodeId = serverInterfacesId;
            bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
            
            UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
            
            if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
                // Look for HGU_Interface
                for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                    UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                    
                    if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                        std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                       ref->displayName.text.length);
                        
                        if (name == "HGU_Interface") {
                            std::cout << "    Found HGU_Interface!" << std::endl;
                            browseHGUInterface(ref->nodeId.nodeId);
                            break;
                        }
                    }
                }
            }
            
            UA_BrowseRequest_clear(&bReq);
            UA_BrowseResponse_clear(&bResp);
            return true;
            
        } catch (...) {
            std::cout << "Exception during HGU sensor browse" << std::endl;
            return false;
        }
    }
    
    bool browseHGUInterface(const UA_NodeId& hguInterfaceId) {
        try {
            std::cout << "    ==> Reading HGU Sensors:" << std::endl;
            
            UA_BrowseRequest bReq;
            UA_BrowseRequest_init(&bReq);
            bReq.requestedMaxReferencesPerNode = 20;  // More sensors
            bReq.nodesToBrowse = (UA_BrowseDescription*)UA_Array_new(1, &UA_TYPES[UA_TYPES_BROWSEDESCRIPTION]);
            bReq.nodesToBrowseSize = 1;
            bReq.nodesToBrowse[0].nodeId = hguInterfaceId;
            bReq.nodesToBrowse[0].resultMask = UA_BROWSERESULTMASK_DISPLAYNAME;
            
            UA_BrowseResponse bResp = UA_Client_Service_browse(client_, bReq);
            
            if (bResp.responseHeader.serviceResult == UA_STATUSCODE_GOOD) {
                std::cout << "    Found " << bResp.results[0].referencesSize << " HGU sensors:" << std::endl;
                
                for (size_t i = 0; i < bResp.results[0].referencesSize; ++i) {
                    UA_ReferenceDescription* ref = &(bResp.results[0].references[i]);
                    
                    if (ref->displayName.text.length > 0 && ref->displayName.text.data) {
                        std::string name(reinterpret_cast<char*>(ref->displayName.text.data), 
                                       ref->displayName.text.length);
                        std::cout << "      - " << name << std::endl;
                    }
                }
            }
            
            UA_BrowseRequest_clear(&bReq);
            UA_BrowseResponse_clear(&bResp);
            return true;
            
        } catch (...) {
            std::cout << "Exception during HGU interface browse" << std::endl;
            return false;
        }
    }
    
private:
    UA_Client* client_;
    bool connected_;
};

int main() {
    std::cout << "\\n========================================" << std::endl;
    std::cout << "   TUSAS HGU Safe OPC UA Test" << std::endl;
    std::cout << "========================================" << std::endl;
    
    SafeOPCUATestClient client;
    
    try {
        // Test PLCSIM endpoint
        std::string endpoint = "opc.tcp://192.168.0.1:4840";
        
        if (client.connect(endpoint)) {
            // Simple read test
            client.testSimpleRead();
            
            // Minimal browse test
            client.browseMinimal();
            
            std::cout << "\\n✓ Safe test completed successfully!" << std::endl;
        } else {
            std::cout << "\\n✗ Safe test failed - could not connect" << std::endl;
            return 1;
        }
        
    } catch (...) {
        std::cout << "\\nUnexpected exception in main" << std::endl;
        return 1;
    }
    
    return 0;
}