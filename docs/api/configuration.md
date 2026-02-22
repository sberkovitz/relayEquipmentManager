# Configuration Documentation

## Overview

The Relay Equipment Manager uses JSON-based configuration with two primary files:

- **`defaultConfig.json`**: Factory defaults and schema
- **`config.json`**: User customizations (created at runtime from defaults)

Configuration is hot-reloadable—changes to `config.json` are detected and reloaded without restart.

## Configuration File Locations

```
/config.json              # User configuration (merged with defaults)
/defaultConfig.json       # Default configuration template
/connections/njspc.json   # njsPool Controller event bindings
/connections/webservice.json  # Generic WebSocket event bindings
```

## Configuration Structure

### Root Configuration

```json
{
  "development": false,
  "web": { ... },
  "log": { ... },
  "appVersion": "1.0.0"
}
```

#### `development` (boolean)
- `true`: Enable verbose logging and development features
- `false`: Production mode

#### `appVersion` (string)
- Automatically populated from `package.json`
- Read-only, do not modify

---

## Web Configuration

Web server settings control HTTP/HTTPS, WebSocket, and service discovery.

```json
"web": {
  "servers": {
    "http": {
      "enabled": true,
      "ip": "0.0.0.0",
      "port": 8080,
      "httpsRedirect": false,
      "authentication": "none",
      "authFile": "/users.htpasswd"
    },
    "https": {
      "enabled": true,
      "ip": "127.0.0.1",
      "port": 8081,
      "authentication": "none",
      "authFile": "/users.htpasswd",
      "sslKeyFile": "",
      "sslCertFile": ""
    },
    "mdns": {
      "enabled": false
    },
    "ssdp": {
      "enabled": true
    },
    "services": {}
  }
}
```

### HTTP Server Configuration

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable HTTP server |
| `ip` | string | Bind IP address (`0.0.0.0` = all interfaces) |
| `port` | number | HTTP listen port (default 8080) |
| `httpsRedirect` | boolean | Redirect HTTP to HTTPS |
| `authentication` | string | Auth type: `none`, `basic`, `digest` |
| `authFile` | string | Path to htpasswd credentials file |

### HTTPS Server Configuration

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable HTTPS server |
| `ip` | string | Bind IP address (usually `127.0.0.1` for security) |
| `port` | number | HTTPS listen port (default 8081) |
| `authentication` | string | Auth type: `none`, `basic`, `digest` |
| `authFile` | string | Path to htpasswd credentials file |
| `sslKeyFile` | string | Path to SSL private key file |
| `sslCertFile` | string | Path to SSL certificate file |

### Service Discovery

#### mDNS Configuration

```json
"mdns": {
  "enabled": false
}
```

When enabled, device advertises on local network via multicast DNS (requires `multicast-dns` package).

#### SSDP/UPnP Configuration

```json
"ssdp": {
  "enabled": true
}
```

When enabled, device advertises as UPnP device on network for discovery by Windows/macOS/Linux clients.

---

## Logging Configuration

```json
"log": {
  "app": {
    "enabled": true,
    "level": "info",
    "logToFile": false
  }
}
```

### Log Levels (in order of verbosity)

| Level | Description |
|-------|-------------|
| `silly` | Everything (extremely verbose) |
| `debug` | Detailed debugging information |
| `verbose` | Verbose information |
| `info` | General information (default) |
| `warn` | Warning messages only |
| `error` | Errors only |

### Log Configuration

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable application logging |
| `level` | string | Minimum log level to output |
| `logToFile` | boolean | Write logs to file (`logs/app.log`) |

---

## Hardware Configuration

Hardware configuration (GPIO, I2C, SPI, 1-Wire) is persisted in a `boardDefinition` or similar section that depends on the controller type. The exact structure is determined by the loaded controller hardware profile.

### Board/Controller Definition

The controller type determines available hardware:

- **Raspberry Pi**: GPIO headers, I2C buses, SPI buses, 1-Wire pins
- **Custom Board**: Board-specific configuration via pinout definitions

Example:

```json
"boards": {
  "controller": {
    "type": 1,
    "name": "Raspberry Pi 4",
    "gpio": { ... },
    "i2c": { ... },
    "spi": { ... }
  }
}
```

---

## Connection Configuration

Connections define external data sources and destinations (MQTT brokers, WebSocket servers, etc.).

### Connection Object Structure

```json
{
  "id": 1,
  "name": "MQTT Broker",
  "type": {
    "name": "mqttClient",
    "val": 2
  },
  "url": "mqtt://localhost:1883",
  "username": "user",
  "password": "pass",
  "isActive": true,
  "bindings": "njspc.json"
}
```

#### Connection Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Unique connection identifier (1-based) |
| `name` | string | Human-readable connection name |
| `type` | object | Connection type descriptor |
| `type.name` | string | Connection type: `mqttClient`, `webSocket`, `njspc` |
| `type.val` | number | Type enum value |
| `url` | string | Connection URL (format depends on type) |
| `username` | string | Authentication username |
| `password` | string | Authentication password |
| `isActive` | boolean | Whether connection is actively used |
| `bindings` | string | Binding template filename |

