#!/usr/bin/env python3
"""
TUSAŞ HGU OPC UA to InfluxDB Data Collector
==========================================
PLCSIM'den OPC UA ile veri alıp InfluxDB'ye real-time yazma.
"""

import asyncio
import sys
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any

from asyncua import Client, ua
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

class HGUDataCollector:
    """HGU OPC UA to InfluxDB Data Collector"""
    
    def __init__(self):
        # OPC UA Configuration
        self.opcua_endpoint = "opc.tcp://192.168.0.1:4840"
        self.opcua_client = None
        self.connected = False
        
        # InfluxDB Configuration
        self.influx_url = "http://localhost:8086"
        self.influx_token = "87zzaBVQnKrHP2j8NNtXWZe_5CuvhcEzUONmltOz9ljJrgSMbvmAXQw6YuLPN_vz5dv6gEUiGLdxeLTdFqz_nA=="
        self.influx_org = "tusas"
        self.influx_bucket = "tusas_hgu"
        
        self.influx_client = None
        self.write_api = None
        
        # Sensor nodes mapping
        self.sensor_nodes = {}
        
        # Data collection settings
        self.collection_interval = 1.0  # seconds
        self.running = False
        
        print("🚀 TUSAŞ HGU Data Collector initialized")
        print(f"📡 OPC UA: {self.opcua_endpoint}")
        print(f"💾 InfluxDB: {self.influx_url}")
    
    async def connect_opcua(self):
        """Connect to PLCSIM OPC UA server"""
        try:
            print("📡 Connecting to PLCSIM OPC UA...")
            self.opcua_client = Client(self.opcua_endpoint)
            await self.opcua_client.connect()
            self.connected = True
            print("✅ OPC UA connected successfully!")
            return True
        except Exception as e:
            print(f"❌ OPC UA connection failed: {e}")
            print(f"🔍 Endpoint: {self.opcua_endpoint}")
            print("💡 Check: PLCSIM running? OPC UA enabled? IP reachable?")
            return False
    
    def connect_influxdb(self):
        """Connect to InfluxDB"""
        try:
            print("💾 Connecting to InfluxDB...")
            self.influx_client = InfluxDBClient(
                url=self.influx_url,
                token=self.influx_token,
                org=self.influx_org,
                timeout=30000  # 30 seconds timeout
            )
            self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
            
            # Test connection
            health = self.influx_client.health()
            print(f"✅ InfluxDB connected: {health.status}")
            return True
        except Exception as e:
            print(f"❌ InfluxDB connection failed: {e}")
            return False
    
    async def discover_sensors(self):
        """Discover HGU sensor nodes"""
        try:
            print("🔍 Discovering HGU sensors...")
            
            # Navigate to ServerInterfaces/HGU_Interface
            objects = self.opcua_client.get_objects_node()
            children = await objects.get_children()
            
            server_interfaces = None
            for child in children:
                name = await child.read_display_name()
                if "ServerInterfaces" in name.Text:
                    server_interfaces = child
                    break
            
            if not server_interfaces:
                print("❌ ServerInterfaces not found")
                return False
            
            # Get HGU_Interface
            interfaces = await server_interfaces.get_children()
            hgu_interface = None
            for interface in interfaces:
                name = await interface.read_display_name()
                if "HGU_Interface" in name.Text:
                    hgu_interface = interface
                    break
            
            if not hgu_interface:
                print("❌ HGU_Interface not found")
                return False
            
            # Get sensor nodes
            sensors = await hgu_interface.get_children()
            print(f"📊 Found {len(sensors)} sensors:")
            
            for sensor in sensors:
                sensor_name = await sensor.read_display_name()
                self.sensor_nodes[sensor_name.Text] = sensor
                print(f"  ✅ {sensor_name.Text}")
            
            return len(self.sensor_nodes) > 0
            
        except Exception as e:
            print(f"❌ Sensor discovery failed: {e}")
            return False
    
    async def read_sensor_data(self) -> Dict[str, Any]:
        """Read current sensor values"""
        sensor_data = {}
        timestamp = datetime.now(timezone.utc)
        
        for sensor_name, sensor_node in self.sensor_nodes.items():
            try:
                value = await sensor_node.read_value()
                sensor_data[sensor_name] = {
                    'value': value,
                    'timestamp': timestamp,
                    'quality': 'good'
                }
            except Exception as e:
                print(f"⚠️ Error reading {sensor_name}: {e}")
                sensor_data[sensor_name] = {
                    'value': None,
                    'timestamp': timestamp,
                    'quality': 'bad'
                }
        
        return sensor_data
    
    def write_to_influxdb(self, sensor_data: Dict[str, Any]) -> bool:
        """Write sensor data to InfluxDB"""
        try:
            points = []
            
            for sensor_name, data in sensor_data.items():
                if data['value'] is not None and data['quality'] == 'good':
                    point = Point("hgu_real_data") \
                        .tag("sensor_id", sensor_name) \
                        .tag("location", "PLCSIM") \
                        .tag("equipment", "hgu_main") \
                        .tag("source", "opcua")
                    
                    # Add value based on type
                    if isinstance(data['value'], bool):
                        point = point.field("bool_value", data['value']) \
                               .field("value", float(int(data['value'])))  # 0.0 or 1.0
                    else:
                        point = point.field("value", float(data['value']))
                    
                    point = point.time(data['timestamp'])
                    points.append(point)
            
            if points:
                self.write_api.write(bucket=self.influx_bucket, record=points)
                return True
            else:
                print("⚠️ No valid data points to write")
                return False
                
        except Exception as e:
            print(f"❌ InfluxDB write failed: {e}")
            return False
    
    async def data_collection_loop(self):
        """Main data collection loop"""
        print(f"🔄 Starting data collection (interval: {self.collection_interval}s)")
        print("Press Ctrl+C to stop\n")
        
        cycle_count = 0
        successful_writes = 0
        
        while self.running:
            try:
                cycle_start = time.time()
                cycle_count += 1
                
                # Read sensor data
                sensor_data = await self.read_sensor_data()
                
                # Check if connection lost
                valid_reads = sum(1 for data in sensor_data.values() if data['quality'] == 'good')
                if valid_reads == 0 and cycle_count > 5:  # All sensors failed
                    print("🔄 Connection lost, attempting reconnect...")
                    await self.opcua_client.disconnect()
                    await asyncio.sleep(2)
                    if await self.connect_opcua():
                        await self.discover_sensors()
                    continue
                
                # Write to InfluxDB
                if self.write_to_influxdb(sensor_data):
                    successful_writes += 1
                
                # Display progress
                if cycle_count % 10 == 0:
                    print(f"📊 Cycle {cycle_count}: {len(sensor_data)} sensors, "
                          f"{successful_writes} successful writes")
                    
                    # Show current values
                    for name, data in list(sensor_data.items()):  # Show all sensors
                        if data['value'] is not None:
                            print(f"   {name}: {data['value']}")
                
                # Sleep for interval
                elapsed = time.time() - cycle_start
                sleep_time = max(0, self.collection_interval - elapsed)
                await asyncio.sleep(sleep_time)
                
            except KeyboardInterrupt:
                print("\n🛑 Data collection stopped by user")
                break
            except Exception as e:
                print(f"❌ Collection error: {e}")
                await asyncio.sleep(self.collection_interval)
    
    async def run(self):
        """Run the data collector"""
        try:
            # Connect to systems
            if not await self.connect_opcua():
                return False
            
            if not self.connect_influxdb():
                return False
            
            # Discover sensors
            if not await self.discover_sensors():
                return False
            
            # Start data collection
            self.running = True
            await self.data_collection_loop()
            
        except Exception as e:
            print(f"❌ Fatal error: {e}")
            return False
        finally:
            await self.cleanup()
    
    async def cleanup(self):
        """Cleanup connections"""
        self.running = False
        
        if self.opcua_client and self.connected:
            await self.opcua_client.disconnect()
            print("✅ OPC UA disconnected")
        
        if self.influx_client:
            self.influx_client.close()
            print("✅ InfluxDB disconnected")


async def main():
    """Main entry point"""
    print("="*60)
    print("🏭 TUSAŞ HGU OPC UA to InfluxDB Data Collector")
    print("="*60)
    
    collector = HGUDataCollector()
    
    try:
        await collector.run()
    except KeyboardInterrupt:
        print("\n🛑 Application interrupted")
    except Exception as e:
        print(f"❌ Fatal error: {e}")


if __name__ == "__main__":
    asyncio.run(main())