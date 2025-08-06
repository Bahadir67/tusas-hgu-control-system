#include "../include/common.hpp"
#include "../include/config.hpp"
#include "../include/logger.hpp"
#include "../include/opcua_client.hpp"
#include "../include/data_manager.hpp"
#include "../include/influxdb_writer.hpp"
#include "../include/service.hpp"

#ifdef _WIN32
#include <conio.h>
#include <signal.h>
#else
#include <signal.h>
#include <unistd.h>
#endif

using namespace tusas_hgu;

// Global variables for signal handling
std::atomic<bool> g_running{true};
std::unique_ptr<OPCUAClient> g_opcua_client;
std::unique_ptr<DataManager> g_data_manager;
std::unique_ptr<InfluxDBWriter> g_influx_writer;

// Signal handler for graceful shutdown
void signalHandler(int signal) {
    Logger::info("Received signal {}, initiating graceful shutdown...", signal);
    g_running = false;
    
    if (g_opcua_client) {
        g_opcua_client->stop();
    }
}

// Display banner
void displayBanner() {
    std::cout << "\n";
    std::cout << "========================================\n";
    std::cout << "   TUSAS HGU OPC UA Client v1.0.0     \n";
    std::cout << "   High-Performance Industrial Client  \n";
    std::cout << "========================================\n";
    std::cout << "Target: Siemens S7-1500 PLC\n";
    std::cout << "Protocol: OPC UA (open62541)\n";
    std::cout << "Database: InfluxDB Line Protocol\n";
    std::cout << "Performance: 10,000+ tags/second\n";
    std::cout << "========================================\n\n";
}

// Display configuration summary
void displayConfiguration(const Config& config) {
    Logger::info("Configuration Summary:");
    Logger::info("  OPC UA Endpoint: {}", config.getOPCUAEndpoint());
    Logger::info("  InfluxDB URL: {}", config.getInfluxDBUrl());
    Logger::info("  Scan Interval: {}ms", config.getScanInterval());
    Logger::info("  Worker Threads: {}", config.getWorkerThreads());
    Logger::info("  Batch Size: {}", config.getBatchSize());
    Logger::info("  Security Mode: {}", config.getSecurityMode());
    Logger::info("  Log Level: {}", config.getLogLevel());
}

// Display real-time statistics
void displayStatistics(const PerformanceMetrics& metrics) {
    static auto lastDisplay = std::chrono::steady_clock::now();
    auto now = std::chrono::steady_clock::now();
    
    // Update every 30 seconds
    if (std::chrono::duration_cast<std::chrono::seconds>(now - lastDisplay).count() >= 30) {
        std::cout << "\n=== Performance Statistics ===\n";
        std::cout << "Total Samples: " << metrics.totalSamples.get() << "\n";
        std::cout << "Successful Writes: " << metrics.successfulWrites.get() << "\n";
        std::cout << "Failed Writes: " << metrics.failedWrites.get() << "\n";
        std::cout << "Reconnects: " << metrics.reconnects.get() << "\n";
        std::cout << "Avg Latency: " << std::fixed << std::setprecision(2) 
                  << metrics.avgLatency.load() << "ms\n";
        
        double successRate = 0.0;
        auto total = metrics.totalSamples.get();
        if (total > 0) {
            successRate = (double)metrics.successfulWrites.get() / total * 100.0;
        }
        std::cout << "Success Rate: " << std::fixed << std::setprecision(1) 
                  << successRate << "%\n";
        std::cout << "==============================\n\n";
        
        lastDisplay = now;
    }
}

