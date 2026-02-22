# GPIO (General Purpose Input/Output) Interface

## Overview

The GPIO interface module provides digital input and output control for devices connected to GPIO pins on the Raspberry Pi or similar single-board computers. It manages pin initialization, direction configuration, state control, and device polling.

## Supported Pin Modes

| Mode | Direction | Description |
|------|-----------|-------------|
| **Output** | `out` | Pin set to output state; drives low or high signal |
| **Input** | `in` | Pin set to input state; reads incoming signal |
| **Inverted** | `out`/`in` | Pin logic inverted (active low); configured via `activeLow` flag |

### Pin Configuration Attributes

- **Direction**: `in` (input) or `out` (output)
- **Active Low**: Inverts pin logic when enabled
- **Debounce Timeout**: Input debounce delay in milliseconds (applies to input pins)
- **Initial State**: `last`, `on`, or `off` (specifies startup state)

## Supported Devices

### Digital Output Devices

| Device | Description | Pin Type | Control Method |
|--------|-------------|----------|-----------------|
| **Relays** | Electromagnetic switching devices | Output | High/low state toggle |
| **LED Indicators** | Light-emitting diodes for status | Output | High/low state control |
| **Switches** | Digital on/off switches | Input | Edge detection (rising/falling) |
| **Buttons** | Momentary contact input devices | Input | Event-driven polling |
| **Solenoids** | Electromechanical actuators | Output | High/low pulse control |

### Device Characteristics

- **Relays**: Support latch timers for automatic pulse/unlatch behavior
- **Buttons/Switches**: Debounce protection to eliminate contact bounce
- **LED Indicators**: Direct GPIO control without buffering

## Pin Configuration Example

```json
{
  "pinId": 1,
  "headerId": 1,
  "name": "Pump Relay",
  "direction": {
    "gpio": "out"
  },
  "isInverted": false,
  "isActive": true,
  "initialState": "off",
  "debounceTimeout": 0
}
```

## Device Initialization Flow

```
┌─────────────────────────────────────┐
│ GPIO Controller Init                │
└──────────┬──────────────────────────┘
           │
           ├─ Load pinout definitions from configuration
           │
           ├─ For each active GPIO pin:
           │  ├─ Verify pin is available and not exported
           │  ├─ Determine direction (in/out)
           │  ├─ Create GPIO instance with onoff library
           │  ├─ Set active-low flag if inverted
           │  ├─ Configure initial state
           │  └─ Register event handlers (for input pins)
           │
           └─ Ready for state polling and control
```

## Data Flow: Reading Input Pins

```
GPIO Hardware (Pin voltage)
        │
        ├─ Edge detection (if configured)
        │
        ├─ Debounce filtering (if timeout > 0)
        │
        ├─ Convert to logical state (active-high/low)
        │
        ├─ Update pin comms state
        │
        └─ Trigger device feed updates → Web UI/Feeds
```

## Data Flow: Writing Output Pins

```
Device Control Command
        │
        ├─ Map state to GPIO direction (on/off → high/low)
        │
        ├─ Apply active-low inversion if configured
        │
        ├─ Write to GPIO hardware via onoff.write()
        │
        ├─ Update pin state cache
        │
        └─ Emit state change event
```

## Device Support Matrix

| Interface | Supported | Max Pins | Multiple Buses |
|-----------|-----------|----------|-----------------|
| GPIO | ✓ | 28 (BCM) | Single (per RPi) |
| I2C | ✗ | - | - |
| SPI | ✗ | - | - |
| 1-Wire | ✗ | - | - |

## Control API

### Pin State Control

```typescript
// Set output pin high
pin.gpio.write(1, callback);

// Set output pin low
pin.gpio.write(0, callback);

// Read input pin
pin.gpio.read(callback);

// Watch for input changes
pin.gpio.watch(callback);
```

### Pin Lifecycle

```typescript
// Initialize pins
gpioCont.init();

// Reset all pins
await gpioCont.reset();

// Stop and unexport all pins
await gpioCont.stopAsync();
```

## Latch Timer Support

GPIO-controlled relays can be configured with automatic latch timers:

```json
{
  "state": true,
  "latch": 500  // Automatically unlatch after 500ms
}
```

When a latch value is provided, the relay:
1. Sets to active state
2. Starts a timer for the specified milliseconds
3. Automatically returns to inactive state when timer expires

## Platform Support

- **Linux**: Uses `onoff` library for real GPIO access via `/sys/class/gpio`
- **Non-Linux**: Falls back to MockGpio for testing/development
- **Export Status**: Tracks which GPIO pins are exported to prevent conflicts

## Error Handling

- **Pin Already Exported**: Logs error; attempts to unexport if inactive
- **Invalid Pin Direction**: Falls back to default or skips pin
- **Hardware Unavailable**: Falls back to mock implementation

## Performance Characteristics

- **Read Latency**: <5ms (depends on GPIO hardware)
- **Write Latency**: <5ms (kernel-mediated)
- **Debounce Resolution**: Configurable, typically 10-50ms
- **Max Poll Frequency**: ~100 Hz (via node.js event loop)

## See Also

- [Architecture Overview](../architecture/architecture.md)
- [Component PRD](../setup/component-prd.md)
- [Web UI Documentation](../api/web-ui.md)
