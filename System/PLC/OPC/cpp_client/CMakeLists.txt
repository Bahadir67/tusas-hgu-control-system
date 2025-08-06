cmake_minimum_required(VERSION 3.16)
project(TUSAS_HGU_OPC_Client VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Compiler-specific options
if(MSVC)
    add_compile_options(/W4 /std:c++17)
    add_definitions(-D_WIN32_WINNT=0x0601)
    # Remove conflicting optimization flags - let CMake handle them
else()
    add_compile_options(-Wall -Wextra -pthread)
endif()

# Find required packages
find_package(CURL REQUIRED)

# Find open62541 via vcpkg
find_package(open62541 REQUIRED)
find_package(nlohmann_json REQUIRED)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Source files
set(SOURCES
    src/opcua_test.cpp
)

# Header files
set(HEADERS
    include/opcua_client.hpp
    include/data_manager.hpp
    include/influxdb_writer.hpp
    include/config.hpp
    include/logger.hpp
    include/service.hpp
    include/sensor_mapping.hpp
    include/common.hpp
)

# Create executable
add_executable(tusas_hgu_opcua_client ${SOURCES} ${HEADERS})

# Create safe test executable
add_executable(tusas_hgu_opcua_safe src/opcua_test_safe.cpp)

# Create ultra-simple test executable (no dynamic allocation)
add_executable(tusas_hgu_opcua_simple src/opcua_simple_test.cpp)

# Create production HGU client (sensor reading + InfluxDB)
add_executable(tusas_hgu_production src/hgu_production_client.cpp)

# Create simple production client (minimal dependencies)
add_executable(tusas_hgu_simple_production src/hgu_simple_production.cpp)

# Create minimal production client (absolute minimal)
add_executable(tusas_hgu_minimal src/hgu_minimal.cpp)

# Link libraries
target_link_libraries(tusas_hgu_opcua_client
    open62541::open62541
    CURL::libcurl
    nlohmann_json::nlohmann_json
)

target_link_libraries(tusas_hgu_opcua_safe
    open62541::open62541
)

target_link_libraries(tusas_hgu_opcua_simple
    open62541::open62541
)

target_link_libraries(tusas_hgu_production
    open62541::open62541
    CURL::libcurl
    nlohmann_json::nlohmann_json
)

target_link_libraries(tusas_hgu_simple_production
    open62541::open62541
    CURL::libcurl
)

target_link_libraries(tusas_hgu_minimal
    open62541::open62541
    CURL::libcurl
)

# Windows specific libraries
if(WIN32)
    target_link_libraries(tusas_hgu_opcua_client
        ws2_32
        advapi32
        user32
        shell32
    )
endif()

# Install targets
install(TARGETS tusas_hgu_opcua_client
    RUNTIME DESTINATION bin
)

# Install configuration files
install(FILES
    config/config.json
    config/install_service.bat
    config/uninstall_service.bat
    DESTINATION config
)

# Install documentation
install(FILES
    README.md
    DESTINATION docs
)

# Create package
set(CPACK_GENERATOR "ZIP")
set(CPACK_PACKAGE_NAME "TUSAS_HGU_OPC_Client")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION "High-performance OPC UA client for TUSAS HGU automation system")
set(CPACK_PACKAGE_CONTACT "TUSAS HGU Team")

include(CPack)

# Custom targets
add_custom_target(clean-build
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}
    COMMENT "Cleaning build directory"
)

add_custom_target(install-service
    COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/config/install_service.bat
    DEPENDS tusas_hgu_opcua_client
    COMMENT "Installing Windows service"
)

# Development targets
if(CMAKE_BUILD_TYPE MATCHES Debug)
    add_compile_definitions(DEBUG_MODE)
    add_compile_options(-g)
endif()

# Performance optimization for Release
if(CMAKE_BUILD_TYPE MATCHES Release)
    add_compile_definitions(NDEBUG)
    if(MSVC)
        # Let CMake handle optimization flags
        set_target_properties(tusas_hgu_opcua_client PROPERTIES
            LINK_FLAGS "/LTCG"
        )
    else()
        add_compile_options(-flto)
    endif()
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "TUSAS HGU OPC UA Client Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  open62541: ${OPEN62541_LIBRARY}")
message(STATUS "  CURL: ${CURL_LIBRARIES}")
message(STATUS "")