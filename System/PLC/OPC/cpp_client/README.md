# TUSAS HGU C++ OPC UA Client

High-performance OPC UA client for industrial automation system.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S7-1500 PLC   │    │  C++ OPC Client │    │    InfluxDB     │
│                 │────│                 │────│                 │
│  opc.tcp:4840   │    │  Multi-threaded │    │  Line Protocol │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Performance Targets

- **Throughput**: 10,000+ tags/second
- **Latency**: <5ms end-to-end
- **Memory**: <100MB RAM usage
- **Reliability**: 99.9% uptime

## Components

### 1. OPC UA Client (`opcua_client.hpp`)
- open62541 library integration
- Subscription-based data collection
- Automatic reconnection logic
- Certificate management

### 2. Data Manager (`data_manager.hpp`)
- Thread-safe data structures
- Batch processing (100 samples/batch)
- Quality validation
- Timestamp synchronization

### 3. InfluxDB Writer (`influxdb_writer.hpp`)
- Direct Line Protocol implementation
- HTTP/HTTPS support
- Connection pooling
- Retry logic with exponential backoff

### 4. Configuration (`config.hpp`)
- JSON-based configuration
- Environment variable support
- Hot-reload capability
- Validation and defaults

### 5. Windows Service (`service.cpp`)
- Service Control Manager integration
- Event logging
- Graceful shutdown
- Resource cleanup

## Dependencies

```cmake
# open62541 OPC UA library
open62541
# HTTP client library
curl
# JSON parsing
nlohmann/json
# Threading
std::thread (C++11)
# Windows Service API
windows.h
```

## Build System

Using CMake for cross-platform compatibility:
- Visual Studio 2019+ (Windows)
- GCC 9+ (Linux)
- Release optimizations (-O3)

## Configuration

```json
{
  "opcua": {
    "endpoint": "opc.tcp://192.168.100.10:4840",
    "security_mode": "None",
    "subscription_interval": 1000,
    "max_nodes": 100
  },
  "influxdb": {
    "url": "http://localhost:8086",
    "token": "...",
    "org": "tusas",
    "bucket": "tusas_hgu",
    "batch_size": 100
  },
  "performance": {
    "worker_threads": 4,
    "buffer_size": 1000,
    "flush_interval": 1000
  }
}
```

## Installation

1. Install dependencies
2. Build with CMake
3. Install as Windows service
4. Configure and start