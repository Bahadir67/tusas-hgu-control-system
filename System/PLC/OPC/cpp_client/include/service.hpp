#pragma once

#include "common.hpp"

#ifdef _WIN32

namespace tusas_hgu {

// Windows Service implementation
class WindowsService {
private:
    std::string serviceName_;
    std::string displayName_;
    SERVICE_STATUS_HANDLE statusHandle_;
    SERVICE_STATUS status_;
    std::atomic<bool> running_;
    
    // Static instance for service callbacks
    static WindowsService* instance_;
    
public:
    WindowsService(const std::string& serviceName, const std::string& displayName);
    ~WindowsService();
    
    // Service control
    int run();
    void stop();
    
    // Installation
    static bool install(const std::string& serviceName, const std::string& displayName, 
                       const std::string& executablePath);
    static bool uninstall(const std::string& serviceName);
    
    // Service status
    bool isInstalled() const;
    bool isRunning() const;
    
private:
    // Service main function
    static void WINAPI serviceMain(DWORD argc, LPTSTR* argv);
    static void WINAPI serviceCtrlHandler(DWORD ctrl);
    
    // Internal methods
    void serviceWorker();
    void reportServiceStatus(DWORD currentState, DWORD win32ExitCode, DWORD waitHint);
    void writeEventLog(const std::string& message, WORD type = EVENTLOG_INFORMATION_TYPE);
    
