#pragma once

#include "common.hpp"

namespace tusas_hgu {

// Log levels
enum class LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
};

// Thread-safe logger class
class Logger {
private:
    static std::mutex logMutex_;
    static LogLevel currentLevel_;
    static bool logToFile_;
    static bool logToConsole_;
    static std::string logFilePath_;
    static std::ofstream logFile_;
    static std::atomic<uint64_t> logCounter_;
    
public:
    // Initialize logger
    static void initialize(const std::string& level = "INFO", 
                          bool toFile = true, 
                          const std::string& filePath = "logs/tusas_hgu_opcua.log");
    
    // Log methods
    template<typename... Args>
    static void trace(const std::string& format, Args&&... args) {
        log(LogLevel::TRACE, format, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void debug(const std::string& format, Args&&... args) {
        log(LogLevel::DEBUG, format, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void info(const std::string& format, Args&&... args) {
        log(LogLevel::INFO, format, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void warn(const std::string& format, Args&&... args) {
        log(LogLevel::WARN, format, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void error(const std::string& format, Args&&... args) {
        log(LogLevel::ERROR, format, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void fatal(const std::string& format, Args&&... args) {
        log(LogLevel::FATAL, format, std::forward<Args>(args)...);
    }
    
    // Set log level at runtime
    static void setLevel(LogLevel level);
    static void setLevel(const std::string& level);
    
    // Enable/disable outputs
    static void setFileLogging(bool enabled);
    static void setConsoleLogging(bool enabled);
    
    // Get log statistics
    static uint64_t getLogCount() { return logCounter_.load(); }
    
    // Cleanup
    static void shutdown();

private:
    // Core logging function
    template<typename... Args>
    static void log(LogLevel level, const std::string& format, Args&&... args) {
        if (level < currentLevel_) {
            return;
        }
        
        logCounter_.increment();
        
        std::lock_guard<std::mutex> lock(logMutex_);
        
        // Format message
        std::string message;
        if constexpr (sizeof...(args) > 0) {
            message = formatString(format, std::forward<Args>(args)...);
        } else {
            message = format;
        }
        
        // Create log entry
        std::string logEntry = formatLogEntry(level, message);
        
        // Output to console
        if (logToConsole_) {
            outputToConsole(level, logEntry);
        }
        
        // Output to file
        if (logToFile_ && logFile_.is_open()) {
            logFile_ << logEntry << std::endl;
            logFile_.flush();
        }
    }
    
    // String formatting
    template<typename... Args>
    static std::string formatString(const std::string& format, Args&&... args) {
        try {
            // Simple sprintf-style formatting
            int size = std::snprintf(nullptr, 0, format.c_str(), args...) + 1;
            if (size <= 0) {
                return format;
            }
            
            std::unique_ptr<char[]> buf(new char[size]);
            std::snprintf(buf.get(), size, format.c_str(), args...);
            return std::string(buf.get(), buf.get() + size - 1);
        } catch (...) {
            return format;
        }
    }
    
    // Format log entry with timestamp and level
    static std::string formatLogEntry(LogLevel level, const std::string& message);
    
    // Output to console with colors
    static void outputToConsole(LogLevel level, const std::string& logEntry);
    
    // Convert log level to string
    static std::string levelToString(LogLevel level);
    
    // Convert string to log level
    static LogLevel stringToLevel(const std::string& level);
    
    // Create log directory if it doesn't exist
    static bool createLogDirectory(const std::string& filePath);
};

// Static member definitions
std::mutex Logger::logMutex_;
LogLevel Logger::currentLevel_ = LogLevel::INFO;
bool Logger::logToFile_ = true;
bool Logger::logToConsole_ = true;
std::string Logger::logFilePath_;
std::ofstream Logger::logFile_;
std::atomic<uint64_t> Logger::logCounter_{0};

// Implementation
inline void Logger::initialize(const std::string& level, bool toFile, const std::string& filePath) {
    std::lock_guard<std::mutex> lock(logMutex_);
    
    currentLevel_ = stringToLevel(level);
    logToFile_ = toFile;
    logFilePath_ = filePath;
    
    if (logToFile_) {
        if (createLogDirectory(filePath)) {
            logFile_.open(filePath, std::ios::app);
            if (!logFile_.is_open()) {
                std::cerr << "Warning: Cannot open log file: " << filePath << std::endl;
                logToFile_ = false;
            }
        } else {
            logToFile_ = false;
        }
    }
    
    info("Logger initialized - Level: {}, File: {}, Console: {}", 
         levelToString(currentLevel_), logToFile_, logToConsole_);
}

inline void Logger::setLevel(LogLevel level) {
    currentLevel_ = level;
}

inline void Logger::setLevel(const std::string& level) {
    currentLevel_ = stringToLevel(level);
}

inline void Logger::setFileLogging(bool enabled) {
    logToFile_ = enabled;
}

inline void Logger::setConsoleLogging(bool enabled) {
    logToConsole_ = enabled;
}

inline void Logger::shutdown() {
    std::lock_guard<std::mutex> lock(logMutex_);
    if (logFile_.is_open()) {
        logFile_.close();
    }
}

inline std::string Logger::formatLogEntry(LogLevel level, const std::string& message) {
    std::ostringstream ss;
    ss << "[" << getCurrentTimeString() << "] "
       << "[" << levelToString(level) << "] "
       << message;
    return ss.str();
}

inline void Logger::outputToConsole(LogLevel level, const std::string& logEntry) {
    switch (level) {
        case LogLevel::ERROR:
        case LogLevel::FATAL:
            std::cerr << logEntry << std::endl;
            break;
        default:
            std::cout << logEntry << std::endl;
            break;
    }
}

inline std::string Logger::levelToString(LogLevel level) {
    switch (level) {
        case LogLevel::TRACE: return "TRACE";
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO:  return "INFO ";
        case LogLevel::WARN:  return "WARN ";
        case LogLevel::ERROR: return "ERROR";
        case LogLevel::FATAL: return "FATAL";
        default:              return "UNKN ";
    }
}

inline LogLevel Logger::stringToLevel(const std::string& level) {
    std::string upperLevel = level;
    std::transform(upperLevel.begin(), upperLevel.end(), upperLevel.begin(), ::toupper);
    
    if (upperLevel == "TRACE") return LogLevel::TRACE;
    if (upperLevel == "DEBUG") return LogLevel::DEBUG;
    if (upperLevel == "INFO")  return LogLevel::INFO;
    if (upperLevel == "WARN")  return LogLevel::WARN;
    if (upperLevel == "ERROR") return LogLevel::ERROR;
    if (upperLevel == "FATAL") return LogLevel::FATAL;
    
    return LogLevel::INFO; // Default
}

inline bool Logger::createLogDirectory(const std::string& filePath) {
    size_t pos = filePath.find_last_of("/\\");
    if (pos == std::string::npos) {
        return true; // No directory in path
    }
    
    std::string directory = filePath.substr(0, pos);
    
#ifdef _WIN32
    return CreateDirectoryA(directory.c_str(), nullptr) || GetLastError() == ERROR_ALREADY_EXISTS;
#else
    return mkdir(directory.c_str(), 0755) == 0 || errno == EEXIST;
#endif
}

} // namespace tusas_hgu