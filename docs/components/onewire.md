# 1-Wire Interface

## Overview

The 1-Wire interface module provides communication with temperature sensors and other devices over single-wire protocol. It manages bus detection, device discovery, and periodic data acquisition from 1-Wire slave devices.

## Supported Devices

### Temperature Sensors

| Device | Family Code | Resolution | Accuracy | Operating Range |
|--------|-------------|------------|----------|-----------------|
| **DS18B20** | 0x28 | 12-bit | ±0.5°C | –55°C to +125°C |
| **DS18S20** | 0x10 | 9-bit | ±0.5°C | –55°C to +85°C |
| **DS1822** | 0x22 | 12-bit | ±2°C | –30°C to +85°C |

### DS18B20 Features

- Programmable resolution: 9–12 bit (conversion time 94–750 ms)
- Parasite power capable (no external power required)
- Programmable temperature alarm thresholds
- Non-volatile configuration memory
- Up to 127 devices per 1-Wire bus
- Unique 64-bit ROM address for identification

## Device Support Matrix

| Interface | Supported | Max Devices | Multiple Buses |
|-----------|-----------|-------------|-----------------|
| GPIO | ✗ | - | - |
| I2C | ✗ | - | - |
| SPI | ✗ | - | - |
| **1-Wire** | ✓ | 127 (per bus) | Multiple (GPIO pins) |

## 1-Wire Bus Configuration

### Physical Connection

1-Wire requires minimal wiring:

```
     Raspberry Pi
     ┌──────────────┐
     │ GPIO 4       │◄──┐
     │ GND          │───┤
     │ 3.3V         │───┤
     └──────────────┘   │
                        │
              ┌─────────▼──────────┐
              │ Pull-up Resistor   │
              │ (4.7kΩ typical)    │
              └─────────┬──────────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
         ┌──▼──┐     ┌──▼──┐     ┌──▼──┐
         │DS1  │     │DS2  │     │DS3  │
         │18B20│     │18B20│     │18B20│
         └─────┘     └─────┘     └─────┘
```

- **Single Bus Wire**: Carries bidirectional data + parasite power
- **Ground**: Common return path
- **Power (optional)**: Can power devices directly instead of parasitic mode
- **Pull-up Resistor**: Keeps line high when idle; 4.7kΩ recommended

### Bus Detection

The 1-Wire controller automatically detects available buses:

```
┌──────────────────────────────────────┐
│ 1-Wire Bus Detection                 │
├──────────────────────────────────────┤
│ Linux: Check /sys/devices/w1_bus_*   │
│        Parse w1_master_* attributes  │
│                                      │
│ Mock: Create sample buses 1–3        │
└──────────────────────────────────────┘
```

### Detected Bus Format

```json
{
  "busNumber": 1,
  "name": "w1_bus_master1",
  "path": "/sys/devices/w1_bus_master1",
  "driver": "w1_gpio"
}
```

## Device Initialization Flow

```
┌────────────────────────────────────────┐
│ 1-Wire Controller Init                │
└─────────────┬─────────────────────────┘
              │
      ┌───────▼──────────────────┐
      │ For each detected bus:   │
      │                          │
      │ ├─ Create oneWireBus    │
      │ ├─ Enumerate devices    │
      │ └─ Load w1_master path  │
      └───────┬──────────────────┘
              │
      ┌───────▼──────────────────┐
      │ For each device:        │
      │                          │
      │ ├─ Read ROM code        │
      │ ├─ Identify family code │
      │ ├─ Create device inst   │
      │ │  (e.g., OneWireTemperat│
      │ ├─ Load device type def │
      │ ├─ Call initAsync()     │
      │ ├─ Set default options  │
      │ ├─ Read device info     │
      │ ├─ Take first reading   │
      │ └─ Start poll timer     │
      └───────┬──────────────────┘
              │
      ┌───────▼──────────────────┐
      │ Bus ready for reads     │
      └──────────────────────────┘
```

## Device Discovery

1-Wire devices are discovered via sysfs enumeration:

```
/sys/bus/w1/devices/
├── 28-0000014a8b5a          ← DS18B20 ROM address
│   ├── w1_slave             ← Temperature reading
│   ├── power                ← Power mode (parasite/external)
│   ├── resolution           ← Configured bit depth
│   ├── temperature          ← Last reading (cached)
│   ├── ext_power            ← Power supply check
│   ├── alarms               ← Threshold registers
│   └── conv_time            ← Conversion timeout
```

### ROM Address Format

64-bit unique device identifier:

```
[Family Code (8 bits)] [ID (48 bits)] [CRC (8 bits)]
                         └─────────────────────────────┘
                         Uniquely identifies device
                         across all 1-Wire networks
```

