# API Documentation

## Overview

The Relay Equipment Manager provides a comprehensive REST API, WebSocket interface, and MQTT client support for monitoring and controlling hardware devices across GPIO, I2C, SPI, 1-Wire, and generic device interfaces.

## REST API Endpoints

All endpoints respond with JSON content and support CORS. Status codes follow standard HTTP conventions (200 OK, 400 Bad Request, 500 Server Error).

### Configuration Endpoints

#### General Configuration

```
GET /config/options/general
```
Retrieves general controller configuration options and logger settings.

**Response:**
```json
{
  "controllerTypes": [...],
  "controller": {...},
  "logger": {...}
}
```

#### Backup & Restore

```
GET /config/backup/controller
```
Backs up complete controller state and configuration.

```
PUT /config/restore/validate
Content-Type: application/json

Body: {backup configuration object}
```
Validates a backup before restoration.

```
PUT /config/restore/file
Content-Type: application/json

Body: {backup configuration object}
```
Restores controller from backup configuration.

#### GPIO Configuration

```
GET /config/options/gpio
```
Lists all GPIO pin definitions and current pin states.

**Response:**
```json
{
  "controllerTypes": [...],
  "pinDirections": [...],
  "pinTypes": [...],
  "controller": {...},
  "pinDefinitions": {...},
  "pinStates": [...]
}
```

```
GET /config/options/gpio/pin/:headerId/:pinId
```
Gets options for configuring a specific GPIO pin (directions, types, states).

```
GET /config/options/gpio/pin/feeds/:headerId/:pinId
```
Gets configuration options for GPIO pin feeds and available connections.

```
PUT /config/gpio/pin/:headerId/:pinId
Content-Type: application/json

Body: {
  "name": "string",
  "direction": "number",
  "type": "number",
  "isInverted": "boolean"
}
```
Updates GPIO pin configuration.

**Response:** Updated pin object with extended properties.

```
DELETE /config/gpio/pin/feed
Content-Type: application/json

Body: {
  "headerId": "number",
  "pinId": "number",
  "feedId": "number"
}
```
Removes a feed from a GPIO pin.

```
PUT /config/gpio/pin/feed
Content-Type: application/json

Body: {
  "headerId": "number",
  "pinId": "number",
  "feed": {...}
}
```
Adds or updates a feed for a GPIO pin.

#### GPIO Triggers

```
GET /config/options/trigger/:headerId/:pinId/:triggerId
```
Gets configuration options for GPIO pin triggers (states, connections).

```
PUT /config/gpio/pin/trigger/:headerId/:pinId
Content-Type: application/json

Body: {
  "triggerId": "number",
  "eventName": "string",
  "state": {...},
  "sourceId": "number",
  "filter": "string (JavaScript expression)"
}
```
Creates or updates a GPIO pin trigger that maps external events to pin state changes.

```
DELETE /config/gpio/pin/trigger/:headerId/:pinId/:triggerId
```
Removes a trigger from a GPIO pin.

#### I2C Configuration

```
GET /config/options/i2c
```
Lists all I2C buses.

```
GET /config/options/i2c/:busNumber
```
Gets options for a specific I2C bus.

```
PUT /config/i2c/bus
Content-Type: application/json

Body: {
  "busNumber": "number",
  "enabled": "boolean",
  "frequency": "number"
}
```
Updates I2C bus configuration.

```
GET /config/options/i2c/:busNumber/:deviceAddress
```
Gets options for configuring an I2C device (device types, etc.).

```
GET /config/options/i2c/:busNumber/:deviceAddress/feeds
```
Gets feed and connection options for an I2C device.

```
GET /config/options/i2c/:busNumber/:deviceAddress/trigger/:triggerId
```
Gets trigger configuration options for an I2C device.

```
PUT /config/i2c/device
Content-Type: application/json

Body: {
  "busNumber": "number",
  "address": "number",
  "typeId": "number",
  "name": "string"
}
```
Creates or updates an I2C device.

```
PUT /config/i2c/device/feed
Content-Type: application/json

Body: {
  "busNumber": "number",
  "deviceId": "number",
  "feed": {...}
}
```
Adds a feed to an I2C device.

