# CANOPEN TCP/IP Implementation Design

## Protocol Specification Implementation
**13-byte Ethernet Frame Structure**:
- Byte0: DLC (Data Length Code)
- Byte1-4: FrameID[3:0] (32-bit CAN Frame ID)  
- Byte5-12: Data[0:7] (8-byte CAN payload)

## NodeID Mapping (CANOPEN)
- **Pump Flow Sensors**: NodeID 10-16 (Pump1-7)
- **Leak Detection Sensors**: NodeID 17-23 (7 sensors)
- **Frame ID Extraction**: Lower 7 bits contain NodeID

## TSEND_C/TRCV_C Integration
```scl
// TCP receive for continuous listening
TRCV_Instance(
   EN_R := Enable AND Connection_Established,
   ID := Connection_ID,
   AD_4 := '192.168.1.100',  // CAN-Ethernet converter
   PORT := 2000,             // TCP port
   LEN := UINT#13,           // Fixed 13-byte frames
   DATA := RX_Buffer,
   CONNECT := Connection_Request
);
```

## Key Features Implemented
1. **No Message Loss**: Continuous TCP listening with NDR flag
2. **100ms Timing**: Gap detection with 500ms timeout tolerance
3. **NodeID Recognition**: Automatic sensor type classification
4. **Error Recovery**: Connection management with reconnection logic
5. **Data Scaling**: Pump flow (L/min) vs Leak flow (ml/min)

## State Machine Flow
0. **Init** → TCP connection establishment
2. **Listen** → Continuous message capture with TRCV_C.NDR
3. **Process** → 13-byte frame parsing + NodeID extraction
4. **Error** → Timeout/invalid frame handling with reconnection

## Frame Processing Logic
```scl
// Reconstruct 32-bit Frame ID (Little Endian)
Frame_ID := BYTE_TO_DWORD(RX_Buffer[4]) OR     // FrameID[0]
           SHL(BYTE_TO_DWORD(RX_Buffer[3]), 8) OR   // FrameID[1] 
           SHL(BYTE_TO_DWORD(RX_Buffer[2]), 16) OR  // FrameID[2]
           SHL(BYTE_TO_DWORD(RX_Buffer[1]), 24);    // FrameID[3]

// Extract NodeID (CANOPEN standard)
Node_ID := DWORD_TO_USINT(Frame_ID AND DW#16#7F);
```

## Integration Points
- Updates `DB_HGU_Execution.PLINE_FLOW_VALUES[1..7]`
- Updates `DB_HGU_Execution.LEAK_FLOW_VALUES[1..7]` 
- Message statistics: `CAN_MESSAGES_RECEIVED`, `CAN_COMMUNICATION_OK`

## Error Handling
- **Code 1**: Communication timeout
- **Code 2**: Invalid frame format  
- **Code 3**: Unknown NodeID
- **Reconnection**: 5-second interval after 10 consecutive errors