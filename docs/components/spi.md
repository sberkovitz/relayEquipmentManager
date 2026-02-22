# SPI ADC (Serial Peripheral Interface Analog-to-Digital Converter)

## Overview

The SPI ADC interface module provides high-speed analog-to-digital conversion for multiple channels via SPI protocol. It supports Microchip MCP series ADCs with configurable multi-device handling on a single SPI bus.

## Supported Devices

### Microchip (MCP) ADC Chips

| Model | Resolution | Channels | Speed | Notes |
|-------|------------|----------|-------|-------|
| **MCP3002** | 10-bit | 2 | 1.2 MHz | Low-cost, compact |
| **MCP3004** | 10-bit | 4 | 1.35 MHz | Popular entry-level |
| **MCP3008** | 10-bit | 8 | 1.35 MHz | Most common 10-bit |
| **MCP3202** | 12-bit | 2 | 0.9 MHz | Higher precision 2-ch |
| **MCP3204** | 12-bit | 4 | 1.0 MHz | Balanced precision/speed |
| **MCP3208** | 12-bit | 8 | 1.0 MHz | Most popular 12-bit |
| **MCP3302** | 13-bit | 2 | 1.0 MHz | Highest precision 2-ch |
| **MCP3304** | 13-bit | 4 | 1.05 MHz | Extended precision |
| **MCP3308** | 13-bit | 8 | 1.05 MHz | Highest precision 8-ch |

### Device Capabilities by Resolution

| Resolution | Bits | LSB (Vref=5V) | Typical Use |
|------------|------|---------------|-------------|
| 10-bit | 10 | 4.88 mV | General analog inputs (temperature, pressure) |
| 12-bit | 12 | 1.22 mV | Better precision sensors (strain gauges) |
| 13-bit | 13 | 0.61 mV | High-precision measurement (scales, lab equipment) |

## Device Support Matrix

| Interface | Supported | Max Devices | Multiple Buses |
|-----------|-----------|-------------|-----------------|
| GPIO | ✗ | - | - |
| I2C | ✗ | - | - |
| **SPI** | ✓ | 8–32 (via CS lines) | Multiple (bus 0, 1, ...) |
| 1-Wire | ✗ | - | - |

## SPI Bus Configuration

### Physical Pin Mapping

Standard SPI pinout on Raspberry Pi:

| Pin | Signal | Description |
|-----|--------|-------------|
| GPIO 11 (17) | SCLK | Serial clock (Master → Slave) |
| GPIO 10 (27) | MOSI | Master out, slave in (data → ADC) |
| GPIO 9 (25) | MISO | Master in, slave out (data ← ADC) |
| GPIO 8 (24) | CE0 | Chip enable 0 (ADC device select) |
| GPIO 7 (25) | CE1 | Chip enable 1 (optional second ADC) |

### Reference Voltage Configuration

```json
{
  "busNumber": 0,
  "adcChipType": 4,
  "referenceVoltage": 5.0,
  "channels": [
    { "id": 1, "name": "Voltage In", "sampling": 1 },
    { "id": 2, "name": "Current Sense", "sampling": 4 }
  ]
}
```

- **Vref = 5.0V**: 10-bit at ~5mV/step; 12-bit at ~1.2mV/step
- **Vref = 3.3V**: 10-bit at ~3.2mV/step; 12-bit at ~0.8mV/step
- **Vref = 2.048V**: For lab-grade precision (requires external reference)

## Device Initialization Flow

```
┌──────────────────────────────────────┐
│ SPI ADC Controller Init               │
└────────────┬─────────────────────────┘
             │
     ┌───────▼──────────────────┐
     │ For each SPI bus:        │
     │                          │
     │ ├─ Create SpiAdcBus inst │
     │ ├─ Load ADC chip def     │
     │ ├─ Set SPI clock speed   │
     │ └─ Set Vref              │
     └───────┬──────────────────┘
             │
     ┌───────▼──────────────────┐
     │ For each channel:        │
     │                          │
     │ ├─ Create SpiAdcChannel  │
     │ ├─ Set device type       │
     │ ├─ Open SPI device via   │
     │ │  spi-device library    │
     │ ├─ Configure options     │
     │ ├─ Start poll timer      │
     │ └─ Register feed updates │
     └───────┬──────────────────┘
             │
     ┌───────▼──────────────────┐
     │ Bus ready for reads      │
     └──────────────────────────┘
```

