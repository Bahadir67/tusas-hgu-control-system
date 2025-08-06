#!/usr/bin/env python3
"""
TUSAŞ HGU PLCSIM OPC UA Test Client
==================================
SIMATIC S7-PLCSIM Advanced V7 ile OPC UA bağlantısını test eder.
"""

import asyncio
import sys
import time
from datetime import datetime
from asyncua import Client, ua
from asyncua.common.node import Node

class PLCSIMTestClient:
    """PLCSIM OPC UA Test Client"""
    
    def __init__(self, endpoint="opc.tcp://192.168.0.1:4840"):
        self.endpoint = endpoint
        self.client = None
        self.connected = False
        self.sensor_nodes = {}
        
    async def connect(self):
        """PLCSIM'e bağlan"""
        try:
            print(f"Connecting to PLCSIM: {self.endpoint}")
            self.client = Client(self.endpoint)
            
            # Timeout ayarları (asyncua API'sına uygun)
            # self.client.set_timeout(10.0)  # Bu method mevcut değil
            
            await self.client.connect()
            self.connected = True
            print("✓ Connected to PLCSIM successfully!")
            return True
            
        except Exception as e:
            print(f"✗ Connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Bağlantıyı kapat"""
        if self.client and self.connected:
            await self.client.disconnect()
            self.connected = False
            print("✓ Disconnected from PLCSIM")
    
    async def discover_hgu_nodes(self):
        """HGU sensor node'larını keşfet"""
        try:
            print("\n=== Discovering HGU Nodes ===")
            
            # Root node'dan başla
            root = self.client.get_root_node()
            print(f"Root node: {root}")
            
            # Objects folder
            objects = self.client.get_objects_node()
            print(f"Objects node: {objects}")
            
            # Objects altındaki tüm node'ları listele
            children = await objects.get_children()
            print(f"Found {len(children)} objects:")
            
            hgu_main_node = None
            for child in children:
                name = await child.read_display_name()
                print(f"  - {name.Text}")
                
                if "HGU_Main" in name.Text or "ServerInterfaces" in name.Text:
                    hgu_main_node = child
                    print(f"    ✓ Found {name.Text} node!")
            
            if hgu_main_node:
                await self.browse_sensor_data(hgu_main_node)
            else:
                print("  ⚠️ HGU_Main node not found. Checking namespace 2...")
                await self.search_namespace_2()
                
        except Exception as e:
            print(f"Error discovering nodes: {e}")
    
    async def search_namespace_2(self):
        """Namespace 2'de HGU node'larını ara"""
        try:
            # Namespace 2'de doğrudan arama
            node_id = ua.NodeId("HGU_Main", 2)
            try:
                hgu_node = self.client.get_node(node_id)
                name = await hgu_node.read_display_name()
                print(f"✓ Found in namespace 2: {name.Text}")
                await self.browse_sensor_data(hgu_node)
            except:
                print("  ⚠️ HGU_Main not found in namespace 2")
                
                # Alternative paths based on TIA Portal structure
                alternative_paths = [
                    "ns=2;s=HGU_Main",
                    "ns=2;s=\"HGU_Main\"",
                    "ns=2;s=DB_HGU_SensorData", 
                    "ns=2;s=\"DB_HGU_SensorData\"",
                    "ns=1;s=Pressure_Supply",
                    "ns=2;s=Pressure_Supply"
                ]
                
                for path in alternative_paths:
                    try:
                        node = self.client.get_node(path)
                        name = await node.read_display_name()
                        print(f"✓ Found with path {path}: {name.Text}")
                        await self.browse_sensor_data(node)
                        return
                    except:
                        continue
                
                print("  ✗ HGU nodes not found with any path")
                
        except Exception as e:
            print(f"Error searching namespace 2: {e}")
    
    async def browse_sensor_data(self, hgu_node):
        """HGU sensor verilerini browse et"""
        try:
            print("\n=== Browsing HGU Sensor Data ===")
            
            # HGU_Main altındaki node'ları listele
            children = await hgu_node.get_children()
            print(f"HGU_Main has {len(children)} children:")
            
            sensor_data_node = None
            for child in children:
                name = await child.read_display_name()
                print(f"  - {name.Text}")
                
                if "SensorData" in name.Text or "sensor" in name.Text.lower() or "HGU_Interface" in name.Text:
                    sensor_data_node = child
                    print(f"    ✓ Found {name.Text} node!")
            
            if sensor_data_node:
                await self.read_sensor_values(sensor_data_node)
            else:
                # Doğrudan HGU_Main'den sensor okumaya çalış
                await self.read_sensor_values(hgu_node)
                
        except Exception as e:
            print(f"Error browsing sensor data: {e}")
    
    async def read_sensor_values(self, sensor_node):
        """Sensor değerlerini oku"""
        try:
            print("\n=== Reading Sensor Values ===")
            
            # Sensor node altındaki tüm değişkenleri listele
            children = await sensor_node.get_children()
            print(f"Found {len(children)} sensor variables:")
            
            sensor_count = 0
            for child in children:
                try:
                    name = await child.read_display_name()
                    value = await child.read_value()
                    data_type = await child.read_data_type()
                    
                    print(f"  - {name.Text} = {value} (Type: {data_type})")
                    
                    # Sensor node'unu dictionary'e kaydet
                    self.sensor_nodes[name.Text] = child
                    sensor_count += 1
                    
                    # İlk 10 sensor'ü göster, fazlası varsa kes
                    if sensor_count >= 10:
                        print(f"  ... and {len(children) - 10} more sensors")
                        break
                        
                except Exception as e:
                    print(f"  - Error reading {name.Text}: {e}")
            
            print(f"\n✓ Successfully mapped {len(self.sensor_nodes)} sensors")
            
        except Exception as e:
            print(f"Error reading sensor values: {e}")
    
    async def monitor_sensors(self, duration=30):
        """Sensor değerlerini sürekli izle"""
        if not self.sensor_nodes:
            print("No sensors mapped for monitoring")
            return
        
        print(f"\n=== Monitoring Sensors for {duration} seconds ===")
        
        # Key sensor'ları seç
        key_sensors = []
        for name in ["Pressure_Supply", "Temperature_Oil_Tank", "Pump_Status", "Flow_Rate_Supply"]:
            if name in self.sensor_nodes:
                key_sensors.append((name, self.sensor_nodes[name]))
        
        if not key_sensors:
            # İlk 4 sensor'ü al
            items = list(self.sensor_nodes.items())[:4]
            key_sensors = [(name, node) for name, node in items]
        
        start_time = time.time()
        cycle = 0
        
        while time.time() - start_time < duration:
            cycle += 1
            print(f"\n--- Cycle {cycle} - {datetime.now().strftime('%H:%M:%S')} ---")
            
            for sensor_name, sensor_node in key_sensors:
                try:
                    value = await sensor_node.read_value()
                    print(f"  {sensor_name}: {value}")
                except Exception as e:
                    print(f"  {sensor_name}: Error - {e}")
            
            await asyncio.sleep(2.0)
        
        print(f"\n✓ Monitoring completed ({cycle} cycles)")
    
    async def test_write_operations(self):
        """Yazma işlemlerini test et"""
        try:
            print("\n=== Testing Write Operations ===")
            
            writable_sensors = []
            for name, node in self.sensor_nodes.items():
                try:
                    access_level = await node.read_attribute(ua.AttributeIds.AccessLevel)
                    if access_level & 0x02:  # Write bit
                        writable_sensors.append((name, node))
                except:
                    pass
            
            if writable_sensors:
                print(f"Found {len(writable_sensors)} writable sensors:")
                for name, _ in writable_sensors[:3]:  # İlk 3'ünü test et
                    print(f"  - {name}")
                
                # Test yazma işlemi (dikkatli ol!)
                print("⚠️ Write test skipped for safety")
            else:
                print("No writable sensors found")
                
        except Exception as e:
            print(f"Error testing write operations: {e}")


async def main():
    """Ana test fonksiyonu"""
    print("="*60)
    print("TUSAŞ HGU PLCSIM OPC UA Test Client")
    print("="*60)
    
    client = PLCSIMTestClient()
    
    try:
        # Bağlantı testi
        if await client.connect():
            
            # Node keşfi
            await client.discover_hgu_nodes()
            
            # Yazma testi
            await client.test_write_operations()
            
            # Monitoring
            if client.sensor_nodes:
                await client.monitor_sensors(duration=30)
            
            print("\n" + "="*60)
            print("✓ PLCSIM Test completed successfully!")
            
        else:
            print("\n" + "="*60)
            print("✗ PLCSIM Test failed - could not connect")
            
            # Bağlantı troubleshooting
            print("\nTroubleshooting:")
            print("1. PLCSIM Advanced Instance Manager running?")
            print("2. HGU_S7-1500 instance started?")
            print("3. IP address 192.168.0.1 accessible?")
            print("4. OPC UA Server enabled in TIA Portal?")
            print("5. Windows Firewall port 4840 open?")
            
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())