```
DELETE /config/i2c/device/feed
Content-Type: application/json

Body: {
  "busNumber": "number",
  "deviceId": "number",
  "feedId": "number"
}
```
Removes a feed from an I2C device.

```
PUT /config/i2c/device/trigger
Content-Type: application/json

Body: {
  "busNumber": "number",
  "deviceId": "number",
  "trigger": {...}
}
```
Adds or updates an I2C device trigger.

```
DELETE /config/i2c/device/trigger
Content-Type: application/json

Body: {
  "busNumber": "number",
  "deviceId": "number",
  "triggerId": "number"
}
```
Removes a trigger from an I2C device.

```
PUT /config/i2c/scanBus
Content-Type: application/json

Body: {
  "busNumber": "number"
}
```
Scans an I2C bus for connected devices.

```
PUT /config/i2c/addAddress
Content-Type: application/json

Body: {
  "busNumber": "number",
  "address": "number",
  "typeId": "number"
}
```
Adds a device address to an I2C bus.

```
PUT /config/i2c/device/changeAddress
Content-Type: application/json

Body: {
  "busNumber": "number",
  "oldAddress": "number",
  "newAddress": "number"
}
```
Changes an I2C device address.

```
PUT /config/i2c/device/reset
Content-Type: application/json

Body: {
  "busNumber": "number",
  "address": "number"
}
```
Resets an I2C device.

```
DELETE /config/i2c/bus
Content-Type: application/json

Body: {
  "busNumber": "number"
}
```
Deletes an I2C bus configuration.

```
DELETE /config/i2c/device
Content-Type: application/json

Body: {
  "busNumber": "number",
  "address": "number"
}
```
Deletes an I2C device configuration.

```
PUT /config/i2c/:busNumber/:deviceAddress/deviceCommand/:command
Content-Type: application/json

Body: {...}
```
Executes a device-specific command on an I2C device.

#### SPI Configuration

```
GET /config/options/spi/:controllerId
```
Gets options for SPI controller 0 or 1 (chip types, devices, channels).

```
GET /config/options/spi/:controllerId/:channelId/feeds
```
Gets feed and connection options for an SPI channel.

#### 1-Wire Configuration

```
GET /config/options/oneWire
```
Lists all 1-Wire buses.

```
GET /config/options/oneWire/:busNumber
```
Gets options for a specific 1-Wire bus.

```
PUT /config/oneWire/bus
Content-Type: application/json

Body: {
  "busNumber": "number",
  "enabled": "boolean"
}
```
Updates 1-Wire bus configuration.

```
GET /config/options/oneWire/:busNumber/:deviceAddress
```
Gets configuration options for a 1-Wire device.

```
GET /config/options/oneWire/:busNumber/:deviceAddress/feeds
```
Gets feed and connection options for a 1-Wire device.

```
GET /config/options/oneWire/:busNumber/:deviceAddress/trigger/:triggerId
```
Gets trigger configuration options for a 1-Wire device.

```
PUT /config/oneWire/device/changeAddress
Content-Type: application/json

Body: {
  "busNumber": "number",
  "oldAddress": "string",
  "newAddress": "string"
}
```
Changes a 1-Wire device address.

```
PUT /config/oneWire/scanBus
Content-Type: application/json

Body: {
  "busNumber": "number"
}
```
Scans a 1-Wire bus for connected devices.

```
PUT /config/oneWire/addAddress
Content-Type: application/json

Body: {
  "busNumber": "number",
  "address": "string",
  "typeId": "number"
}
```
Adds a device address to a 1-Wire bus.

#### Get Configuration Section

```
GET /config/:section
```
Gets a specific configuration section (web, log, etc.).

### State & Device Endpoints

#### Device State

```
GET /devices/state
```
Retrieves complete controller state including all devices, pins, and connections.

```
GET /devices/all
```
Lists all available devices across all interfaces with their status and feed information.

**Response:**
```json
[
  {
    "type": "gpio|spi|i2c|oneWire|generic",
    "isActive": "boolean",
    "name": "string",
    "binding": "type:param1:param2",
    "category": "string",
    "feeds": [...]
  }
]
```