## Multi-Device Handling on Single Bus

### Chip Select (CS) Line Control

Multiple MCP ADCs can share SCLK/MOSI/MISO with individual CS lines:

```
     Raspberry Pi
     ┌────────────────┐
     │  GPIO 8 (CE0)  │◄─────┐
     │  GPIO 7 (CE1)  │◄─────┼─── CS multiplexing
     │  GPIO 25 (CE2) │◄─────┐
     │                │
     │  SCLK (GPIO11) │──────┬─────┬─────┐
     │  MOSI (GPIO10) │──────┼─────┼─────┤
     │  MISO (GPIO9)  │◄─────┼─────┼─────┤
     └────────────────┘      │     │     │
                           ┌─▼──┐ │     │
                           │ADC1│ │     │
                           └────┘ │     │
                              ┌─▼──┐  │
                              │ADC2│  │
                              └────┘  │
                                  ┌─▼──┐
                                  │ADC3│
                                  └────┘
```

### Sequential Read Protocol

```
For each SPI channel:
  1. Activate CS line (pull low)
  2. Send read command for requested channel:
     ├─ MCP3008: [0x01, 0x80 + (ch << 4), 0x00]
     ├─ MCP3208: [0x06 + (ch >> 2), (ch & 0x03) << 6, 0x00]
     └─ MCP3004: [0x01, 0x80 + (ch << 4), 0x00]
  3. Receive 2–3 bytes with ADC result
  4. Deactivate CS line (pull high)
  5. Extract raw value (10–13 bit):
     ├─ MCP3008: ((buffer[1] & 0x03) << 8) + buffer[2]
     ├─ MCP3208: ((buffer[1] & 0x0F) << 8) + buffer[2]
     └─ MCP3004: ((buffer[1] & 0x03) << 8) + buffer[2]
```

### Sampling Configuration

The `sampling` parameter controls multi-sample averaging:

```json
{
  "id": 1,
  "name": "Voltage Channel 1",
  "sampling": 4
}
```

**Effect**: Takes 4 consecutive readings and averages them.

```
┌──────────────────────┐
│ Read Sample[0]       │
├──────────────────────┤
│ Read Sample[1]       │
├──────────────────────┤
│ Read Sample[2]       │
├──────────────────────┤
│ Read Sample[3]       │
├──────────────────────┤
│ Average = (S0+S1+S2+ │
│           S3) / 4    │
├──────────────────────┤
│ Output value         │
└──────────────────────┘
```

## Data Acquisition Flow

```
┌─────────────────────────────────┐
│ Poll Timer (configurable Hz)    │
└────────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ For each active channel:    │
    │                             │
    │ 1. Activate CS              │
    │ 2. Send read command        │
    │ 3. Clock out ADC result     │
    │ 4. Deactivate CS            │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Extract raw bits:           │
    │ ├─ Mask to resolution       │
    │ ├─ Shift to LSB             │
    │ └─ Store in buffer          │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Multi-sample averaging:     │
    │ ├─ Buffer samples[]         │
    │ ├─ Sum all samples          │
    │ ├─ Divide by sampling count │
    │ └─ Result: smoothed raw     │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Calibration & conversion:   │
    │ ├─ Apply calibration offset │
    │ ├─ Scale: raw → voltage     │
    │ │  voltage = (raw / maxRaw) │
    │ │            × Vref         │
    │ ├─ Apply device transform   │
    │ │  (if defined in dev type) │
    │ └─ Result: engineering unit │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Update device feeds:        │
    │ ├─ ch1.voltage = X.XXV      │
    │ ├─ ch2.voltage = Y.YYV      │
    │ └─ ch1.value = raw value    │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Emit event to Web UI/Feeds  │
    └────────────────────────────┘
```

## SPI Clock Speed Control

Each MCP ADC has maximum SPI clock specifications:

```json
{
  "chipId": 1,
  "name": "MCP3008",
  "spiClock": 1350,
  "bits": 10,
  "maxChannels": 8
}
```

