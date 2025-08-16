# TUSAŞ HGU Kalibrasyon Yönetim Sistemi - Arayüz Gereksinimleri

## 📊 Sensör Envanteri (Akredite Kalibrasyon Gerekli)

### **7x Basınç Sensörü (Pressure)**
- **Tip**: 4-20mA analog
- **Range**: 0-300 bar
- **Lokasyon**: Her motor için ayrı basınç sensörü
- **Kalibrasyon Periyodu**: 1 yıl

### **1x Sıcaklık Sensörü (Temperature)**
- **Tip**: 4-20mA termometre
- **Range**: -40 to +150°C
- **Lokasyon**: Sistem sıcaklığı
- **Kalibrasyon Periyodu**: 1 yıl

### **7x P-Line Debi Sensörü (Flow)**
- **Tip**: 4-20mA analog
- **Range**: 0-100 L/min
- **Lokasyon**: Her motor ana hat debisi
- **Kalibrasyon Periyodu**: 1 yıl

### **7x Sızıntı Debi Sensörü (Leak Flow)**
- **Tip**: PPC-CAN-SFM-060-CAL (CAN Bus)
- **Range**: 0-1000 ml/min (tahmin)
- **Protokol**: CAN Bus via TCP/IP (CAN-Ethernet çevirici)
- **Kalibrasyon Periyodu**: 1 yıl

## 🖥️ Arayüz Gereksinimleri

### **1. Kalibrasyon Yönetim Ana Sayfası**
```typescript
interface CalibrationManagementPage {
  sensorList: CalibrationSensorList;
  statusDashboard: CalibrationStatusDashboard;
  upcomingAlerts: CalibrationAlert[];
  quickActions: QuickActionButtons;
}
```

### **2. Sensör Seçim Sistemi**
```typescript
interface SensorSelector {
  sensorCategories: {
    pressure: Array<{id: 1-7, name: "Pressure Sensor 1-7"}>;
    temperature: {id: 1, name: "System Temperature"};
    flow: Array<{id: 1-7, name: "P-Line Flow Sensor 1-7"}>;
    leakFlow: Array<{id: 1-7, name: "Leak Flow Sensor 1-7"}>;
  };
  currentSelection: SelectedSensor;
  sensorStatus: SensorCalibrationStatus;
}
```

### **3. PDF Yönetim Sistemi**
```typescript
interface PDFManagement {
  uploadArea: {
    dragDrop: boolean;
    fileTypeValidation: ['.pdf'];
    maxFileSize: '50MB';
    uploadLocation: string; // klasör path
  };
  pdfViewer: {
    embeddedViewer: boolean;
    zoomControls: boolean;
    downloadButton: boolean;
    printButton: boolean;
  };
  fileNaming: {
    pattern: "{SensorType}_{SensorID}_{CertificateDate}_{LabName}.pdf";
    example: "PRESSURE_01_20241201_TUBITAK.pdf";
  };
}
```

### **4. Kalibrasyon Veri Giriş Formu**
```typescript
interface CalibrationDataForm {
  accreditedData: {
    certificateNumber: string;
    laboratoryName: string;
    calibrationDate: Date;
    expiryDate: Date;
    offsetCorrection: number;
    gainCorrection: number;
    uncertaintyPercent: number;
    technician: string;
  };
  localData: {
    lastLocalDate: Date;
    nextLocalDate: Date;
    driftOffset: number;
    driftGain: number;
    localTechnician: string;
  };
  validation: FormValidation;
  autoCalculation: FinalCorrectionFactors;
}
```

### **5. Durum Dashboard**
```typescript
interface CalibrationStatusDashboard {
  overallStatus: {
    totalSensors: 22; // 7+1+7+7
    validCalibrations: number;
    dueCalibrations: number;
    overdueCalibrations: number;
    failedCalibrations: number;
  };
  statusCards: CalibrationStatusCard[];
  alertsTable: CalibrationAlert[];
  calendar: CalibrationCalendar;
}

interface CalibrationStatusCard {
  sensorInfo: {type: string; id: number; name: string};
  calibrationStatus: 'Valid' | 'Due' | 'Overdue' | 'Failed';
  lastCalibration: Date;
  nextDue: Date;
  daysRemaining: number;
  certificateNumber: string;
  quickActions: ['View PDF', 'Update Data', 'Schedule Calibration'];
}
```