### MQTT Connection Example

```json
{
  "id": 1,
  "name": "Home MQTT",
  "type": {
    "name": "mqttClient",
    "val": 2
  },
  "url": "mqtt://192.168.1.100:1883",
  "username": "homeassistant",
  "password": "secret",
  "isActive": true,
  "bindings": "mqtt.json"
}
```

### WebSocket Connection Example

```json
{
  "id": 2,
  "name": "Pool Controller",
  "type": {
    "name": "webSocket",
    "val": 1
  },
  "url": "ws://poolcontroller.local:8080/socket.io/?transport=websocket",
  "isActive": true,
  "bindings": "njspc.json"
}
```

### Connection Types

| Type | Description | URL Format |
|------|-------------|-----------|
| `internal` | Built-in device control | N/A (internal only) |
| `webSocket` | Socket.IO WebSocket server | `ws://host:port/socket.io` |
| `njspc` | njsPool Controller via Socket.IO | `ws://host:port/socket.io` |
| `mqttClient` | MQTT broker | `mqtt://host:port` (or `mqtts://` for SSL) |

---

## Device Triggers & Feeds

### Trigger System

Triggers map incoming events (from connections) to device actions.

```json
{
  "id": 1,
  "sourceId": 1,
  "deviceBinding": "gpio:0:5",
  "eventName": "home/button/press",
  "state": {
    "val": 1,
    "name": "on"
  },
  "filter": "data === 'on'",
  "stateExpression": "true",
  "isActive": true
}
```

#### Trigger Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Unique trigger ID |
| `sourceId` | number | Connection ID that sources this trigger |
| `deviceBinding` | string | Target device (`gpio:H:P`, `i2c:B:A`, etc.) |
| `eventName` | string | Event/topic name from source (MQTT topic, WebSocket event) |
| `state` | object | Target state when triggered |
| `state.val` | any | State value (0/1 for GPIO, numeric for analog) |
| `state.name` | string | State name (`on`, `off`, `toggle`, etc.) |
| `filter` | string | JavaScript expression evaluating event data |
| `stateExpression` | string | JavaScript expression transforming event to device value |
| `isActive` | boolean | Enable/disable this trigger |
| `channelId` | number | (Optional) Specific device channel for multi-channel devices |

#### Filter & State Expression Context

Both expressions execute with these variables available:

- `connection`: Connection source object
- `trigger`: The trigger object itself
- `device`: Target device state
- `data`: Incoming message payload

**Filter Expression:**

Must return `true` to activate trigger:

```javascript
// MQTT topic: home/button/press, data = "on"
data === 'on'  // → true, trigger activates

// WebSocket event with numeric data
data.temp > 25 && data.humidity > 60  // → conditional trigger

// Using connection info
connection.name === 'MQTT' && data.active  // → true
```

**State Expression:**

Transforms data to device-appropriate format:

```javascript
// MQTT string to GPIO boolean
data === 'on' ? 1 : 0

// Scaling analog value (0-100 to 0-255)
Math.floor(data * 2.55)

// Temperature offset
parseFloat(data) + 2.5
```

### Feed System

Feeds publish device state to external connections.

```json
{
  "id": 1,
  "sourceId": 1,
  "deviceBinding": "gpio:0:5",
  "eventName": "home/status/relay",
  "options": {
    "interval": 30000,
    "onchange": true,
    "format": "json"
  },
  "isActive": true
}
```

#### Feed Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Unique feed ID |
| `sourceId` | number | Target connection ID |
| `deviceBinding` | string | Source device |
| `eventName` | string | Destination event/topic |
| `options` | object | Feed-specific options |
| `options.interval` | number | Polling interval (ms), 0 = no polling |
| `options.onchange` | boolean | Only publish on state change |
| `options.format` | string | Message format: `json`, `raw`, `xml` |
| `isActive` | boolean | Enable/disable feed |

#### Feed Examples

**GPIO state to MQTT:**

```json
{
  "sourceId": 1,
  "deviceBinding": "gpio:0:5",
  "eventName": "home/relay/kitchen/state",
  "options": {
    "onchange": true,
    "format": "json"
  }
}
```

MQTT message:
```
Topic: home/relay/kitchen/state
Payload: {"state": 1, "timestamp": 1234567890}
```

**I2C temperature polling:**

```json
{
  "sourceId": 1,
  "deviceBinding": "i2c:0:0x48",
  "eventName": "home/temperature/living_room",
  "options": {
    "interval": 60000,
    "format": "raw"
  }
}
```

MQTT message (every 60 seconds):
```
Topic: home/temperature/living_room
Payload: 22.5
```

---

## Connection Routing

### Trigger → Feed → Action Flow

```
External Event (MQTT/WebSocket)
           ↓
    [Trigger Filter] ← Evaluate condition
           ↓
    [Device Action] ← Execute on target device
           ↓
    [State Change] ← Device state updated
           ↓
      [Feeds Fire] ← Publish to connections
           ↓
External System Receives Update
```

