# Sistem Algoritmaları Derinlemesine Analiz

## 1. Load Sensing (LS) Pompa Teknolojisi

### **Temel Çalışma Prensibi**:
- **Değişken Hacimli Pompa**: ER-R-100B-LS (100cc maksimum displacement)
- **LS Delta Pressure**: 20 bar sabit fark basıncı
- **Akış Kontrolü**: Sistem ihtiyacına göre otomatik ayarlama
- **Enerji Verimliliği**: Gereksiz basınç üretmez, sadece ihtiyaç kadar

### **RPM Hesaplama Algoritması**:
```scl
RPM = (Flow_Target_L_min / Displacement_L_rev) * 1.0
```
**Örnek Hesaplama**:
- İhtiyaç: 70 L/min
- Displacement: 100cc = 0.1L/rev  
- RPM = (70 / 0.1) = 700 RPM

### **Basınç Setpoint Formula**:
```scl
Pump_Pressure = System_Pressure - LS_DELTA_PRESSURE(20bar)
```

---

## 2. Multi-Criteria Motor Selection Algorithm

### **Load Factor Determination**:
```scl
System_Load_Factor = Required_Total_Flow / (MAX_FLOW_PER_PUMP * 6_motors)
```

### **Optimal Motor Count Matrix**:
| Load Factor | Motor Count | Load Type |
|-------------|-------------|-----------|
| ≤ 0.15 | 1 motor | Hafif yük |
| 0.15-0.35 | 2 motor | Orta yük |
| 0.35-0.55 | 3 motor | Orta-yüksek |
| 0.55-0.75 | 4 motor | Yüksek yük |
| 0.75-0.90 | 5 motor | Çok yüksek |
| > 0.90 | 6 motor | Maksimum |

### **Selection Scoring Algorithm**:
```scl
Motor_Score = (1 - runtime_normalized) × (1 - efficiency_weight) + 
              efficiency_normalized × efficiency_weight
```

**Scoring Components**:
- **Runtime Balancing**: `(1 - runtime_hours/10000)` → Düşük runtime = Yüksek skor
- **Efficiency Optimization**: `(efficiency_percent/100)` → Yüksek verim = Yüksek skor
- **Weight Factor**: Efficiency_Weight_Factor (0.0-1.0) kullanıcı ayarı

### **Bubble Sort Ranking**:
```scl
FOR i := 1 TO 5 DO
    FOR j := 1 TO (6-i) DO
        IF Score[Index[j]] < Score[Index[j+1]] THEN
            // Swap indices for descending order
        END_IF;
    END_FOR;
END_FOR;
```

---

## 3. PID Control Algorithm (Danfoss Valves)

### **PID Implementation**:
```scl
// P Term
Control_Output := Position_Error × P_Gain;

// I Term (with windup protection)
Integral_Sum := Integral_Sum + (Position_Error × I_Gain);
Integral_Sum := LIMIT(-100.0, Integral_Sum, 100.0);
Control_Output := Control_Output + Integral_Sum;

// D Term  
Derivative := (Position_Error - Previous_Error) × D_Gain;
Control_Output := Control_Output + Derivative;
```

### **Control Loop Characteristics**:
- **Update Rate**: Control_Interval (kullanıcı tanımlı)
- **Output Range**: 0-100% (LIMIT protected)
- **Position Scaling**: 0-65535 counts ↔ 0-100%
- **Deadband**: Position_Deadband tolerance

### **CAN Frame Data Structure**:
```
Byte 0: CAN_ID
Byte 1: DLC (8)
Byte 2-3: Position_Setpoint (16-bit, Big Endian)
Byte 4-5: Control_Word (Enable/Mode)
Byte 6: Control_Mode (1=Pos, 2=Flow, 3=Press)
Byte 7: Reserved/CRC
```

---

## 4. Analog Scaling & Quality Assessment

### **4-20mA Linear Scaling**:
```scl
Raw_Range = Max_Raw - Min_Raw;  // Typically 32767-6554 = 26213
Scaled_Range = Max_Scaled - Min_Scaled;
Linear_Value = ((Raw - Min_Raw) / Raw_Range) × Scaled_Range + Min_Scaled;
```

### **Dual Calibration System**:
```scl
Final_Offset = Accredited_Offset + Local_Drift_Offset;
Final_Gain = Accredited_Gain × Local_Drift_Gain;
Calibrated_Value = (Linear_Value + Final_Offset) × Final_Gain;
```

### **Quality Assessment Logic**:
- **Under-Range**: Raw < (Min_Raw - 500) → Kırık kablo
- **Over-Range**: Raw > (Max_Raw + 500) → Kısa devre
- **Range Tolerance**: ±5% mühendislik değeri
- **Bad Quality Threshold**: 10 ardışık hatalı okuma

### **Low-Pass Filter**:
```scl
Filter_Output = Filter_Output + filter_factor × (Input - Filter_Output);
```
**Filter Factor**: Sabit 0.1 (TIA Portal uyumluluğu için)

---

## 5. Bütünsel Sistem Algoritma Akışı

### **Data Flow Pipeline**:
```
Sensors → FB_HGU_Scaling → Quality Data → FB_HGU_Load_Balance_LS
    ↓                                              ↓
FB_CAN_Danfoss_Valves ← Motor Commands ← Selection Algorithm
    ↓                                              ↓
CAN-Ethernet ← PID Control ← Load Distribution ← Efficiency Analysis
```

### **Control Loop Timing**:
- **Scan Cycle**: 100ms (PLC scan time)
- **Load Balance**: 5 second intervals
- **Valve Control**: User-defined interval
- **Sensor Scaling**: Every scan cycle

### **Error Handling Strategy**:
- **Consecutive Error Counters**: 5-10 threshold
- **Retry Logic**: 3 attempts with exponential backoff
- **Status Classification**: 0=OK, 1=Warning, 2=Error, 3=Offline
- **Safe Mode**: Minimum values on critical errors

## Performance Optimization Features

### **Efficiency-Based Operation**:
- Real-time efficiency feedback integration
- Dynamic motor selection based on performance
- Energy consumption minimization
- Runtime hours balancing for wear leveling

### **Predictive Maintenance Support**:
- Runtime tracking per motor
- Efficiency trend analysis
- Quality degradation detection
- Maintenance interval optimization