    // Application-specific service logic
    bool initializeService();
    void runServiceLoop();
    void cleanupService();
};

// Static instance
WindowsService* WindowsService::instance_ = nullptr;

// Implementation
inline WindowsService::WindowsService(const std::string& serviceName, const std::string& displayName)
    : serviceName_(serviceName), displayName_(displayName), statusHandle_(nullptr), running_(false) {
    
    // Initialize service status
    status_.dwServiceType = SERVICE_WIN32_OWN_PROCESS;
    status_.dwCurrentState = SERVICE_STOPPED;
    status_.dwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN;
    status_.dwWin32ExitCode = 0;
    status_.dwServiceSpecificExitCode = 0;
    status_.dwCheckPoint = 0;
    status_.dwWaitHint = 0;
    
    instance_ = this;
}

inline WindowsService::~WindowsService() {
    instance_ = nullptr;
}

inline int WindowsService::run() {
    SERVICE_TABLE_ENTRY serviceTable[] = {
        { const_cast<LPSTR>(serviceName_.c_str()), serviceMain },
        { nullptr, nullptr }
    };
    
    if (!StartServiceCtrlDispatcher(serviceTable)) {
        DWORD error = GetLastError();
        if (error == ERROR_FAILED_SERVICE_CONTROLLER_CONNECT) {
            // Running as console application
            Logger::info("Running as console application (not as service)");
            return 0; // This should be handled by the console main
        } else {
            Logger::error("StartServiceCtrlDispatcher failed: {}", error);
            return 1;
        }
    }
    
    return 0;
}

inline void WindowsService::stop() {
    running_ = false;
    reportServiceStatus(SERVICE_STOPPED, NO_ERROR, 0);
}

inline bool WindowsService::install(const std::string& serviceName, const std::string& displayName, 
                                   const std::string& executablePath) {
    SC_HANDLE scManager = OpenSCManager(nullptr, nullptr, SC_MANAGER_CREATE_SERVICE);
    if (!scManager) {
        Logger::error("OpenSCManager failed: {}", GetLastError());
        return false;
    }
    
    std::string commandLine = "\"" + executablePath + "\" --service";
    
    SC_HANDLE service = CreateServiceA(
        scManager,
        serviceName.c_str(),
        displayName.c_str(),
        SERVICE_ALL_ACCESS,
        SERVICE_WIN32_OWN_PROCESS,
        SERVICE_AUTO_START,
        SERVICE_ERROR_NORMAL,
        commandLine.c_str(),
        nullptr,
        nullptr,
        nullptr,
        nullptr,
        nullptr
    );
    
    bool success = (service != nullptr);
    
    if (!success) {
        DWORD error = GetLastError();
        if (error == ERROR_SERVICE_EXISTS) {
            Logger::info("Service already exists: {}", serviceName);
            success = true;
        } else {
            Logger::error("CreateService failed: {}", error);
        }
    } else {
        Logger::info("Service installed successfully: {}", serviceName);
        
        // Set service description
        SERVICE_DESCRIPTION desc;
        std::string description = "TUSAS HGU OPC UA Client - Industrial automation data collection service";
        desc.lpDescription = const_cast<LPSTR>(description.c_str());
        ChangeServiceConfig2A(service, SERVICE_CONFIG_DESCRIPTION, &desc);
    }
    
    if (service) CloseServiceHandle(service);
    CloseServiceHandle(scManager);
    
    return success;
}

inline bool WindowsService::uninstall(const std::string& serviceName) {
    SC_HANDLE scManager = OpenSCManager(nullptr, nullptr, SC_MANAGER_CONNECT);
    if (!scManager) {
        Logger::error("OpenSCManager failed: {}", GetLastError());
        return false;
    }
    
    SC_HANDLE service = OpenServiceA(scManager, serviceName.c_str(), DELETE);
    if (!service) {
        Logger::error("OpenService failed: {}", GetLastError());
        CloseServiceHandle(scManager);
        return false;
    }
    
    bool success = DeleteService(service) != 0;
    
    if (success) {
        Logger::info("Service uninstalled successfully: {}", serviceName);
    } else {
        Logger::error("DeleteService failed: {}", GetLastError());
    }
    
    CloseServiceHandle(service);
    CloseServiceHandle(scManager);
    
    return success;
}

inline bool WindowsService::isInstalled() const {
    SC_HANDLE scManager = OpenSCManager(nullptr, nullptr, SC_MANAGER_CONNECT);
    if (!scManager) {
        return false;
    }
    
    SC_HANDLE service = OpenServiceA(scManager, serviceName_.c_str(), SERVICE_QUERY_STATUS);
    bool installed = (service != nullptr);
    
    if (service) CloseServiceHandle(service);
    CloseServiceHandle(scManager);
    
    return installed;
}

inline bool WindowsService::isRunning() const {
    return running_.load();
}

inline void WINAPI WindowsService::serviceMain(DWORD argc, LPTSTR* argv) {
    if (!instance_) {
        return;
    }
    
    // Register control handler
    instance_->statusHandle_ = RegisterServiceCtrlHandlerA(
        instance_->serviceName_.c_str(), 
        serviceCtrlHandler
    );
    
    if (!instance_->statusHandle_) {
        instance_->writeEventLog("RegisterServiceCtrlHandler failed", EVENTLOG_ERROR_TYPE);
        return;
    }
    
    // Report initial status
    instance_->reportServiceStatus(SERVICE_START_PENDING, NO_ERROR, 3000);
    
    // Start service worker thread
    std::thread workerThread(&WindowsService::serviceWorker, instance_);
    
    // Wait for worker thread to complete
    if (workerThread.joinable()) {
        workerThread.join();
    }
}

inline void WINAPI WindowsService::serviceCtrlHandler(DWORD ctrl) {
    if (!instance_) {
        return;
    }
    
    switch (ctrl) {
        case SERVICE_CONTROL_STOP:
        case SERVICE_CONTROL_SHUTDOWN:
            instance_->writeEventLog("Service stop requested");
            instance_->reportServiceStatus(SERVICE_STOP_PENDING, NO_ERROR, 5000);
            instance_->stop();
            break;
        
        case SERVICE_CONTROL_INTERROGATE:
            instance_->reportServiceStatus(instance_->status_.dwCurrentState, NO_ERROR, 0);
            break;
        
        default:
            break;
    }
}

inline void WindowsService::serviceWorker() {
    try {
        // Initialize service
        if (!initializeService()) {
            writeEventLog("Service initialization failed", EVENTLOG_ERROR_TYPE);
            reportServiceStatus(SERVICE_STOPPED, 1, 0);
            return;
        }
        
        // Report running status
        running_ = true;
        reportServiceStatus(SERVICE_RUNNING, NO_ERROR, 0);
        writeEventLog("Service started successfully");
        
        // Run main service loop
        runServiceLoop();
        
        // Cleanup
        cleanupService();
        writeEventLog("Service stopped");
        
    } catch (const std::exception& e) {
        std::string message = "Service error: " + std::string(e.what());
        writeEventLog(message, EVENTLOG_ERROR_TYPE);
        reportServiceStatus(SERVICE_STOPPED, 1, 0);
    }
}

inline void WindowsService::reportServiceStatus(DWORD currentState, DWORD win32ExitCode, DWORD waitHint) {
    static DWORD checkPoint = 1;
    
    status_.dwCurrentState = currentState;
    status_.dwWin32ExitCode = win32ExitCode;
    status_.dwWaitHint = waitHint;
    
    if (currentState == SERVICE_START_PENDING) {
        status_.dwControlsAccepted = 0;
    } else {
        status_.dwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN;
    }
    
    if (currentState == SERVICE_RUNNING || currentState == SERVICE_STOPPED) {
        status_.dwCheckPoint = 0;
    } else {
        status_.dwCheckPoint = checkPoint++;
    }
    
    SetServiceStatus(statusHandle_, &status_);
}

inline void WindowsService::writeEventLog(const std::string& message, WORD type) {
    HANDLE eventSource = RegisterEventSourceA(nullptr, serviceName_.c_str());
    if (eventSource) {
        const char* strings[] = { message.c_str() };
        ReportEventA(eventSource, type, 0, 0, nullptr, 1, 0, strings, nullptr);
        DeregisterEventSource(eventSource);
    }
    
    // Also log to our logger if initialized
    switch (type) {
        case EVENTLOG_ERROR_TYPE:
            Logger::error("Service: {}", message);
            break;
        case EVENTLOG_WARNING_TYPE:
            Logger::warn("Service: {}", message);
            break;
        default:
            Logger::info("Service: {}", message);
            break;
    }
}

inline bool WindowsService::initializeService() {
    try {
        // Initialize logger for service
        Logger::initialize("INFO", true, "logs/tusas_hgu_service.log");
        Logger::info("Initializing TUSAS HGU OPC UA Service...");
        
        // TODO: Initialize the actual OPC UA client application here
        // This would involve creating Config, DataManager, InfluxDBWriter, OPCUAClient
        // For now, just return true to indicate successful initialization
        
        return true;
        
    } catch (const std::exception& e) {
        Logger::error("Service initialization failed: {}", e.what());
        return false;
    }
}

inline void WindowsService::runServiceLoop() {
    Logger::info("Service main loop started");
    
    // Main service loop
    while (running_.load()) {
        try {
            // TODO: Run the OPC UA client application main loop here
            // This should be the same logic as in the console application
            
            // For now, just sleep to simulate work
            std::this_thread::sleep_for(std::chrono::seconds(1));
            
            // Check if service should stop
            if (!running_.load()) {
                break;
            }
            
        } catch (const std::exception& e) {
            Logger::error("Service loop error: {}", e.what());
            
            // In case of critical error, stop the service
            running_ = false;
            break;
        }
    }
    
    Logger::info("Service main loop stopped");
}

inline void WindowsService::cleanupService() {
    Logger::info("Cleaning up service resources...");
    
    // TODO: Cleanup OPC UA client resources here
    // Stop data collection, disconnect from servers, close files, etc.
    
    Logger::info("Service cleanup completed");
    Logger::shutdown();
}

} // namespace tusas_hgu

#endif // _WIN32