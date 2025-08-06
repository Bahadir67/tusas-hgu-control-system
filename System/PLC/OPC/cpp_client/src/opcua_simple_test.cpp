#include <iostream>
#include <string>
#include <open62541/client.h>
#include <open62541/client_config_default.h>

int main() {
    std::cout << "\n========================================" << std::endl;
    std::cout << "   TUSAS HGU Ultra-Safe OPC UA Test" << std::endl;
    std::cout << "========================================" << std::endl;
    
    UA_Client* client = nullptr;
    
    try {
        // Create client
        client = UA_Client_new();
        if (!client) {
            std::cout << "Failed to create client" << std::endl;
            return 1;
        }
        
        UA_ClientConfig_setDefault(UA_Client_getConfig(client));
        
        // Connect
        std::cout << "Connecting to PLCSIM..." << std::endl;
        UA_StatusCode retval = UA_Client_connect(client, "opc.tcp://192.168.0.1:4840");
        
        if (retval != UA_STATUSCODE_GOOD) {
            std::cout << "Connection failed: " << UA_StatusCode_name(retval) << std::endl;
            UA_Client_delete(client);
            return 1;
        }
        
        std::cout << "✓ Connected successfully!" << std::endl;
        
        // Simple test - read server time
        std::cout << "\nTesting basic read operation..." << std::endl;
        
        UA_Variant value;
        UA_Variant_init(&value);
        
        // Try to read server time (safe node)
        UA_NodeId nodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_SERVER_SERVERSTATUS_CURRENTTIME);
        
        // Use the low-level read service
        UA_ReadValueId rvi;
        UA_ReadValueId_init(&rvi);
        rvi.nodeId = nodeId;
        rvi.attributeId = UA_ATTRIBUTEID_VALUE;
        
        UA_ReadRequest request;
        UA_ReadRequest_init(&request);
        request.nodesToRead = &rvi;
        request.nodesToReadSize = 1;
        
        UA_ReadResponse response = UA_Client_Service_read(client, request);
        
        if (response.responseHeader.serviceResult == UA_STATUSCODE_GOOD &&
            response.results[0].hasValue) {
            std::cout << "✓ Basic read operation successful!" << std::endl;
        } else {
            std::cout << "✗ Read operation failed" << std::endl;
        }
        
        // Cleanup
        UA_ReadResponse_clear(&response);
        
        // Disconnect
        UA_Client_disconnect(client);
        std::cout << "✓ Disconnected safely" << std::endl;
        
    } catch (...) {
        std::cout << "Exception occurred!" << std::endl;
        if (client) {
            UA_Client_disconnect(client);
        }
    }
    
    // Always cleanup
    if (client) {
        UA_Client_delete(client);
    }
    
    std::cout << "\n✓ Test completed without crashes!" << std::endl;
    return 0;
}