**Example**: `28-0000014a8b5a`
- Family: 0x28 (DS18B20)
- ID: 0x0000014a8b5a (device serial)
- CRC: 0x5a (checksum)

## Data Acquisition: Temperature Reading

```
┌────────────────────────────────┐
│ Poll Timer (e.g., 3–5 sec)    │
└────────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Read sysfs file:           │
    │ /sys/bus/w1/devices/       │
    │ <ROM>/w1_slave             │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Parse raw output:          │
    │ <CRC> <Count> <T>          │
    │ Example:                   │
    │ 01 4b 4b 7f ff 05 10 6c :  │
    │ crc=6c YES                 │
    │ t=27312                    │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Validate CRC               │
    │ ├─ If CRC fails: error     │
    │ ├─ If CRC valid: continue  │
    │ └─ Mark health status      │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Extract temperature value  │
    │ ├─ Raw value: t=27312      │
    │ ├─ Resolution: 12-bit      │
    │ ├─ Calculation:            │
    │ │  temp_C = t / 1000       │
    │ │  temp_C = 27.312°C       │
    │ └─ Apply calibration       │
    │    final_temp = t - cal_  │
    │                offset     │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Convert units if needed:   │
    │ ├─ Celsius → Fahrenheit    │
    │ │  F = (C × 9/5) + 32      │
    │ └─ Output in configured    │
    │    units (C or F)          │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Update device readings:    │
    │ ├─ Store in cache          │
    │ ├─ Update feed outputs     │
    │ └─ Emit event to Web UI    │
    └────────┬───────────────────┘
             │
    ┌────────▼───────────────────┐
    │ Schedule next read         │
    │ (poll interval restart)    │
    └───────────────────────────┘
```

## 1-Wire Protocol Basics

### Transmission Layers

```
Physical Layer:
  - Open-drain/open-collector output
  - Pull-up resistor to 3.3V
  - Time slot: 60 µs (read), 120 µs (write)
  - Bit transmission: 1–15 µs pulse = 1, 16–60 µs = 0

Link Layer (Device Access):
  - ROM commands (Search, Skip, Overdrive)
  - Device selection by ROM address
  - Collision detection

Function Layer (Data Exchange):
  - Device-specific commands (Temp conversion, Read scratchpad)
  - CRC error detection
```

### Temperature Conversion Sequence

```
1. Send Reset pulse
   Master pulls line low for 480+ µs
   Slave responds with presence pulse

2. Skip ROM or Match ROM
   (Broadcast or address-specific command)

3. Send Convert Temperature (0x44)
   Start temperature measurement
   Wait for conversion (94–750 ms)

4. Send Reset pulse again

5. Skip ROM or Match ROM

6. Send Read Scratchpad (0xBE)
   Master clocks in 9 bytes:
   - Bytes 0–1: Temperature value
   - Bytes 2–3: Alarm thresholds
   - Byte 4: Configuration (resolution)
   - Bytes 5–8: CRC, Reserved

7. Extract temperature from bytes 0–1
```

## Multi-Device Handling

### Single Bus, Multiple Devices

Up to 127 DS18B20 sensors can coexist on one 1-Wire bus:

```
┌─────────────────────────────────┐
│ Convert Temperature (broadcast) │
├─────────────────────────────────┤
│ All devices start conversion    │
│ simultaneously                  │
│ (up to 750 ms for 12-bit)      │
└──────────────┬──────────────────┘
               │
        ┌──────▼─────────────────┐
        │ For each device:       │
        │                        │
        │ ├─ Match ROM to addr   │
        │ ├─ Read scratchpad     │
        │ ├─ Extract temperature │
        │ ├─ Update cache        │
        │ └─ Emit event          │
        └──────────────────────┘
```

### Search Algorithm

Devices can be discovered via 1-Wire search:

```
Search(bus):
  discrepancy = 0
  do:
    for each bit position (0–63):
      send 1s pulse
      read bit from all devices
      if no response: invalid
      if conflict: remember discrepancy
      send bit value to select path
  until discrepancy found or done
  collect all responding ROM addresses
return device_list
```

## Device Configuration

### Temperature Resolution

Programmable resolution affects conversion time:

| Resolution | Bits | LSB | Conversion Time | Accuracy |
|------------|------|-----|-----------------|----------|
| 9-bit | 9 | 0.5°C | 94 ms | ±1.0°C |
| 10-bit | 10 | 0.25°C | 188 ms | ±0.5°C |
| 11-bit | 11 | 0.125°C | 375 ms | ±0.5°C |
| 12-bit (default) | 12 | 0.0625°C | 750 ms | ±0.5°C |

