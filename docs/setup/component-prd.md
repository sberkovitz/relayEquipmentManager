# Component Product Requirements Documents

## Overview

This document outlines the product requirements for the major architectural components of Relay Equipment Manager (REM). Each component has specific responsibilities, interfaces, and quality requirements.

---

## 1. Controller Component

### Purpose
The Controller is the central orchestration component that initializes all other subsystems, manages hardware interfaces, and maintains system state across GPIO, I2C, SPI, and 1-Wire buses.

### Key Responsibilities
- Initialize application configuration
- Manage hardware bus discovery and initialization
- Coordinate device lifecycle across all bus types
- Maintain global system state and device registry
- Provide unified interface for device access

### Interfaces

#### Input
- Configuration file (JSON): `config.json`, `defaultController.json`
- Command-line arguments and environment variables
- Web UI requests via HTTP/WebSocket
- MQTT messages (if enabled)

#### Output
- Device state updates to Web UI
- MQTT messages to external systems
- Log messages to logging system
- Device commands to GPIO/I2C/SPI/1-Wire buses

### Supported Board Types
- **Raspberry Pi** (all models): GPIO, I2C, SPI, 1-Wire support
- **BeagleBone** (Black, Green, AI): GPIO, I2C, SPI, 1-Wire support
- **Simulation Mode**: All interfaces operate in simulation

### Key Classes and Modules

#### Controller.ts (boards/Controller.ts)
- Main controller class managing system state
- Device configuration and runtime state
- Bus interface coordination

**Key Methods:**
- `init()`: Initialize all subsystems
- `setDeviceValue(binding, value)`: Update device state
- `getDeviceValue(binding)`: Read device state
- `loadConfiguration()`: Load and parse config files
- `saveConfiguration()`: Persist configuration changes

#### Constants.ts (boards/Constants.ts)
- Value mappings and enumerations
- Pin definitions
- Device type constants
- State machine definitions

### Configuration Requirements

```json
{
  "controllerType": "raspi|beaglebone|sim",
  "gpio": { "pins": [] },
  "i2c": { "isActive": boolean },
  "spi0": { "isActive": boolean, "busNumber": 0, "channels": [] },
  "spi1": { "isActive": boolean, "busNumber": 1, "channels": [] },
  "oneWire": { "isActive": boolean },
  "genericDevices": { "isActive": boolean }
}
```

### Quality Requirements
- **Startup Time**: < 5 seconds for full initialization
- **State Consistency**: Configuration persists across restarts
- **Error Handling**: Graceful degradation on bus failures
- **Memory Usage**: < 50MB baseline (excluding devices)
- **Thread Safety**: Thread-safe state access for all concurrent operations

### Dependencies
- `i2c-bus`: I2C communication
- `onoff`: GPIO control
- `spi-device`: SPI communication
- `express`: Web server framework
- `socket.io`: Real-time communication
- `winston`: Logging

---

## 2. ConnectionBroker Component

### Purpose
The ConnectionBroker provides data flow routing between inputs (Triggers) and outputs (Feeds). It maintains connections between device states and external systems (MQTT, WebSockets, HTTP APIs).

### Key Responsibilities
- Route device state changes to connected outputs
- Manage real-time connection state
- Handle trigger-based actions and workflows
- Persist connection configurations
- Broadcast updates to connected clients

### Interfaces

#### Input
- Device state changes from Controller
- Configuration updates from Web UI
- Connection requests from remote systems

#### Output
- MQTT messages to external brokers
- WebSocket events to connected clients
- HTTP API updates
- Log messages

### Key Concepts

#### Triggers (Inputs)
- Data sources: GPIO pins, I2C registers, SPI channels, 1-Wire sensors
- Event-driven or polling-based
- Can filter or transform data
- Examples: button press, temperature threshold, relay state change

#### Feeds (Outputs)
- Data destinations: GPIO outputs, MQTT topics, WebSocket events
- Can accumulate or aggregate data
- Support various data formats
- Examples: relay control, MQTT publish, web UI update