Actual SPI clock used:

```
spiClockHz = max(
  defSpiClock (from chip definition),
  configuredSpiClock (from bus config)
)
```

- Faster clock = faster reads but more noise
- Slower clock = lower noise but fewer samples/sec

## Configuration Example

```json
{
  "busNumber": 0,
  "isActive": true,
  "adcChipType": 4,
  "referenceVoltage": 5.0,
  "channels": [
    {
      "id": 1,
      "name": "Pump Flow Rate",
      "isActive": true,
      "deviceId": 500,
      "sampling": 8,
      "options": {
        "calibration": 0.0,
        "scale": 1.0
      },
      "feeds": [
        {
          "id": "flow-rate",
          "name": "Flow Rate",
          "type": "output"
        }
      ]
    }
  ]
}
```

## Predefined vs. Custom Chip Definitions

### Predefined Chips
Located in: `/spi-adc/microchip.json`
- Standard MCP series
- Optimized SPI parameters
- Immutable (read-only)

### Custom Chips
Located in: `/spi-adc/custom-adc.json`
- User-defined ADC specifications
- Dynamically loaded on startup
- Modifiable via API

### Chip Definition Format

```json
{
  "id": 1,
  "manufacturer": "Microchip Technology",
  "name": "MCP3008",
  "bits": 10,
  "maxChannels": 8,
  "spiClock": 1350.0,
  "transferLength": 3,
  "readChannel": "return Buffer.from([0x01, 0x80 + (channel << 4), 0x00]);",
  "getValue": "return ((buffer[1] & 0x03) << 8) + buffer[2];"
}
```

- `readChannel`: Function body (compiled at runtime) that generates SPI read command
- `getValue`: Function body that extracts value from response buffer
- `transferLength`: Bytes transferred (usually 3 for MCP ADCs)

## Precision and Noise Characteristics

### Noise Sources

1. **Quantization Noise**: ±0.5 LSB (inherent to resolution)
2. **Reference Noise**: ±1–2% (depends on Vref power supply)
3. **Crosstalk**: ~0.1% (between channels on same chip)
4. **Thermal Noise**: <±1 LSB (temperature dependent)

### Typical Performance

| Resolution | Noise Floor | Effective Bits |
|------------|-------------|-----------------|
| 10-bit | ±2–4 LSB | 8–9 effective |
| 12-bit | ±4–8 LSB | 10–11 effective |
| 13-bit | ±8–16 LSB | 11–12 effective |

**Mitigation**: Use multi-sampling (averaging) to improve effective resolution:
- 4x sampling → +1 bit effective resolution
- 16x sampling → +2 bits effective resolution

## Platform Support

- **Linux**: Uses `spi-device` npm module for `/dev/spidev*` access
- **Non-Linux**: Falls back to mockSpi for testing
- **Device Path**: `/dev/spidev<bus>.<chip-select>`

## Error Handling

### Bus-Level Errors

- **Device Not Found**: Logs error; skips channel
- **SPI Transfer Timeout**: Retries with exponential backoff
- **Invalid Response**: Data validation fails; marks channel unhealthy

### Channel-Level Errors

- **Out-of-Range Value**: Clamps to 0 or max raw value
- **Sampling Incomplete**: Uses partial average
- **Calibration Mismatch**: Falls back to uncalibrated value

## Performance Characteristics

- **Single Read Latency**: 10–30 µs (SPI transaction)
- **Multi-Sample Time**: Sampling × 30 µs (e.g., 4× = 120 µs)
- **Max Polling Frequency**: ~5–10 kHz (per channel, limited by device & SPI speed)
- **Throughput**: 8 channels × 100 Hz = 800 samples/sec typical

## Synchronization with Other Interfaces

SPI can coexist with:
- **GPIO**: Independent pins (except CS multiplexing)
- **I2C**: Separate bus (no contention)
- **1-Wire**: Separate interface (no contention)

## See Also

- [Architecture Overview](../architecture/architecture.md)
- [Component PRD](../setup/component-prd.md)
- [Web UI Documentation](../api/web-ui.md)
- MCP3008/MCP3208 Datasheet: Microchip Technology
- SPI Interface Specification: SPI Alliance