### **6. API Entegrasyon**
```typescript
interface CalibrationAPI {
  endpoints: {
    getSensorList: '/api/calibration/sensors';
    getSensorData: '/api/calibration/sensor/{type}/{id}';
    updateCalibrationData: '/api/calibration/update';
    uploadPDF: '/api/calibration/upload-pdf';
    getCalibrationStatus: '/api/calibration/status';
    getExpiringCertificates: '/api/calibration/expiring';
  };
  opcIntegration: {
    writeToPlc: 'OPC UA Write operations';
    readFromPlc: 'OPC UA Read operations';
    variableMapping: PlcVariableMapping;
  };
}
```

### **7. PLC Değişken Haritalaması**
```typescript
interface PlcVariableMapping {
  pressureSensors: {
    [key: 1-7]: {
      accreditedOffset: `DB_HGU_Calibration.PRESSURE_SENSORS[${key}].ACCREDITED_OFFSET`;
      accreditedGain: `DB_HGU_Calibration.PRESSURE_SENSORS[${key}].ACCREDITED_GAIN`;
      certificateDate: `DB_HGU_Calibration.PRESSURE_SENSORS[${key}].ACCREDITED_DATE`;
      // ... diğer değişkenler
    };
  };
  temperatureSensor: {
    accreditedOffset: 'DB_HGU_Calibration.TEMPERATURE_SENSOR.ACCREDITED_OFFSET';
    // ... diğer değişkenler
  };
  // Flow ve Leak Flow sensörleri için benzer mapping
}
```

### **8. Özellikler ve Fonksiyonlar**

#### **PDF Yönetimi:**
- Drag & drop PDF upload
- PDF viewer entegrasyonu
- Dosya naming convention
- Klasör organizasyonu
- PDF metadata extraction (opsiyonel)

#### **Veri Validasyonu:**
- Tarih validasyonu (expiry > current date)
- Sayısal değer validasyonu
- Zorunlu alan kontrolü
- Sertifika numarası format kontrolü

#### **Otomatik Hesaplamalar:**
- Final offset = Accredited offset + Local drift offset
- Final gain = Accredited gain * Local drift gain
- Days remaining calculation
- Status determination logic

#### **Alarm ve Bildirimler:**
- Süresi yaklaşan sertifikalar (30 gün önce)
- Süresi geçmiş sertifikalar
- İletişim hataları (CAN Bus sensörler için)
- Kalibrasyon hatası alarmları

#### **Raporlama:**
- Kalibrasyon durum raporu
- Süresi yaklaşan sertifikalar listesi
- Kalibrasyon geçmişi raporu
- PDF sertifika arşivi

### **9. Kullanıcı İş Akışı**
1. **Sensör Seçimi**: Dropdown'dan sensör seçimi
2. **Mevcut Durum Görüntüleme**: Şu anki kalibrasyon durumu
3. **PDF Upload**: Yeni sertifika PDF'ini yükleme
4. **Veri Girişi**: Lab sertifikasından değerleri manuel giriş
5. **Doğrulama**: Veri validasyonu ve kontrolü
6. **PLC Güncelleme**: OPC UA ile PLC'ye yazma
7. **Durum Güncelleme**: Kalibrasyon durumunu güncelleme

### **10. Teknik Gereksinimler**
- **Framework**: React TypeScript (mevcut proje uyumlu)
- **PDF Viewer**: React-PDF veya PDF.js
- **File Upload**: Dropzone.js veya benzeri
- **Date Picker**: Modern date picker component
- **Data Grid**: Sensör listesi ve status için
- **OPC UA Client**: Backend API üzerinden
- **Storage**: PDF dosyaları için local klasör sistemi
- **Validation**: Yup veya Zod validation library