#### Connections
- Bidirectional link between Trigger and Feed
- Can include transformation logic
- Support enable/disable states
- Configurable via Web UI or JSON

### Key Classes and Modules

#### Bindings.ts (connections/Bindings.ts)
- ConnectionBroker class: Central connection manager
- ServerConnection interface: Remote connection handling
- ConnectionBindings: Configuration data model

**Key Methods:**
- `init()`: Initialize broker and load connections
- `setConnection(trigger, feed)`: Create connection
- `removeConnection(trigger, feed)`: Remove connection
- `broadcast(data)`: Send updates to all clients
- `stopAsync()`: Graceful shutdown

### Configuration Structure

```json
{
  "connections": [
    {
      "trigger": "gpio:0:17",
      "feeds": [
        "mqtt:0:pool/pump",
        "ws:ui:relay-status"
      ]
    }
  ]
}
```

### Quality Requirements
- **Latency**: < 100ms from trigger to feed update
- **Connection Reliability**: Auto-reconnect on disconnect
- **Data Integrity**: No lost messages during transitions
- **Scalability**: Support 100+ concurrent connections
- **Memory**: Efficient storage of connection metadata

### Dependencies
- `mqtt`: MQTT communication
- `socket.io`: WebSocket communication
- `express`: HTTP server
- Controller: Device state access

---

## 3. Device Managers

### Purpose
Device Managers abstract hardware interfaces (GPIO, I2C, SPI, 1-Wire) and provide a unified device interface. Each manager handles a specific bus type with device discovery, communication, and error handling.

### Overview of Device Managers

#### 3.1 GPIO Manager (gpio/Gpio-Controller.ts)

**Responsibility**: Control GPIO pins for digital input/output

**Features:**
- Pin mode configuration (input/output)
- Pull-up/pull-down configuration
- Edge detection (rising, falling, both)
- Debouncing support
- State persistence

**Supported Devices:**
- Push buttons (input)
- Relays (output)
- LEDs (output)
- Flow switches (input)
- Generic binary sensors/actuators

**Configuration:**
```json
{
  "gpio": {
    "pins": [
      {
        "pin": 17,
        "mode": "out",
        "direction": "high",
        "activeLow": false
      }
    ]
  }
}
```

**Quality Requirements:**
- GPIO state changes within 1ms
- Support 100+ GPIO operations per second
- Prevent GPIO conflicts (same pin in use twice)
- Handle GPIO permissions correctly

#### 3.2 I2C Bus Manager (i2c-bus/I2cBus.ts)

**Responsibility**: I2C bus communication and device management

**Features:**
- Multi-device address scanning
- Register read/write operations
- Interrupt handling for devices
- Bus speed configuration
- Error recovery

**Supported Devices:**
- ADS1115 (16-bit ADC)
- Sequent Microsystems MEGA-IND (industrial I/O)
- Sequent Microsystems MEGA-BAS (building automation)
- Generic I2C devices with register interface

**Configuration:**
```json
{
  "i2c": {
    "isActive": true,
    "busNumber": 1,
    "speed": 100000
  }
}
```

**Quality Requirements:**
- Device discovery within 1 second
- I2C transaction completion < 10ms
- Support standard (100kHz) and fast (400kHz) modes
- Graceful handling of stuck bus
- CRC/checksum validation

#### 3.3 SPI/ADC Manager (spi-adc/SpiAdcBus.ts)

**Responsibility**: SPI bus communication and ADC sampling

**Features:**
- Multi-channel ADC support
- Chip selection and bus arbitration
- Configurable clock speed
- Reference voltage handling
- Channel sampling and averaging

**Supported Devices:**
- Microchip MCP3008 (8-channel 10-bit ADC)
- Microchip MCP3004 (4-channel 10-bit ADC)
- Microchip MCP3208 (8-channel 12-bit ADC)
- Microchip MCP3204 (4-channel 12-bit ADC)
- Other SPI ADC devices with compatible protocol

