# Relay Equipment Manager - System Architecture

## Overview

Relay Equipment Manager is a Node.js/TypeScript application that manages IoT devices and relays via multiple communication protocols and hardware interfaces. The system provides centralized control, data collection, and remote access through MQTT, WebSocket, and REST APIs.

## System Layers

### 1. **Application Entry Point** (`app.ts`)
- Orchestrates initialization and graceful shutdown
- Manages component lifecycle in proper sequence
- Handles platform-specific signal handling (Windows/Unix)

### 2. **Core Components**

#### **Controller** (`boards/Controller.ts`)
- Central system orchestrator managing all device configurations
- Maintains state of GPIO, I2C, SPI, and 1-Wire buses
- Manages device bindings and configuration persistence
- Provides device input/output lookups
- Stores connections, triggers, feeds, and generic devices

#### **WebServer** (`web/Server.ts`)
- Serves HTTP/HTTPS REST API and dashboard UI
- Implements Socket.io for real-time WebSocket communication
- Provides mDNS and SSDP discovery services
- Exposes state and configuration endpoints
- Routes requests through service handlers (Config, State, etc.)

#### **ConnectionBroker** (`connections/Bindings.ts`)
- Routes data between system components and external systems
- Manages listener lifecycle for different connection types
- Implements trigger-to-feed data flow routing
- Supports multiple connection types: MQTT, WebSocket, njspc
- Tracks ServerConnection instances and device triggers

#### **Hardware Bus Managers**
- **GPIO Controller** (`gpio/Gpio-Controller.ts`): Digital I/O operations
- **I2C Bus** (`i2c-bus/I2cBus.ts`): I2C protocol communication
- **SPI ADC** (`spi-adc/SpiAdcBus.ts`): SPI Analog-to-Digital conversion (SPI0, SPI1)
- **1-Wire Bus** (`one-wire/OneWireBus.ts`): Dallas 1-Wire temperature sensors
- **Generic Devices** (`generic/genericDevices.ts`): Custom device implementations

#### **Configuration System** (`config/Config.ts`)
- Loads and watches application configuration files
- Provides configuration sections (web, devices, etc.)
- Hot-reloads configuration changes
- Merges defaults with user configuration

#### **Logger** (`logger/Logger.ts`)
- Winston-based structured logging
- Configurable log levels and outputs
- Context-aware logging throughout system

## Data Flow Architecture

### Trigger-to-Feed Routing

```
External Input (MQTT/WebSocket/HTTP)
    ↓
ConnectionBroker (listens for triggers)
    ↓
DataTrigger (condition evaluation)
    ↓
Feed Routing (matched triggers → target feeds)
    ↓
Hardware Interfaces (GPIO/I2C/SPI/1-Wire)
    ↓
Device Output (relay activation, state changes)
```

### Input Data Sources

**Triggers** originate from:
- MQTT messages (external systems)
- WebSocket events (dashboard/remote clients)
- HTTP REST requests (external APIs)
- Internal state changes

### Output Data Destinations

**Feeds** route data to:
- GPIO pin writes (relay control)
- I2C device commands
- SPI ADC reads (sensor data)
- 1-Wire device reads (temperature)
- MQTT publish (external broadcast)
- WebSocket emit (connected clients)
- REST response bodies

### Device Binding Model

Device inputs/outputs are referenced through **DeviceBinding** notation:
```
"type:busId:deviceId:param1:param2"
```
Examples:
- `gpio:0:1` - GPIO pin 1
- `i2c:0:0x48` - I2C device at address 0x48
- `spi:0:0` - SPI0, channel 0
- `onewire:0:1` - 1-Wire sensor ID 1

## Communication Protocols

### MQTT
- **Type**: Message queue publish/subscribe
- **Role**: External sensor/trigger integration
- **Implementation**: `MqttConnection` class
- **Use Case**: Integration with home automation systems, remote monitoring

### WebSocket / Socket.io
- **Type**: Bidirectional real-time communication
- **Role**: Dashboard UI, real-time client updates
- **Implementation**: `SocketServerConnection` class
- **Use Case**: Live dashboard, remote control interfaces

