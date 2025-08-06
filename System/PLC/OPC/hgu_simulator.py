#!/usr/bin/env python3
"""
TUSAS HGU Automation System - Data Simulator
============================================
Simulates realistic HGU sensor data for testing and visualization.

Author: Bahadir - TUSAS HGU Automation Team  
Date: 03.07.2025
Version: 1.0
"""

import time
import math
import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any
import json

# Third-party imports
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv
import os
import colorama
from colorama import Fore, Style

# Initialize colorama
colorama.init()

# Load environment variables
load_dotenv()


class HGUSimulator:
    """HGU Hydraulic Power Unit Simulator"""
    
    def __init__(self):
        # InfluxDB configuration
        self.influx_url = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
        self.influx_token = os.getenv('INFLUXDB_TOKEN')
        self.influx_org = os.getenv('INFLUXDB_ORG', 'tusas')
        self.influx_bucket = os.getenv('INFLUXDB_BUCKET', 'tusas_hgu')
        
        self.influx_client = None
        self.write_api = None
        self.running = False
        
        # Simulation parameters
        self.simulation_speed = 1.0  # 1.0 = real time, 2.0 = 2x faster
        self.update_interval = 1.0   # seconds between updates
        
        # HGU operational states
        self.system_running = True
        self.pump_running = True
        self.maintenance_mode = False
        self.emergency_stop = False
        
        # Simulation time tracking
        self.start_time = time.time()
        self.cycle_count = 0
        
        # Operational scenarios
        self.scenarios = {
            'normal': {'weight': 0.7, 'duration': 300},      # 70% normal operation
            'high_load': {'weight': 0.15, 'duration': 60},   # 15% high load
            'maintenance': {'weight': 0.1, 'duration': 120}, # 10% maintenance
            'alarm': {'weight': 0.05, 'duration': 30}        # 5% alarm conditions
        }
        
        self.current_scenario = 'normal'
        self.scenario_start_time = time.time()
        
        print(f"{Fore.GREEN}HGU Simulator initialized{Style.RESET_ALL}")
        print(f"InfluxDB: {self.influx_url}")
        print(f"Bucket: {self.influx_bucket}")
    
    def connect_influxdb(self) -> bool:
        """Connect to InfluxDB"""
        try:
            if not self.influx_token:
                print(f"{Fore.RED}InfluxDB token not configured{Style.RESET_ALL}")
                return False
                
            self.influx_client = InfluxDBClient(
                url=self.influx_url,
                token=self.influx_token,
                org=self.influx_org
            )
            
            self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
            
            # Test connection
            health = self.influx_client.health()
            print(f"{Fore.GREEN}Connected to InfluxDB: {health.status} (v{health.version}){Style.RESET_ALL}")
            return True
            
        except Exception as e:
            print(f"{Fore.RED}Failed to connect to InfluxDB: {e}{Style.RESET_ALL}")
            return False
    
    def update_scenario(self):
        """Update current operational scenario"""
        elapsed = time.time() - self.scenario_start_time
        scenario_duration = self.scenarios[self.current_scenario]['duration']
        
        if elapsed > scenario_duration:
            # Choose new scenario based on weights
            scenarios = list(self.scenarios.keys())
            weights = [self.scenarios[s]['weight'] for s in scenarios]
            self.current_scenario = random.choices(scenarios, weights=weights)[0]
            self.scenario_start_time = time.time()
            
            print(f"{Fore.YELLOW}Scenario changed to: {self.current_scenario}{Style.RESET_ALL}")
    
    def generate_realistic_values(self) -> Dict[str, Any]:
        """Generate realistic HGU sensor values based on current scenario"""
        sim_time = (time.time() - self.start_time) * self.simulation_speed
        
        # Base values for normal operation
        base_values = {
            # Hydraulic Pressure Sensors (bar)
            'pressure_supply': 250.0,
            'pressure_return': 15.0,
            'pressure_accumulator': 280.0,
            'pressure_filter_inlet': 250.0,
            'pressure_filter_outlet': 245.0,
            
            # Temperature Sensors (°C)
            'temperature_oil_tank': 45.0,
            'temperature_oil_return': 55.0,
            'temperature_motor': 75.0,
            'temperature_ambient': 22.0,
            
            # Flow and Level Sensors
            'flow_rate_supply': 120.0,    # L/min
            'flow_rate_return': 115.0,    # L/min
            'oil_level_tank': 85.0,       # %
            
            # Pump Information
            'pump_current': 25.0,         # A
            'pump_speed': 1450.0,         # rpm
            'pump_power': 18.5,           # kW
            'pump_hours': int(sim_time / 3600),  # hours
        }
        
        # Apply scenario modifications
        scenario_multipliers = self.get_scenario_multipliers()
        
        # Generate realistic variations
        sensor_data = {}
        
        for sensor, base_value in base_values.items():
            # Apply scenario multiplier
            modified_value = base_value * scenario_multipliers.get(sensor, 1.0)
            
            # Add realistic variations and noise
            if sensor.startswith('pressure_'):
                # Pressure sensors: ±5% variation + pump cycle variation
                variation = 0.05 * modified_value * math.sin(sim_time * 0.1)
                noise = random.gauss(0, modified_value * 0.02)
                sensor_data[sensor] = max(0, modified_value + variation + noise)
                
            elif sensor.startswith('temperature_'):
                # Temperature sensors: slower changes + ambient influence
                temp_cycle = 3.0 * math.sin(sim_time * 0.01)  # Slow temperature cycle
                noise = random.gauss(0, 1.0)
                sensor_data[sensor] = modified_value + temp_cycle + noise
                
            elif sensor.startswith('flow_rate_'):
                # Flow rate: pump-dependent variation
                flow_variation = 10.0 * math.sin(sim_time * 0.2)
                noise = random.gauss(0, modified_value * 0.03)
                sensor_data[sensor] = max(0, modified_value + flow_variation + noise)
                
            elif sensor == 'oil_level_tank':
                # Oil level: slowly decreasing during operation
                level_change = -0.001 * sim_time if self.pump_running else 0
                noise = random.gauss(0, 0.5)
                sensor_data[sensor] = max(0, min(100, modified_value + level_change + noise))
                
            elif sensor.startswith('pump_'):
                # Pump parameters: correlated variations
                if sensor == 'pump_current':
                    current_variation = 3.0 * math.sin(sim_time * 0.15)
                    noise = random.gauss(0, 1.0)
                    sensor_data[sensor] = max(0, modified_value + current_variation + noise)
                elif sensor == 'pump_speed':
                    speed_variation = 50.0 * math.sin(sim_time * 0.1)
                    noise = random.gauss(0, 10.0)
                    sensor_data[sensor] = max(0, modified_value + speed_variation + noise)
                elif sensor == 'pump_power':
                    # Power correlates with current and speed
                    power_factor = (sensor_data.get('pump_current', 25) / 25.0) * (sensor_data.get('pump_speed', 1450) / 1450.0)
                    sensor_data[sensor] = modified_value * power_factor
                else:
                    sensor_data[sensor] = modified_value
            else:
                sensor_data[sensor] = modified_value
        
        # Add boolean sensor states
        sensor_data.update({
            'oil_level_low_alarm': sensor_data['oil_level_tank'] < 20.0,
            'pump_status': self.pump_running and not self.emergency_stop,
            'filter_status': sensor_data['pressure_filter_inlet'] - sensor_data['pressure_filter_outlet'] < 10.0,
            'filter_alarm': sensor_data['pressure_filter_inlet'] - sensor_data['pressure_filter_outlet'] > 15.0,
            'system_ready': not self.maintenance_mode and not self.emergency_stop,
            'system_running': self.system_running and self.pump_running,
            'emergency_stop': self.emergency_stop,
            'maintenance_mode': self.maintenance_mode,
            'alarm_high_pressure': sensor_data['pressure_supply'] > 320.0,
            'alarm_high_temperature': sensor_data['temperature_oil_tank'] > 70.0,
            'alarm_low_oil_level': sensor_data['oil_level_tank'] < 15.0,
            'warning_filter': sensor_data['pressure_filter_inlet'] - sensor_data['pressure_filter_outlet'] > 8.0,
        })
        
        # Calculate derived values
        sensor_data['filter_pressure_diff'] = sensor_data['pressure_filter_inlet'] - sensor_data['pressure_filter_outlet']
        sensor_data['filter_change_hours'] = max(0, 500 - (sensor_data['pump_hours'] % 500))
        
        return sensor_data
    
    def get_scenario_multipliers(self) -> Dict[str, float]:
        """Get sensor value multipliers based on current scenario"""
        if self.current_scenario == 'normal':
            return {}  # No modifications
            
        elif self.current_scenario == 'high_load':
            return {
                'pressure_supply': 1.2,
                'pressure_accumulator': 1.15,
                'temperature_oil_tank': 1.3,
                'temperature_oil_return': 1.25,
                'temperature_motor': 1.2,
                'flow_rate_supply': 1.4,
                'flow_rate_return': 1.35,
                'pump_current': 1.3,
                'pump_speed': 1.05,
                'pump_power': 1.35,
            }
            
        elif self.current_scenario == 'maintenance':
            self.maintenance_mode = True
            self.pump_running = False
            return {
                'pressure_supply': 0.1,
                'pressure_return': 0.2,
                'pressure_accumulator': 0.8,
                'flow_rate_supply': 0.0,
                'flow_rate_return': 0.0,
                'pump_current': 0.0,
                'pump_speed': 0.0,
                'pump_power': 0.0,
            }
            
        elif self.current_scenario == 'alarm':
            return {
                'pressure_supply': 1.4,  # Over pressure
                'temperature_oil_tank': 1.6,  # Overheating
                'temperature_motor': 1.5,
                'oil_level_tank': 0.3,  # Low oil level
                'pump_current': 1.8,  # High current
            }
        
        return {}
    
    def write_to_influxdb(self, sensor_data: Dict[str, Any]) -> bool:
        """Write sensor data to InfluxDB"""
        try:
            points = []
            timestamp = datetime.now(timezone.utc)
            
            for sensor_name, value in sensor_data.items():
                if value is not None:
                    # Create point with proper tags and fields
                    point = Point("hgu_simulation") \
                        .tag("sensor_id", sensor_name) \
                        .tag("location", "workshop") \
                        .tag("equipment", "hgu_main") \
                        .tag("scenario", self.current_scenario) \
                        .tag("simulation", "true")
                    
                    # Add value as appropriate field type
                    if isinstance(value, bool):
                        point = point.field("bool_value", value).field("numeric_value", float(int(value)))
                    else:
                        point = point.field("numeric_value", float(value))
                    
                    point = point.time(timestamp)
                    points.append(point)
            
            if points:
                self.write_api.write(bucket=self.influx_bucket, record=points)
                return True
            else:
                print(f"{Fore.YELLOW}No data points to write{Style.RESET_ALL}")
                return False
                
        except Exception as e:
            print(f"{Fore.RED}Failed to write to InfluxDB: {e}{Style.RESET_ALL}")
            return False
    
    def print_sensor_summary(self, sensor_data: Dict[str, Any]):
        """Print a summary of current sensor values"""
        print(f"\n{Fore.CYAN}=== Cycle #{self.cycle_count} - Scenario: {self.current_scenario} ==={Style.RESET_ALL}")
        
        # Key pressure values
        print(f"Pressures: Supply={sensor_data['pressure_supply']:.1f} bar, "
              f"Return={sensor_data['pressure_return']:.1f} bar, "
              f"Accumulator={sensor_data['pressure_accumulator']:.1f} bar")
        
        # Key temperatures  
        print(f"Temperatures: Tank={sensor_data['temperature_oil_tank']:.1f}°C, "
              f"Motor={sensor_data['temperature_motor']:.1f}°C")
        
        # Flow and level
        print(f"Flow: Supply={sensor_data['flow_rate_supply']:.1f} L/min, "
              f"Oil Level={sensor_data['oil_level_tank']:.1f}%")
        
        # Pump status
        print(f"Pump: Current={sensor_data['pump_current']:.1f}A, "
              f"Speed={sensor_data['pump_speed']:.0f} rpm, "
              f"Power={sensor_data['pump_power']:.1f} kW")
        
        # Alarms
        active_alarms = [k for k, v in sensor_data.items() if k.startswith('alarm_') and v]
        if active_alarms:
            print(f"{Fore.RED}Active Alarms: {', '.join(active_alarms)}{Style.RESET_ALL}")
        
        warnings = [k for k, v in sensor_data.items() if k.startswith('warning_') and v]
        if warnings:
            print(f"{Fore.YELLOW}Warnings: {', '.join(warnings)}{Style.RESET_ALL}")
    
    async def simulation_loop(self):
        """Main simulation loop"""
        print(f"{Fore.GREEN}Starting HGU simulation...{Style.RESET_ALL}")
        print(f"Update interval: {self.update_interval}s")
        print(f"Press Ctrl+C to stop\n")
        
        while self.running:
            try:
                start_time = time.time()
                
                # Update operational scenario
                self.update_scenario()
                
                # Generate sensor data
                sensor_data = self.generate_realistic_values()
                
                # Write to InfluxDB
                if self.write_to_influxdb(sensor_data):
                    self.cycle_count += 1
                    
                    # Print summary every 10 cycles
                    if self.cycle_count % 10 == 0:
                        self.print_sensor_summary(sensor_data)
                
                # Calculate next update time
                elapsed = time.time() - start_time
                sleep_time = max(0, self.update_interval - elapsed)
                await asyncio.sleep(sleep_time)
                
            except KeyboardInterrupt:
                print(f"\n{Fore.YELLOW}Simulation interrupted by user{Style.RESET_ALL}")
                break
            except Exception as e:
                print(f"{Fore.RED}Simulation error: {e}{Style.RESET_ALL}")
                await asyncio.sleep(self.update_interval)
    
    async def run(self, duration: int = None):
        """Run simulation for specified duration (seconds) or indefinitely"""
        if not self.connect_influxdb():
            return False
        
        self.running = True
        print(f"{Fore.CYAN}TUSAS HGU Simulator Starting...{Style.RESET_ALL}")
        
        if duration:
            print(f"Running for {duration} seconds")
            
        try:
            if duration:
                await asyncio.wait_for(self.simulation_loop(), timeout=duration)
            else:
                await self.simulation_loop()
                
        except asyncio.TimeoutError:
            print(f"\n{Fore.GREEN}Simulation completed after {duration} seconds{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}Simulation error: {e}{Style.RESET_ALL}")
        finally:
            await self.cleanup()
        
        return True
    
    async def cleanup(self):
        """Cleanup resources"""
        self.running = False
        
        if self.influx_client:
            try:
                self.influx_client.close()
                print(f"{Fore.GREEN}InfluxDB client closed{Style.RESET_ALL}")
            except Exception as e:
                print(f"Error closing InfluxDB client: {e}")
        
        print(f"{Fore.GREEN}Simulation completed. Total cycles: {self.cycle_count}{Style.RESET_ALL}")


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TUSAS HGU Sensor Data Simulator')
    parser.add_argument('--duration', '-d', type=int, help='Simulation duration in seconds')
    parser.add_argument('--interval', '-i', type=float, default=1.0, help='Update interval in seconds')
    parser.add_argument('--speed', '-s', type=float, default=1.0, help='Simulation speed multiplier')
    
    args = parser.parse_args()
    
    simulator = HGUSimulator()
    simulator.update_interval = args.interval
    simulator.simulation_speed = args.speed
    
    try:
        await simulator.run(duration=args.duration)
    except KeyboardInterrupt:
        print("\nSimulation interrupted")
    except Exception as e:
        print(f"Fatal error: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nApplication interrupted")
    except Exception as e:
        print(f"Fatal error: {e}")