### Example: Smart Relay Control

**Setup:**

1. **Connection**: MQTT broker at `mqtt://home:1883`
2. **Trigger**: Subscribe to `home/button/kitchen`
   - Filter: `data.action === 'press'`
   - Device: GPIO:0:5 (kitchen relay)
   - State: 1 (turn ON)
3. **Feed**: Publish relay status to `home/relay/kitchen/status`
   - Format: JSON
   - On Change: true

**Flow:**

```
1. Home automation sends:
   MQTT Topic: home/button/kitchen
   Data: {"action": "press", "duration": "short"}

2. Trigger evaluates:
   filter: data.action === 'press'  ✓ True

3. Device action executes:
   Set GPIO:0:5 = 1 (HIGH)

4. GPIO state changes:
   GPIO:0:5: 0 → 1

5. Feeds activate:
   Publish to MQTT Topic: home/relay/kitchen/status
   Data: {"state": 1, "timestamp": 1234567890}

6. Home automation updates dashboard
```

---

## Connection Binding Files

Binding files define the event schema and available triggers/feeds for specific connection types.

### njspc.json - njsPool Controller Bindings

Events and data structures from njsPool Controller:

```json
{
  "dataType": "json",
  "events": [
    {
      "name": "circuit",
      "hasId": true,
      "bindings": [
        {
          "binding": "id",
          "type": "number",
          "label": "Id"
        },
        {
          "binding": "name",
          "type": "string",
          "label": "Name"
        },
        {
          "binding": "isOn",
          "type": "boolean"
        }
      ]
    }
  ]
}
```

### webservice.json - Generic WebSocket Bindings

Generic event schema for any WebSocket source:

```json
{
  "dataType": "json",
  "parameters": {
    "connection": {...},
    "trigger": {...},
    "pinout": {...},
    "data": {...}
  },
  "events": [],
  "feeds": []
}
```

Parameters define JavaScript context available in filter/state expressions.

---

## Device Binding Strings

Device bindings uniquely identify devices across all interfaces:

| Type | Format | Example | Part Meanings |
|------|--------|---------|---------------|
| GPIO | `gpio:headerId:pinId` | `gpio:0:5` | Header 0, Pin 5 |
| I2C | `i2c:busNumber:deviceId` | `i2c:1:0x48` | Bus 1, Address 0x48 |
| SPI | `spi:controllerId:channelId` | `spi:0:1` | SPI0, Channel 1 |
| 1-Wire | `oneWire:busNumber:address` | `oneWire:0:28-0415b2b4bcff` | Bus 0, ROM address |
| Generic | `generic:typeId:deviceId` | `generic:5:1` | Type 5, Instance 1 |

---

## Configuration Reload

The application watches `config.json` for changes and automatically reloads:

```typescript
// From Config.ts
fs.watch(cfgPath, (event, fileName) => {
  if (event === 'change') {
    // Reload config
    let data = fs.readFileSync(cfgPath, "utf8");
    this._cfg = JSON.parse(data);
    logger.init();  // Reinitialize logger
  }
});
```

**Changes applied automatically:**
- Logging configuration
- Web server settings
- Feature flags

**Changes requiring restart:**
- GPIO, I2C, SPI hardware definitions
- Connection definitions (recommend restart)

---

## Default Configuration Template

See `/defaultConfig.json` for the complete default structure. Key sections:

```json
{
  "development": false,
  "web": {
    "servers": {
      "http": { "enabled": true, "port": 8080 },
      "https": { "enabled": true, "port": 8081 },
      "mdns": { "enabled": false },
      "ssdp": { "enabled": true }
    }
  },
  "log": {
    "app": {
      "enabled": true,
      "level": "info",
      "logToFile": false
    }
  }
}
```

---

## Configuration Validation

The API provides validation endpoints:

```
PUT /config/restore/validate
Body: {proposed configuration}
```

Returns validation errors before applying changes.

---

## Best Practices

### Naming Conventions

- Connection names: Descriptive, e.g., `MQTT Home`, `Pool Controller`
- Device names: Location + function, e.g., `Kitchen Relay`, `Living Room Temp`
- MQTT topics: Hierarchical, e.g., `home/room/device/property`

### Trigger Filters

- Keep filters simple and fast
- Avoid blocking operations
- Use comparison operators (`===`, `>`, `<`)
- Avoid regex in hot paths

### Feed Configuration

- Set `onchange: true` for state-based devices (GPIO, relays)
- Use `interval` for sensors with periodic reads
- Combine for hybrid: trigger on change, poll as fallback

### Connection Management

- Use separate connections for different MQTT brokers
- Mark unused connections as `isActive: false` rather than deleting
- Store credentials in environment variables (consider .env support)

---

## Migration & Backup

### Backup Configuration

```
GET /config/backup/controller
```

Returns complete serialized state.

### Restore Configuration

```
PUT /config/restore/validate
PUT /config/restore/file
```

Validates then restores from backup.

### Manual Backup

Copy `config.json` to safe location:

```bash
cp config.json config.backup.json
```