### HTTP REST API
- **Type**: Stateless request-response
- **Role**: Configuration, state querying, device control
- **Implementation**: Express-based routes in `web/services/`
- **Endpoints**:
  - `/api/config/*` - Configuration management (ConfigRoute)
  - `/api/state/*` - System state queries (StateRoute)
  - `/api/devices/*` - Device management
  - Web UI static files served from `pages/` and `web/`

### mDNS (Multicast DNS)
- **Type**: Local network service discovery
- **Role**: Device announcement on local network
- **Implementation**: `MdnsServer` class

### SSDP (Simple Service Discovery Protocol)
- **Type**: UPnP device discovery
- **Role**: Device discovery over network
- **Implementation**: `SsdpServer` class

## Component Dependencies

### Initialization Order (from `app.ts`)

```
Config.init()
  ↓
Logger.init()
  ↓
Controller.init()
  ↓
WebServer.init()
  ↓
ConnectionBroker.init()
  ↓
GPIO.init()
  ↓
SPI0.initAsync()
  ↓
SPI1.initAsync()
  ↓
I2C.initAsync()
  ↓
OneWire.initAsync()
  ↓
GenericDevices.initAsync()
```

### Runtime Dependencies

```
WebServer
  ├─ Controller (device state)
  ├─ Config (server configuration)
  └─ Logger (request/error logging)

ConnectionBroker
  ├─ Controller (trigger/feed evaluation)
  ├─ WebServer (client notifications)
  ├─ GPIO (device control)
  ├─ I2C (device control)
  ├─ SPI (device control)
  ├─ 1-Wire (device control)
  └─ Logger (event logging)

Hardware Managers
  ├─ Controller (configuration)
  └─ Logger (diagnostic logging)

Config
  └─ Logger (reload notifications)
```

## Configuration Structure

### Main Configuration (`config.json`)
- Web server settings (HTTP, HTTPS, mDNS, SSDP ports)
- GPIO pin definitions
- I2C/SPI bus configurations
- 1-Wire bus settings
- Connection definitions (MQTT brokers, WebSocket servers)
- Device trigger/feed associations

### Device Definitions (`devices/*.json`)
- Device type specifications (relays, sensors, ADCs)
- Pin/register mappings
- Predefined device templates
- Category groupings

### Controller Configuration (`data/controllerConfig.json`)
- Persistent device state
- User-defined connections
- Trigger-feed associations
- Custom device configurations

## Message Flow Example: Relay Activation

1. **External Trigger**
   - MQTT client publishes: `pool/pump → ON`
   - WebSocket client sends: `{action: "setRelay", id: 1, value: true}`

2. **Trigger Reception**
   - ConnectionBroker receives message
   - DataTrigger evaluates condition (e.g., if pump enabled AND temp < 30°C)

3. **Feed Resolution**
   - Matching trigger → Feed routing lookup
   - Feed specifies target: `gpio:0:5` (GPIO pin 5)

4. **Device Control**
   - GPIO Controller receives command
   - Pin 5 set HIGH (relay energized)

5. **State Update & Broadcast**
   - Controller state updated
   - WebServer notifies all connected clients via WebSocket
   - State persisted to `data/controllerConfig.json`

## Extension Points

### Adding New Bus Types
1. Create manager class (e.g., `CanBus.ts`)
2. Implement `init()` and `closeAsync()` methods
3. Register in `Controller` class
4. Add initialization call in `app.ts`

### Adding New Protocol Connections
1. Extend `ServerConnection` class
2. Implement connection/trigger/feed handlers
3. Register in `ConnectionBroker.addConnection()`

### Adding New Services
1. Create route handler in `web/services/`
2. Register in WebServer Express app
3. Implement request handlers and response formatting

## Error Handling & Graceful Shutdown

### Initialization Errors
- Each component's `init()` method wrapped in try-catch
- Logged but does not halt application startup
- Component remains inactive if initialization fails

### Shutdown Sequence (from `app.ts`)
- ConnectionBroker stops accepting messages
- Generic devices closed
- 1-Wire bus closed
- I2C bus closed
- SPI buses closed
- GPIO controller stopped
- Controller shutdown
- Logger stopped
- Process exit

### Error Recovery
- Bus managers implement reconnect logic
- Configuration hot-reload on file changes
- MQTT auto-reconnect on broker disconnect
- WebSocket connection re-establishment
