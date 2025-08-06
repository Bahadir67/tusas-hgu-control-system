#!/usr/bin/env python3
"""
TUSAS HGU Quick Test - InfluxDB Data Generator
==============================================
Hızlı test verisi üretir ve InfluxDB'ye yazar.
"""

import time
import random
from datetime import datetime, timezone
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# InfluxDB Configuration
INFLUXDB_URL = "http://localhost:8086"
INFLUXDB_TOKEN = "MNy9JiQTKZxgDmbw6fq_oYMU2qrT5UCgs5ma8jzt7b2JhNCrf3lpaDxdICd87YAO72xN-Ii2T5qViup6hFsiVQ=="
INFLUXDB_ORG = "tusas"
INFLUXDB_BUCKET = "tusas_hgu"

def generate_test_data():
    """Test verisi üret"""
    # Basınç sensörü (100-300 bar)
    pressure = random.uniform(150, 280) + random.gauss(0, 5)
    
    # Sıcaklık sensörü (40-80°C) 
    temperature = random.uniform(45, 75) + random.gauss(0, 2)
    
    # Pump Status (True/False)
    pump_status = random.choice([True, True, True, False])  # %75 çalışır
    
    return {
        'Pressure': round(pressure, 2),
        'Temperature': round(temperature, 1), 
        'Pump_Status': pump_status,
        'System_Status': pump_status  # Sistem durumu pompa durumuna bağlı
    }

def write_to_influxdb(data):
    """InfluxDB'ye veri yaz"""
    try:
        client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
        write_api = client.write_api(write_options=SYNCHRONOUS)
        
        # Point oluştur
        point = Point("hgu_real_data").time(datetime.now(timezone.utc))
        
        for field, value in data.items():
            if isinstance(value, bool):
                point = point.field(field, int(value))  # Boolean -> Integer
            else:
                point = point.field(field, value)
        
        # Veri yaz
        write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
        
        print(f"✅ Veri yazıldı: Pressure={data['Pressure']} bar, "
              f"Temperature={data['Temperature']}°C, "
              f"Pump={data['Pump_Status']}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ InfluxDB yazma hatası: {e}")
        return False

def main():
    """Ana fonksiyon"""
    print("🚀 TUSAS HGU Quick Test Başlatılıyor...")
    print("📊 InfluxDB'ye test verisi yazılacak...")
    print("⏹️  Durdurmak için Ctrl+C\n")
    
    counter = 0
    try:
        while True:
            counter += 1
            print(f"\n📈 Test Döngüsü #{counter} - {datetime.now().strftime('%H:%M:%S')}")
            
            # Test verisi üret
            test_data = generate_test_data()
            
            # InfluxDB'ye yaz
            if write_to_influxdb(test_data):
                print("💾 Veri başarıyla kaydedildi")
            else:
                print("⚠️ Veri kaydetme başarısız")
            
            # 3 saniye bekle
            time.sleep(3)
            
    except KeyboardInterrupt:
        print(f"\n\n🛑 Test sonlandırıldı. Toplam {counter} veri yazdı.")
        print("📊 InfluxDB Dashboard'da verilerinizi kontrol edin!")

if __name__ == "__main__":
    main()