**Configuration:**
```json
{
  "spi0": {
    "isActive": true,
    "busNumber": 0,
    "speed": 1000000,
    "channels": [
      {
        "chip": "MCP3008",
        "address": 0,
        "channels": 8
      }
    ]
  }
}
```

**Quality Requirements:**
- ADC sampling at 100+ samples/second per channel
- Resolution accuracy within device specification
- Reference voltage stability ±0.1V
- No crosstalk between channels
- Chip select timing < 1μs

#### 3.4 1-Wire Bus Manager (one-wire/OneWireBus.ts)

**Responsibility**: 1-Wire protocol communication and device management

**Features:**
- Device discovery via presence pulse
- ROM code reading
- Parasitic power support
- Temperature sensor reading
- Family code-based device identification

**Supported Devices:**
- DS18B20/DS18S20 (temperature sensors)
- DS1990 (iButton)
- Generic 1-Wire devices

**Configuration:**
```json
{
  "oneWire": {
    "isActive": true,
    "gpioPin": 4,
    "sampleRate": 5000
  }
}
```

**Quality Requirements:**
- Device discovery within 2 seconds
- Temperature readings within ±0.5°C accuracy
- 1-Wire bus reset < 500μs
- Support parasite and powered modes
- Timeout handling on stuck bus

#### 3.5 Generic Device Manager (generic/genericDevices.ts)

**Responsibility**: Support for custom/generic devices

**Features:**
- Extensible device type system
- Custom register mapping
- Protocol-agnostic interface
- Device profile support

**Configuration:**
```json
{
  "genericDevices": {
    "isActive": true,
    "devices": [
      {
        "type": "custom-i2c",
        "address": "0x50",
        "registers": {}
      }
    ]
  }
}
```

### Common Device Manager Interface

All device managers implement a common interface:

```typescript
interface IDeviceManager {
  initAsync(): Promise<void>;
  closeAsync(): Promise<void>;
  
  // Device operations
  getDeviceValue(deviceId: number, param?: string): Promise<any>;
  setDeviceValue(deviceId: number, value: any): Promise<void>;
  
  // Configuration
  getConfiguration(): any;
  setConfiguration(config: any): Promise<void>;
  
  // Diagnostics
  getStatus(): DeviceStatus;
  getDeviceList(): DeviceInfo[];
}
```

### Quality Requirements (All Managers)

**Performance:**
- Bus scan time < 2 seconds
- Device read/write latency < 50ms
- Support 50+ concurrent device operations

**Reliability:**
- Automatic retry on transient failures
- Graceful degradation on bus errors
- State recovery on restart

**Safety:**
- Prevent brownout conditions
- Limit current draws
- Protect against reverse polarity (where applicable)

**Configurability:**
- Support custom address ranges
- Configurable polling rates
- Enable/disable individual devices

---

## System Integration Requirements

### Startup Sequence
1. Config initialization
2. Logging setup
3. Controller initialization
4. Web server startup
5. Connection broker initialization
6. GPIO manager init
7. SPI0/SPI1 bus init
8. I2C bus init
9. 1-Wire bus init
10. Generic device manager init

### Shutdown Sequence
- Reverse order of startup
- Graceful timeout for each component
- Emergency force-stop after timeout

### Error Handling
- Component failures don't cascade
- Logging all errors with full context
- Retry mechanisms for transient failures
- Circuit breaker pattern for persistent failures

### Testing Requirements
- Unit tests for each manager
- Integration tests for bus communication
- End-to-end tests for data flow
- Performance benchmarks for latency and throughput
- Stress tests with 100+ devices

---

## Version Requirements

- **REM Version**: 8.0.0
- **Node.js**: v12+ (tested on v14, v16)
- **TypeScript**: 4.6+
- **Key Dependencies**:
  - i2c-bus: ^5.2.2
  - onoff: ^6.0.3
  - spi-device: ^3.1.2
  - express: ^4.17.3
  - socket.io: ^4.5.0
  - mqtt: ^4.3.7
  - winston: ^3.13.0