### Alarm Thresholds

Devices support upper/lower temperature alarms (stored in EEPROM):

```json
{
  "alarmLow": 0,
  "alarmHigh": 30,
  "resolution": 12
}
```

- Alarms in configuration register only (not interrupt capability in software)
- Used for device identification and safety checks

### Unit Configuration

```json
{
  "options": {
    "units": "C"  // or "F" for Fahrenheit
  }
}
```

Conversion happens at acquisition time.

## Configuration Example

```json
{
  "busNumber": 1,
  "isActive": true,
  "devices": [
    {
      "id": "temp-sensor-1",
      "address": "28-0000014a8b5a",
      "name": "System Temperature",
      "isActive": true,
      "deviceType": "OneWireTemperature",
      "options": {
        "units": "C",
        "calibration": 0.0,
        "resolution": 12
      },
      "feeds": [
        {
          "id": "temp-reading",
          "name": "Temperature",
          "type": "output"
        }
      ]
    }
  ]
}
```

## Error Handling

### Communication Errors

- **CRC Mismatch**: Data corruption detected; retry read
- **No Presence Pulse**: Device not responding; mark unhealthy
- **Timeout**: Conversion takes longer than expected; extend timeout

### Device Errors

- **Invalid ROM Code**: CRC check on address fails; skip device
- **Temperature Out of Range**: Clamp to min/max or mark error
- **Power Mode Mismatch**: Parasite power insufficient; warn user

### Recovery Strategy

```
Error detected:
  ├─ Increment error counter
  ├─ If counter < max_retries:
  │  └─ Retry after backoff delay
  └─ If counter >= max_retries:
     ├─ Mark device unhealthy
     ├─ Log error
     └─ Skip future reads until restart
```

## Platform Support

- **Linux**: Native w1_gpio kernel driver with sysfs interface
- **Mock Mode**: Simulated temperature values for testing
- **Manual Reset**: `oneWireController.resetAsync()` to re-enumerate devices

## Parasite Power Mode

DS18B20 can operate without external power supply:

```
Parasite Power Sequence:
  1. Master powers line high during conversion
  2. Slave uses stored charge in internal capacitor
  3. Line pulled low by other devices after conversion
  4. Conversion completes before capacitor drains

Limitations:
  - Slower conversion (relies on timing)
  - Bus must have strong pull-up resistor
  - Max 2–3 devices recommended on parasite power
  - Full bus stress at high temperatures

Recommended:
  - Use external power supply for reliability
  - 3.3V from separate power rail
  - One pull-up per 4–8 devices on parasite power
```

## Performance Characteristics

- **Discovery Latency**: 50–100 ms (search algorithm)
- **Single Read Latency**: 750 ms (12-bit conversion time)
- **Multi-Device Read**: Parallel acquisition; total time = longest device
- **Max Devices**: 127 per bus
- **Bus Speed**: 15.4 kbps standard mode; 125 kbps overdrive mode

## Polling Frequency

Typical configuration:

```json
{
  "pollInformationInterval": 3000,  // Device info poll (ms)
  "pollReadings": 5000              // Temperature read poll (ms)
}
```

- Information poll: Checks device presence, power mode, status (every 3 sec)
- Readings poll: Acquires new temperature data (every 5 sec)

## Synchronization with Other Interfaces

1-Wire can coexist with:
- **GPIO**: Uses dedicated GPIO pin (typically GPIO4 on RPi)
- **I2C**: Separate bus (no contention)
- **SPI**: Separate bus (no contention)

## Troubleshooting

### Device Not Found

1. Check physical connection (pull-up resistor in place)
2. Verify GPIO pin assignment in config
3. Check kernel module `w1_gpio` is loaded: `lsmod | grep w1_gpio`
4. Verify `/sys/devices/w1_bus_master*` exists

### CRC Errors

1. Check pull-up resistor value (should be 4.7kΩ ±5%)
2. Verify cable length (limit to 10m for best reliability)
3. Reduce bus speed (less likely to happen, but slower)
4. Add ferrite choke on wire near Raspberry Pi

### Slow Temperature Readings

1. 12-bit resolution requires 750 ms conversion
2. Multi-device bus extends total read time
3. Increase poll interval if reading blocking
4. Consider reducing resolution to 11-bit (375 ms)

## See Also

- [Architecture Overview](../architecture/architecture.md)
- [Component PRD](../setup/component-prd.md)
- [Web UI Documentation](../api/web-ui.md)
- DS18B20 Datasheet: Maxim Integrated
- 1-Wire Protocol Specification: Maxim Integrated
- Linux w1_gpio Kernel Driver: kernel.org
