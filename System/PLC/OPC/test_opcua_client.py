#!/usr/bin/env python3
"""
Test OPC UA Client for TUSAS HGU
"""

import asyncio
import sys
from asyncua import Client

async def test_connection():
    """Test OPC UA connection"""
    endpoint = "opc.tcp://192.168.0.1:4840/freeopcua/server/"
    
    print("="*50)
    print("TUSAS HGU OPC UA Client Test")
    print("="*50)
    print(f"Endpoint: {endpoint}")
    
    try:
        client = Client(endpoint)
        print("Connecting to server...")
        await client.connect()
        print("✓ Connected successfully!")
        
        # Get root node
        root = client.get_root_node()
        print(f"Root node: {root}")
        
        # Browse Objects folder
        objects = client.get_objects_node()
        print(f"Objects node: {objects}")
        
        # Get children of Objects
        children = await objects.get_children()
        print(f"Found {len(children)} objects:")
        
        for child in children:
            name = await child.read_display_name()
            print(f"  - {name.Text}")
            
            # If this is HGU_Main, browse its sensors
            if name.Text == "HGU_Main":
                print("  └── Browsing HGU sensors:")
                hgu_sensors = await child.get_children()
                
                for sensor in hgu_sensors[:5]:  # Show first 5 sensors
                    sensor_name = await sensor.read_display_name()
                    try:
                        value = await sensor.read_value()
                        print(f"      - {sensor_name.Text} = {value}")
                    except Exception as e:
                        print(f"      - {sensor_name.Text} = <error reading value>")
                
                if len(hgu_sensors) > 5:
                    print(f"      ... and {len(hgu_sensors) - 5} more sensors")
        
        print("\n" + "="*50)
        print("✓ Test completed successfully!")
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False
    
    finally:
        try:
            await client.disconnect()
            print("✓ Disconnected from server")
        except:
            pass
    
    return True

if __name__ == "__main__":
    asyncio.run(test_connection())