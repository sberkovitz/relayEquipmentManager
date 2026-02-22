# I2C (Inter-Integrated Circuit) Interface

## Overview

The I2C interface module provides communication with multiple I2C-based sensor and control devices over one or more I2C buses. It manages bus detection, device initialization, multi-device arbitration, and data acquisition from I2C slaves.

## Supported I2C Devices

### ADC (Analog-to-Digital Converters)

| Device | Model | Channels | Resolution | I2C Address(es) |
|--------|-------|----------|------------|------------------|
| **ADS1x15** | ADS1015 / ADS1115 | 4 differential | 12-bit / 16-bit | 0x48–0x4B |
| **ADS1x15** | Supports single-ended & differential | 4 | 12–16 bit | Multiple (0x48–0x4B) |

#### ADS1x15 Features
- Programmable gain amplifier (PGA): 2/3x to 16x
- Sample rates: 128–3300 SPS (samples per second)
- Single-shot or continuous conversion mode
- Configurable voltage range (0.256V to 6.144V)
- Comparator with latching, threshold, and polling modes

### Multi-Relay/IO Boards

| Device | Manufacturer | Type | Relays/IOs | I2C Address |
|--------|--------------|------|-----------|-------------|
| **Sequent Boards** | Sequent | Relay Controller | 4–16 relays | 0x20–0x27 |
| **MEGA-IND** | Sequent | Industrial IO | Mixed | 0x20–0x27 |
| **MEGA-IO** | Sequent | General IO | Mixed | 0x20–0x27 |
| **SEQ-4RelInd** | Sequent | Industrial Relay | 4 relays | 0x20–0x27 |
| **I2C Relay Board** | Generic | Multi-Relay | 1–32 relays | 0x20–0x7F |

### Sensor Devices

| Device | Type | Outputs | I2C Address |
|--------|------|---------|-------------|
| **AtlasEZO** | Analog sensors | pH, ORP, Conductivity, Dissolved O₂ | 0x48–0x6F |
| **Sequent Watchdog** | System monitor | Temperature, power status | 0x20–0x27 |
| **Sequent SmartFan** | Fan controller | PWM control, temperature monitoring | 0x20–0x27 |

## Device Support Matrix

| Interface | Supported | Max Devices | Multiple Buses |
|-----------|-----------|-------------|-----------------|
| GPIO | ✗ | - | - |
| **I2C** | ✓ | 127 (per bus) | Multiple (bus 0, 1, ...) |
| SPI | ✗ | - | - |
| 1-Wire | ✗ | - | - |

## I2C Bus Configuration

### Bus Detection

The I2C controller automatically detects available buses on startup:

```
┌──────────────────────────────────────┐
│ I2C Bus Detection                    │
├──────────────────────────────────────┤
│ Check: /proc/bus/i2c (if available)  │
│ Check: /sys/class/i2c-dev (Linux)    │
│ Parse: driver, name, bus number      │
│ Mock: Non-Linux platforms            │
└──────────────────────────────────────┘
```

### Active Bus List

```json
{
  "busNumber": 1,
  "isActive": true,
  "devices": [
    {
      "id": "adc-1",
      "name": "Main ADC",
      "address": 72,
      "deviceType": 700
    }
  ]
}
```

## Device Initialization Flow

```
┌─────────────────────────────────────────────┐
│ I2C Controller Init                         │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴───────┐
         │ For each bus: │
         └───────┬───────┘
                 │
         ┌───────▼────────────────────────┐
         │ Create i2cBus instance         │
         │ Open bus via i2c-bus library   │
         │ Set clock speed (standard MHz) │
         └───────┬────────────────────────┘
                 │
         ┌───────▼────────────────────────┐
         │ For each device on bus:        │
         │                                │
         │ ├─ Scan address                │
         │ ├─ Identify device type        │
         │ ├─ Load device factory         │
         │ ├─ Create device instance      │
         │ ├─ Call initAsync()            │
         │ ├─ Configure options           │
         │ └─ Start polling/listeners     │
         └───────┬────────────────────────┘
                 │
         ┌───────▼────────────────────────┐
         │ Emit "bus ready" event         │
         └────────────────────────────────┘
```

## Data Acquisition: ADS1x15 ADC

```
┌────────────────────────────────┐
│ Polling Loop (configurable Hz) │
└────────────┬───────────────────┘
             │
    ┌────────▼──────────┐
    │ Write config reg  │
    │ + channel select  │
    │ + PGA gain        │
    │ + SPS rate        │
    └────────┬──────────┘
             │
    ┌────────▼──────────┐
    │ Wait conversion   │
    │ (1/SPS seconds)   │
    └────────┬──────────┘
             │
    ┌────────▼──────────┐
    │ Read data register│
    │ (16-bit result)   │
    └────────┬──────────┘
             │
    ┌────────▼──────────────────────┐
    │ Convert raw value:            │
    │ ├─ Mask to resolution bits    │
    │ ├─ Apply calibration offset   │
    │ ├─ Scale by PGA/Vref          │
    │ └─ Output voltage (V)         │
    └────────┬──────────────────────┘
             │
    ┌────────▼──────────┐
    │ Update device     │
    │ feed outputs      │
    └────────┬──────────┘
             │
    ┌────────▼──────────────────────┐
    │ Emit event to Web UI / Feeds   │
    └────────────────────────────────┘
```