// Main application logic
int runApplication(const Config& config) {
    try {
        Logger::info("Initializing TUSAS HGU OPC UA Client...");
        
        // Create components
        g_data_manager = std::make_unique<DataManager>(config);
        g_influx_writer = std::make_unique<InfluxDBWriter>(config);
        g_opcua_client = std::make_unique<OPCUAClient>(config, *g_data_manager);
        
        // Initialize components
        if (!g_influx_writer->initialize()) {
            Logger::error("Failed to initialize InfluxDB writer");
            return static_cast<int>(ErrorCode::INFLUXDB_CONNECTION_ERROR);
        }
        
        if (!g_data_manager->initialize()) {
            Logger::error("Failed to initialize data manager");
            return static_cast<int>(ErrorCode::GENERIC_ERROR);
        }
        
        if (!g_opcua_client->initialize()) {
            Logger::error("Failed to initialize OPC UA client");
            return static_cast<int>(ErrorCode::OPCUA_CONNECTION_ERROR);
        }
        
        // Connect to InfluxDB
        if (!g_influx_writer->connect()) {
            Logger::error("Failed to connect to InfluxDB");
            return static_cast<int>(ErrorCode::INFLUXDB_CONNECTION_ERROR);
        }
        
        // Connect to OPC UA server
        if (!g_opcua_client->connect()) {
            Logger::error("Failed to connect to OPC UA server");
            return static_cast<int>(ErrorCode::OPCUA_CONNECTION_ERROR);
        }
        
        // Start data collection
        Logger::info("Starting data collection...");
        g_opcua_client->start();
        
        // Set up data flow: OPC UA -> Data Manager -> InfluxDB
        g_data_manager->setDataWriter(g_influx_writer.get());
        
        Logger::info("System started successfully");
        Logger::info("Press Ctrl+C to stop gracefully");
        
        // Main loop
        auto lastHeartbeat = std::chrono::steady_clock::now();
        
        while (g_running) {
            // Check system health
            auto now = std::chrono::steady_clock::now();
            if (std::chrono::duration_cast<std::chrono::seconds>(now - lastHeartbeat).count() >= 60) {
                Logger::info("System heartbeat - Status: Running");
                lastHeartbeat = now;
            }
            
            // Display statistics
            displayStatistics(g_data_manager->getMetrics());
            
            // Check for console input (Windows)
#ifdef _WIN32
            if (_kbhit()) {
                char ch = _getch();
                if (ch == 'q' || ch == 'Q') {
                    Logger::info("User requested shutdown");
                    break;
                }
                if (ch == 's' || ch == 'S') {
                    displayStatistics(g_data_manager->getMetrics());
                }
            }
#endif
            
            // Sleep for a short time
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        Logger::info("Shutting down gracefully...");
        
        // Stop components in reverse order
        if (g_opcua_client) {
            g_opcua_client->stop();
            g_opcua_client->disconnect();
        }
        
        if (g_data_manager) {
            g_data_manager->shutdown();
        }
        
        if (g_influx_writer) {
            g_influx_writer->disconnect();
        }
        
        Logger::info("Shutdown completed successfully");
        return static_cast<int>(ErrorCode::SUCCESS);
        
    } catch (const std::exception& e) {
        Logger::error("Application error: {}", e.what());
        return static_cast<int>(ErrorCode::GENERIC_ERROR);
    } catch (...) {
        Logger::error("Unknown application error");
        return static_cast<int>(ErrorCode::GENERIC_ERROR);
    }
}

// Console application entry point
int consoleMain(int argc, char* argv[]) {
    displayBanner();
    
    // Parse command line arguments
    std::string configFile = "config/config.json";
    if (argc > 1) {
        configFile = argv[1];
    }
    
    try {
        // Load configuration
        Logger::info("Loading configuration from: {}", configFile);
        Config config(configFile);
        
        // Initialize logger with configuration
        Logger::initialize(config.getLogLevel(), config.getLogToFile(), 
                          config.getLogFilePath());
        
        displayConfiguration(config);
        
        // Set up signal handlers
        signal(SIGINT, signalHandler);
        signal(SIGTERM, signalHandler);
#ifdef _WIN32
        signal(SIGBREAK, signalHandler);
#endif
        
        // Run the application
        return runApplication(config);
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return static_cast<int>(ErrorCode::CONFIG_ERROR);
    }
}

// Windows service entry point
#ifdef _WIN32
int serviceMain() {
    try {
        WindowsService service("TusasHguOpcClient", "TUSAS HGU OPC UA Client");
        return service.run();
    } catch (const std::exception& e) {
        Logger::error("Service error: {}", e.what());
        return static_cast<int>(ErrorCode::GENERIC_ERROR);
    }
}
#endif

// Main entry point
int main(int argc, char* argv[]) {
    // Initialize COM on Windows
#ifdef _WIN32
    CoInitializeEx(nullptr, COINIT_MULTITHREADED);
#endif
    
    int result = 0;
    
    // Check if running as Windows service
#ifdef _WIN32
    if (argc > 1 && (strcmp(argv[1], "--service") == 0 || strcmp(argv[1], "-s") == 0)) {
        result = serviceMain();
    } else {
        result = consoleMain(argc, argv);
    }
#else
    result = consoleMain(argc, argv);
#endif
    
    // Cleanup COM on Windows
#ifdef _WIN32
    CoUninitialize();
#endif
    
    return result;
}