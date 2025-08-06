#pragma once

#include "common.hpp"

namespace tusas_hgu {

// HGU sensor mapping based on S7-1500 PLC configuration
class SensorMapping {
public:
    // Sensor categories
    enum class SensorCategory {
        PRESSURE,
        TEMPERATURE,
        FLOW,
        LEVEL,
        PUMP,
        FILTER,
        SYSTEM,
        ALARM
    };
    
    // Sensor definition
    struct SensorDefinition {
        std::string id;
        std::string name;
        std::string nodeId;
        std::string unit;
        SensorCategory category;
        double minValue;
        double maxValue;
        bool isDigital;
        
        SensorDefinition(const std::string& sensor_id, const std::string& sensor_name,
                        const std::string& node_id, const std::string& sensor_unit,
                        SensorCategory cat, double min_val = 0.0, double max_val = 1000.0,
                        bool digital = false)
            : id(sensor_id), name(sensor_name), nodeId(node_id), unit(sensor_unit),
              category(cat), minValue(min_val), maxValue(max_val), isDigital(digital) {}
    };
    
    // Get all sensor definitions
    static std::vector<SensorDefinition> getAllSensors() {
        return {
            // Hydraulic Pressure Sensors (0-350 bar)
            SensorDefinition("pressure_supply", "Ana Besleme Basıncı", 
                           "ns=2;s=\"DB100\".\"Pressure_Supply\"", "bar", 
                           SensorCategory::PRESSURE, 0.0, 350.0),
            
            SensorDefinition("pressure_return", "Dönüş Basıncı", 
                           "ns=2;s=\"DB100\".\"Pressure_Return\"", "bar", 
                           SensorCategory::PRESSURE, 0.0, 50.0),
            
            SensorDefinition("pressure_accumulator", "Akümülatör Basıncı", 
                           "ns=2;s=\"DB100\".\"Pressure_Accumulator\"", "bar", 
                           SensorCategory::PRESSURE, 0.0, 350.0),
            
            SensorDefinition("pressure_filter_inlet", "Filtre Giriş Basıncı", 
                           "ns=2;s=\"DB100\".\"Pressure_Filter_Inlet\"", "bar", 
                           SensorCategory::PRESSURE, 0.0, 50.0),
            
            SensorDefinition("pressure_filter_outlet", "Filtre Çıkış Basıncı", 
                           "ns=2;s=\"DB100\".\"Pressure_Filter_Outlet\"", "bar", 
                           SensorCategory::PRESSURE, 0.0, 50.0),
            
            // Temperature Sensors (-10 to +80°C)
            SensorDefinition("temperature_oil_tank", "Tank Yağ Sıcaklığı", 
                           "ns=2;s=\"DB100\".\"Temperature_Oil_Tank\"", "°C", 
                           SensorCategory::TEMPERATURE, -10.0, 80.0),
            
            SensorDefinition("temperature_oil_return", "Dönüş Yağ Sıcaklığı", 
                           "ns=2;s=\"DB100\".\"Temperature_Oil_Return\"", "°C", 
                           SensorCategory::TEMPERATURE, -10.0, 80.0),
            
            SensorDefinition("temperature_motor", "Motor Sıcaklığı", 
                           "ns=2;s=\"DB100\".\"Temperature_Motor\"", "°C", 
                           SensorCategory::TEMPERATURE, -10.0, 100.0),
            
            SensorDefinition("temperature_ambient", "Ortam Sıcaklığı", 
                           "ns=2;s=\"DB100\".\"Temperature_Ambient\"", "°C", 
                           SensorCategory::TEMPERATURE, -10.0, 50.0),
            
            // Flow Sensors (0-200 L/min)
            SensorDefinition("flow_rate_supply", "Besleme Debisi", 
                           "ns=2;s=\"DB100\".\"Flow_Rate_Supply\"", "L/min", 
                           SensorCategory::FLOW, 0.0, 200.0),
            
            SensorDefinition("flow_rate_return", "Dönüş Debisi", 
                           "ns=2;s=\"DB100\".\"Flow_Rate_Return\"", "L/min", 
                           SensorCategory::FLOW, 0.0, 200.0),
            
            // Level Sensors (0-100%)
            SensorDefinition("oil_level_tank", "Tank Yağ Seviyesi", 
                           "ns=2;s=\"DB100\".\"Oil_Level_Tank\"", "%", 
                           SensorCategory::LEVEL, 0.0, 100.0),
            
            // Pump Information
            SensorDefinition("pump_current", "Motor Akımı", 
                           "ns=2;s=\"DB100\".\"Pump_Current\"", "A", 
                           SensorCategory::PUMP, 0.0, 50.0),
            
            SensorDefinition("pump_speed", "Motor Devir", 
                           "ns=2;s=\"DB100\".\"Pump_Speed\"", "rpm", 
                           SensorCategory::PUMP, 0.0, 1500.0),
            
            SensorDefinition("pump_power", "Motor Güç", 
                           "ns=2;s=\"DB100\".\"Pump_Power\"", "kW", 
                           SensorCategory::PUMP, 0.0, 30.0),
            
            SensorDefinition("pump_hours", "Toplam Çalışma Saati", 
                           "ns=2;s=\"DB100\".\"Pump_Hours\"", "h", 
                           SensorCategory::PUMP, 0.0, 100000.0),
            
            // Filter Status
            SensorDefinition("filter_pressure_diff", "Filtre Basınç Farkı", 
                           "ns=2;s=\"DB100\".\"Filter_Pressure_Diff\"", "bar", 
                           SensorCategory::FILTER, 0.0, 10.0),
            
            // Digital Inputs - System Status
            SensorDefinition("pump_status", "Pompa Çalışma Durumu", 
                           "ns=2;s=\"DB100\".\"Pump_Status\"", "", 
                           SensorCategory::SYSTEM, 0.0, 1.0, true),
            
            SensorDefinition("system_ready", "Sistem Hazır", 
                           "ns=2;s=\"DB100\".\"System_Ready\"", "", 
                           SensorCategory::SYSTEM, 0.0, 1.0, true),
            
            SensorDefinition("system_running", "Sistem Çalışıyor", 
                           "ns=2;s=\"DB100\".\"System_Running\"", "", 
                           SensorCategory::SYSTEM, 0.0, 1.0, true),
            
            SensorDefinition("emergency_stop", "Acil Durdurma", 
                           "ns=2;s=\"DB100\".\"Emergency_Stop\"", "", 
                           SensorCategory::SYSTEM, 0.0, 1.0, true),
            
            SensorDefinition("maintenance_mode", "Bakım Modu", 
                           "ns=2;s=\"DB100\".\"Maintenance_Mode\"", "", 
                           SensorCategory::SYSTEM, 0.0, 1.0, true),
            
            // Digital Inputs - Alarms
            SensorDefinition("oil_level_low_alarm", "Düşük Yağ Seviyesi", 
                           "ns=2;s=\"DB100\".\"Oil_Level_Low_Alarm\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true),
            
            SensorDefinition("filter_status", "Filtre Durumu", 
                           "ns=2;s=\"DB100\".\"Filter_Status\"", "", 
                           SensorCategory::FILTER, 0.0, 1.0, true),
            
            SensorDefinition("filter_alarm", "Filtre Tıkanma Alarmı", 
                           "ns=2;s=\"DB100\".\"Filter_Alarm\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true),
            
            SensorDefinition("alarm_high_pressure", "Yüksek Basınç Alarmı", 
                           "ns=2;s=\"DB100\".\"Alarm_High_Pressure\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true),
            
            SensorDefinition("alarm_high_temperature", "Yüksek Sıcaklık Alarmı", 
                           "ns=2;s=\"DB100\".\"Alarm_High_Temperature\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true),
            
            SensorDefinition("alarm_low_oil_level", "Düşük Yağ Seviyesi Alarmı", 
                           "ns=2;s=\"DB100\".\"Alarm_Low_Oil_Level\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true),
            
            SensorDefinition("warning_filter", "Filtre Uyarısı", 
                           "ns=2;s=\"DB100\".\"Warning_Filter\"", "", 
                           SensorCategory::ALARM, 0.0, 1.0, true)
        };
    }
    
    // Get sensors by category
    static std::vector<SensorDefinition> getSensorsByCategory(SensorCategory category) {
        auto allSensors = getAllSensors();
        std::vector<SensorDefinition> filtered;
        
        for (const auto& sensor : allSensors) {
            if (sensor.category == category) {
                filtered.push_back(sensor);
            }
        }
        
        return filtered;
    }
    
    // Get sensor by ID
    static SensorDefinition getSensorById(const std::string& id) {
        auto allSensors = getAllSensors();
        
        for (const auto& sensor : allSensors) {
            if (sensor.id == id) {
                return sensor;
            }
        }
        
        // Return empty sensor if not found
        return SensorDefinition("", "", "", "", SensorCategory::SYSTEM);
    }
    
    // Get category name
    static std::string getCategoryName(SensorCategory category) {
        switch (category) {
            case SensorCategory::PRESSURE:    return "pressure";
            case SensorCategory::TEMPERATURE: return "temperature";
            case SensorCategory::FLOW:        return "flow";
            case SensorCategory::LEVEL:       return "level";
            case SensorCategory::PUMP:        return "pump";
            case SensorCategory::FILTER:      return "filter";
            case SensorCategory::SYSTEM:      return "system";
            case SensorCategory::ALARM:       return "alarm";
            default:                          return "unknown";
        }
    }
    
    // Validate sensor value
    static bool validateSensorValue(const SensorDefinition& sensor, double value) {
        if (sensor.isDigital) {
            return value == 0.0 || value == 1.0;
        } else {
            return value >= sensor.minValue && value <= sensor.maxValue;
        }
    }
    
    // Get total sensor count
    static size_t getTotalSensorCount() {
        return getAllSensors().size();
    }
};

} // namespace tusas_hgu