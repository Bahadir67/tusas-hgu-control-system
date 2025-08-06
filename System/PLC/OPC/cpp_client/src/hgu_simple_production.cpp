#include <iostream>
#include <string>
#include <vector>
#include <curl/curl.h>
#include <open62541/client.h>
#include <open62541/client_config_default.h>

#ifdef _WIN32
#include <windows.h>
#define SLEEP_MS(x) Sleep(x)
#else
#include <unistd.h>
#define SLEEP_MS(x) usleep((x)*1000)
#endif

// Simple sensor struct
struct SimpleSensor {
    std::string name;
    UA_NodeId nodeId;
    bool valid;
};

// Callback for curl response
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* response) {
    size_t totalSize = size * nmemb;
    response->append((char*)contents, totalSize);
    return totalSize;
}

class HGUSimpleProduction {
public:
    HGUSimpleProduction() : client_(nullptr), connected_(false) {
        curl_global_init(CURL_GLOBAL_DEFAULT);
        std::cout << "🏭 TUSAS HGU Simple Production Client" << std::endl;
    }
    
    ~HGUSimpleProduction() {
        disconnect();
        curl_global_cleanup();
    }
    
    bool connect() {
        client_ = UA_Client_new();
        if (!client_) {
            std::cout << "❌ Failed to create client" << std::endl;
            return false;
        }
        
        UA_ClientConfig_setDefault(UA_Client_getConfig(client_));
        
        std::cout << "🔄 Connecting..." << std::endl;
        UA_StatusCode retval = UA_Client_connect(client_, "opc.tcp://192.168.0.1:4840");
        
        if (retval != UA_STATUSCODE_GOOD) {
            std::cout << "❌ Connection failed" << std::endl;
            UA_Client_delete(client_);
            client_ = nullptr;
            return false;
        }
        
        connected_ = true;
        std::cout << "✅ Connected successfully!" << std::endl;
        return true;
    }
    
    void disconnect() {
        if (client_ && connected_) {
            UA_Client_disconnect(client_);
            UA_Client_delete(client_);
            client_ = nullptr;
            connected_ = false;
            std::cout << "✅ Disconnected" << std::endl;
        }
    }
    
    bool discoverSensors() {
        if (!connected_) return false;
        
        std::cout << "🔍 Discovering sensors..." << std::endl;
        
        // Hardcode known sensor NodeIds from TIA Portal export
        // These are from the A1.xml file we saw earlier
        addSensor("Pressure_Supply", "ns=2;i=2");
        addSensor("Temperature_Oil_Tank", "ns=2;i=3");
        addSensor("Pump_Status", "ns=2;i=4");
        addSensor("Flow_Rate_Supply", "ns=2;i=5");
        addSensor("System_Running", "ns=2;i=6");
        addSensor("System_Ready", "ns=2;i=7");
        
        std::cout << "✅ Found " << sensors_.size() << " sensors" << std::endl;
        return sensors_.size() > 0;
    }
    
    void runDataCollection() {
        if (sensors_.empty()) {
            std::cout << "❌ No sensors available" << std::endl;
            return;
        }
        
        std::cout << "🚀 Starting data collection..." << std::endl;
        std::cout << "Press Ctrl+C to stop" << std::endl;
        
        int cycle = 0;
        int successfulWrites = 0;
        
        while (true) {
            cycle++;
            
            // Read all sensors
            std::vector<std::string> dataLines;
            bool hasData = false;
            
            for (size_t i = 0; i < sensors_.size(); i++) {
                double value;
                if (readSensor(sensors_[i], value)) {
                    std::string line = buildLineProtocol(sensors_[i].name, value);
                    dataLines.push_back(line);
                    hasData = true;
                }
            }
            
            // Write to InfluxDB
            if (hasData && writeToInflux(dataLines)) {
                successfulWrites++;
            }
            
            // Progress display every 10 cycles
            if (cycle % 10 == 0) {
                std::cout << "📊 Cycle " << cycle << ": " << dataLines.size() 
                          << " sensors, " << successfulWrites << " writes" << std::endl;
                
                // Show first few values
                for (size_t i = 0; i < 3 && i < dataLines.size(); i++) {
                    std::cout << "   " << sensors_[i].name << std::endl;
                }
            }
            
            // Sleep 1 second
            SLEEP_MS(1000);
        }
    }
    
private:
    void addSensor(const std::string& name, const std::string& nodeIdStr) {
        SimpleSensor sensor;
        sensor.name = name;
        sensor.valid = true;
        
        // Parse simple NodeId format "ns=2;i=2"
        if (nodeIdStr.find("ns=2;i=") == 0) {
            int nodeInt = std::stoi(nodeIdStr.substr(7));
            sensor.nodeId = UA_NODEID_NUMERIC(2, nodeInt);
        } else {
            sensor.valid = false;
        }
        
        sensors_.push_back(sensor);
    }
    
    bool readSensor(const SimpleSensor& sensor, double& result) {
        if (!sensor.valid) return false;
        
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
            response.results && response.results[0].hasValue) {
            
            UA_Variant* value = &response.results[0].value;
            
            if (value->type == &UA_TYPES[UA_TYPES_DOUBLE]) {
                result = *(UA_Double*)value->data;
                success = true;
            } else if (value->type == &UA_TYPES[UA_TYPES_FLOAT]) {
                result = (double)(*(UA_Float*)value->data);
                success = true;
            } else if (value->type == &UA_TYPES[UA_TYPES_BOOLEAN]) {
                result = (*(UA_Boolean*)value->data) ? 1.0 : 0.0;
                success = true;
            }
        }
        
        UA_ReadResponse_clear(&response);
        return success;
    }
    
    std::string buildLineProtocol(const std::string& sensorName, double value) {
        // Build InfluxDB line protocol
        std::string line = "hgu_real_data,sensor_id=" + sensorName + 
                          ",location=PLCSIM,equipment=hgu_main,source=opcua_cpp ";
        line += "value=" + std::to_string(value);
        return line;
    }
    
    bool writeToInflux(const std::vector<std::string>& dataLines) {
        CURL* curl = curl_easy_init();
        if (!curl) return false;
        
        // Build POST data
        std::string postData;
        for (size_t i = 0; i < dataLines.size(); i++) {
            postData += dataLines[i] + "\\n";
        }
        
        // Set URL
        std::string url = "http://localhost:8086/api/v2/write?org=tusas&bucket=tusas_hgu";
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        
        // Set headers
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: text/plain; charset=utf-8");
        headers = curl_slist_append(headers, "Authorization: Token 87zzaBVQnKrHP2j8NNtXWZe_5CuvhcEzUONmltOz9ljJrgSMbvmAXQw6YuLPN_vz5dv6gEUiGLdxeLTdFqz_nA==");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        
        // Set POST data
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
        
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
    }
    
    UA_Client* client_;
    bool connected_;
    std::vector<SimpleSensor> sensors_;
};

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "🏭 TUSAS HGU Simple Production v1.0" << std::endl;
    std::cout << "========================================" << std::endl;
    
    HGUSimpleProduction client;
    
    if (!client.connect()) {
        return 1;
    }
    
    if (!client.discoverSensors()) {
        return 1;
    }
    
    client.runDataCollection();
    
    return 0;
}