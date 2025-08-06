#include <iostream>
#include <string>
#include <vector>
#include <curl/curl.h>
#include <open62541/client.h>
#include <open62541/client_config_default.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* response) {
    size_t totalSize = size * nmemb;
    response->append((char*)contents, totalSize);
    return totalSize;
}

int main() {
    std::cout << "🏭 TUSAS HGU Minimal Production Client" << std::endl;
    
    // Initialize
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    UA_Client* client = UA_Client_new();
    if (!client) {
        std::cout << "❌ Failed to create client" << std::endl;
        return 1;
    }
    
    UA_ClientConfig_setDefault(UA_Client_getConfig(client));
    
    // Connect
    std::cout << "🔄 Connecting to PLCSIM..." << std::endl;
    UA_StatusCode retval = UA_Client_connect(client, "opc.tcp://192.168.0.1:4840");
    
    if (retval != UA_STATUSCODE_GOOD) {
        std::cout << "❌ Connection failed" << std::endl;
        UA_Client_delete(client);
        return 1;
    }
    
    std::cout << "✅ Connected!" << std::endl;
    
    // Setup sensors (from A1.xml)
    struct {
        const char* name;
        int nodeId;
    } sensors[] = {
        {"Pressure_Supply", 2},
        {"Temperature_Oil_Tank", 3},
        {"Pump_Status", 4},
        {"Flow_Rate_Supply", 5},
        {"System_Running", 6},
        {"System_Ready", 7}
    };
    
    int sensorCount = sizeof(sensors) / sizeof(sensors[0]);
    
    std::cout << "🔄 Starting data collection..." << std::endl;
    
    int cycle = 0;
    int successfulWrites = 0;
    
    while (true) {
        cycle++;
        
        // Build InfluxDB data
        std::string postData;
        int validSensors = 0;
        
        for (int i = 0; i < sensorCount; i++) {
            // Read sensor
            UA_NodeId nodeId = UA_NODEID_NUMERIC(2, sensors[i].nodeId);
            
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
                response.results && response.results[0].hasValue) {
                
                UA_Variant* value = &response.results[0].value;
                double doubleValue = 0.0;
                bool hasValue = false;
                
                if (value->type == &UA_TYPES[UA_TYPES_DOUBLE]) {
                    doubleValue = *(UA_Double*)value->data;
                    hasValue = true;
                } else if (value->type == &UA_TYPES[UA_TYPES_FLOAT]) {
                    doubleValue = (double)(*(UA_Float*)value->data);
                    hasValue = true;
                } else if (value->type == &UA_TYPES[UA_TYPES_BOOLEAN]) {
                    doubleValue = (*(UA_Boolean*)value->data) ? 1.0 : 0.0;
                    hasValue = true;
                }
                
                if (hasValue) {
                    postData += "hgu_real_data,sensor_id=";
                    postData += sensors[i].name;
                    postData += ",location=PLCSIM,equipment=hgu_main,source=opcua_cpp value=";
                    postData += std::to_string(doubleValue);
                    postData += "\\n";
                    validSensors++;
                }
            }
            
            UA_ReadResponse_clear(&response);
        }
        
        // Send to InfluxDB
        if (validSensors > 0) {
            CURL* curl = curl_easy_init();
            if (curl) {
                std::string url = "http://localhost:8086/api/v2/write?org=tusas&bucket=tusas_hgu";
                curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
                
                struct curl_slist* headers = nullptr;
                headers = curl_slist_append(headers, "Content-Type: text/plain; charset=utf-8");
                headers = curl_slist_append(headers, "Authorization: Token 87zzaBVQnKrHP2j8NNtXWZe_5CuvhcEzUONmltOz9ljJrgSMbvmAXQw6YuLPN_vz5dv6gEUiGLdxeLTdFqz_nA==");
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
                
                std::string response;
                curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
                curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
                
                CURLcode res = curl_easy_perform(curl);
                long responseCode;
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
                
                if (res == CURLE_OK && responseCode >= 200 && responseCode < 300) {
                    successfulWrites++;
                }
                
                curl_slist_free_all(headers);
                curl_easy_cleanup(curl);
            }
        }
        
        // Progress
        if (cycle % 10 == 0) {
            std::cout << "📊 Cycle " << cycle << ": " << validSensors 
                      << " sensors, " << successfulWrites << " writes" << std::endl;
        }
        
        // Sleep 1 second
#ifdef _WIN32
        Sleep(1000);
#else
        sleep(1);
#endif
    }
    
    // Cleanup
    UA_Client_disconnect(client);
    UA_Client_delete(client);
    curl_global_cleanup();
    
    return 0;
}