## Data Control: Sequent Relay Board

```
Control Command (relay #, state)
         │
         ├─ Validate relay ID (1–N)
         │
    ┌────▼──────────────────┐
    │ Read current state    │
    │ reg(relayIn/relayOut) │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Modify bit for relay  │
    │ (set/clear based on   │
    │  state + inversion)   │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Write config register │
    │ (relay cfg + state)   │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Read back to verify   │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Update local state    │
    └────┬──────────────────┘
         │
    └────▶ Relay physically switches
```

## I2C Address Range

Standard I2C addressing scheme:

| Address Range | Usage |
|---------------|-------|
| 0x00–0x07 | Reserved (general call, etc.) |
| 0x08–0x77 | General-purpose devices |
| 0x78–0x7B | Reserved (10-bit addressing) |
| 0x7C–0x7F | Reserved (future use) |

### Common Device Addresses

- **ADS1x15 ADC**: 0x48–0x4B (ADDR pin selectable)
- **Sequent Boards**: 0x20–0x27 (jumper selectable)
- **I2C Relays**: 0x20–0x7F (configurable)

## Device Factory Pattern

The I2C module uses a factory pattern to instantiate correct device handlers:

```typescript
const deviceType = detectDeviceType(address);
const device = i2cDeviceFactory.create(deviceType, options);
await device.initAsync(deviceDefinition);
```

## Multi-Device Communication

### Arbitration

- All devices on a bus share SCL/SDA lines
- I2C hardware arbitration via clock-stretching
- Software prioritization: poll high-priority devices first

### Polling Strategy

1. **Default**: Sequential polling of all devices (configurable Hz)
2. **Interrupt-Driven**: Some devices support INT pin (unimplemented)
3. **Mixed**: High-priority devices polled frequently, low-priority at longer intervals

## Clock Speed Configuration

Standard I2C clock speeds:

| Speed | Frequency | Typical Usage |
|-------|-----------|---------------|
| **Standard** | 100 kHz | Generic sensors, long cable |
| **Fast** | 400 kHz | Most ADCs, relays (default) |
| **Fast Plus** | 1 MHz | High-speed sensors (requires short cable) |

## Platform Support

- **Linux**: Uses `i2c-bus` npm module for `/dev/i2c-*` access
- **Non-Linux**: Falls back to mockI2c for testing
- **Bus Detection**: Automatic via `/proc/bus/i2c` or `/sys/class/i2c-dev`

## Error Handling

### Bus-Level Errors

- **Bus Not Found**: Logs warning; skips undetected buses
- **Bus Busy**: Retries with exponential backoff
- **Clock Stretch Timeout**: Device not responding; marks unhealthy

### Device-Level Errors

- **Address Collision**: Detects at init; prevents duplicate registration
- **Read Timeout**: Device not responding; retries with exponential backoff
- **Invalid Data**: CRC check fails; logs error; skips frame

## Performance Characteristics

- **Bus Scan Time**: ~100ms per 127 addresses (at 400 kHz)
- **Single Read Latency**: 1–5ms (register read + conversion)
- **Max Polling Frequency**: ~100 Hz (per device)
- **Multi-Device**: Throughput degrades linearly with device count

## Synchronization with Other Interfaces

I2C can coexist with:
- **GPIO**: Independent pin allocation
- **SPI**: Separate bus (no contention)
- **1-Wire**: Separate interface (no contention)

## Configuration Example

```json
{
  "busNumber": 1,
  "isActive": true,
  "devices": [
    {
      "id": "adc-main",
      "address": 72,
      "deviceType": 700,
      "name": "Main Voltage ADC",
      "options": {
        "mode": "continuous",
        "sps": 128,
        "channels": [1, 2, 3, 4]
      }
    },
    {
      "id": "relay-io",
      "address": 32,
      "deviceType": 300,
      "name": "Sequent Relay Board",
      "options": {
        "maxRelays": 16
      }
    }
  ]
}
```

## See Also

- [Architecture Overview](../architecture/architecture.md)
- [Component PRD](../setup/component-prd.md)
- [Web UI Documentation](../api/web-ui.md)
- ADS1x15 Datasheet: TI ADS1115/ADS1015
- Sequent Board Documentation: Sequent Microsystems