```
PUT /state/device/:binding
Content-Type: application/json

Body: {
  "state": "value"
}
```
Sets the state of a device. Binding format: `type:id:subid` (e.g., `gpio:1:5`, `i2c:0:0x48`).

```
GET /state/device/:binding
```
Gets the current state of a device.

```
GET /status/device/:binding
```
Gets status information for a device.

```
PUT /feed/device/:binding
Content-Type: application/json

Body: {
  "property": "string",
  "value": "any"
}
```
Sends a value to a device feed (used for triggering actions on connected systems).

## WebSocket Events

WebSocket connections are established at the root namespace (`/`) and support Socket.IO protocol with EIO3 compatibility.

### Client to Server Events

```
echo: (message: string) => void
```
Echo test event. Server responds with the same message.

### Server to Client Events

The server emits state change events to all connected clients:

```
stateChanged: {
  device: "string (binding)",
  state: "any",
  timestamp: "number"
}
```

```
statusChanged: {
  device: "string (binding)",
  status: "string"
}
```

### Event Channels

Additional namespaces can be created for specific device channels or connections using:

```
/connection/:connectionId
/device/:deviceBinding
```

Clients can subscribe to these channels for targeted event notifications.

## MQTT Integration

### Connection Configuration

MQTT connections are defined in the controller configuration with the following parameters:

- `type`: Connection type (must be `mqttClient`)
- `name`: Connection name for logging
- `url`: MQTT broker URL (e.g., `mqtt://localhost:1883`)
- `username`: Optional MQTT broker username
- `password`: Optional MQTT broker password
- `enabled`: Whether the connection is active

### Topic Structure

MQTT topics follow hierarchical patterns mapped to device triggers:

**Subscribe Topics (Device Inputs)**
```
rem/device/:binding/trigger
rem/device/:binding/state
rem/gpio/:headerId/:pinId
rem/i2c/:busNumber/:address/:property
rem/oneWire/:busNumber/:address
```

**Publish Topics (Device Outputs)**
```
rem/state/:binding
rem/gpio/:headerId/:pinId/state
rem/i2c/:busNumber/:address/state
rem/oneWire/:busNumber/:address/state
```

### Trigger Binding

A trigger maps an MQTT topic (or external event) to a device action:

```json
{
  "id": "number",
  "sourceId": "number (connection id)",
  "eventName": "string (MQTT topic for MQTT, event name for WebSocket)",
  "deviceBinding": "string (target device: gpio:H:P, i2c:B:A, etc.)",
  "state": {
    "val": "number (target state value)"
  },
  "filter": "string (optional JavaScript filter expression)",
  "stateExpression": "string (optional JavaScript state transformation)"
}
```

**Filter Expression Variables:**
- `connection`: Connection source object
- `trigger`: Trigger configuration
- `device`: Target device state
- `data`: Incoming message payload

**State Expression Variables:** Same as filter.

### Example Trigger Mapping

```
MQTT Topic: home/pool/heater/enable
↓
Filter: data === 'on'
↓
State Expression: true
↓
Device: gpio:0:5 (GPIO header 0, pin 5)
↓
Action: Set GPIO pin to HIGH
```

## Error Handling

All API responses use standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters or malformed request
- `500 Internal Server Error`: Server-side error

Error responses include a JSON body:

```json
{
  "httpCode": 500,
  "message": "Descriptive error message",
  "stack": "Stack trace (if development mode)"
}
```

## Device Binding Format

Devices are referenced using a hierarchical binding string:

| Type | Format | Example |
|------|--------|---------|
| GPIO | `gpio:headerId:pinId` | `gpio:0:5` |
| SPI | `spi:controllerId:channelId` | `spi:0:1` |
| I2C | `i2c:busNumber:deviceId` | `i2c:1:0x48` |
| 1-Wire | `oneWire:busNumber:address` | `oneWire:0:28-0415b2b4bcff` |
| Generic | `generic:typeId:deviceId` | `generic:5:1` |

## Rate Limiting

Currently, no rate limiting is implemented. All authenticated requests are accepted immediately.

## CORS Policy

All endpoints accept cross-origin requests:

- `Origin`: *
- `Methods`: GET, POST, PUT, DELETE, OPTIONS
- `Headers`: Any
