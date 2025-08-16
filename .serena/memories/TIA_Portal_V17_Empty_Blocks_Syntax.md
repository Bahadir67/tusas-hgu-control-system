# TIA Portal V17 - Boş IF/ELSE Blok Syntax Kuralı

**KRİTİK KURAL**: TIA Portal V17'de IF, ELSIF, ELSE bloklarında **kod yoksa** mutlaka `;` (noktalı virgül) kullanılmalı.

## Ana Kural:
- **Blok içinde KOD VARSA** → `;` gerekmez
- **Blok içinde KOD YOKSA** → `;` zorunlu
- **Comment ≠ Code!** Sadece comment varsa blok boş sayılır

## Yanlış Syntax (Hata: "Compound part of instruction expected"):
```scl
IF condition THEN
    // Sadece comment var - HATA!
ELSE
    some_command;
END_IF;

CASE value OF
    1: // Boş case - HATA!
    2: command;
END_CASE;
```

## Doğru Syntax:
```scl
IF condition THEN
    ; // Boş blok için noktalı virgül zorunlu
ELSE
    some_command;
END_IF;

CASE value OF
    1: ; // Boş case için noktalı virgül
    2: command;
END_CASE;
```

## Tüm Blok Türleri İçin Geçerli:
- IF/ELSIF/ELSE
- CASE/OF
- WHILE/FOR loops
- Function blocks

**Hatırlatma**: "Compound part of instruction expected" hatası = boş blok + eksik `;`