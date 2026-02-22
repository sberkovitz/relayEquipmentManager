# Web UI Documentation

## Overview

The Relay Equipment Manager provides a web-based user interface for managing hardware devices, configuring connections, and monitoring system state. The interface is built with jQuery and jQuery UI, served as static pages from the `/pages` directory.

## Accessing the Web UI

The web interface is available at:

- **HTTP**: `http://<device-ip>:8080`
- **HTTPS**: `https://<device-ip>:8081` (if enabled)

Real-time updates use WebSocket (Socket.IO) connections for bidirectional communication with the server.

## Main Pages & Tabs

### 1. General Configuration Page (`/pages/general.js`)

**Purpose:** System-wide settings and controller configuration.

**Capabilities:**
- View and edit controller type and model
- Configure logging levels (debug, info, warn, error)
- Enable/disable development mode
- View application version
- Display connection status indicators

**Key Sections:**
- **Controller**: Select board/controller type from available hardware options
- **Logging**: Set log level and configure log output destinations
- **System Info**: Display installed version and system uptime

**Configuration Elements:**
- Controller type dropdown
- Log level selector (dropdown: silly, debug, verbose, info, warn, error)
- Log output toggle (file/console)
- Version display badge

---

### 2. GPIO Configuration Page (`/pages/gpio.js`)

**Purpose:** Configure GPIO pins for input/output operations.

**Capabilities:**
- View all GPIO pin headers and available pins
- Configure pin direction (Input/Output)
- Set pin type (Digital/PWM/Analog)
- Configure inverted logic (invert HIGH/LOW)
- Set up pin names for easy identification
- Create triggers to map external events to pin state changes
- Manage feeds (outputs) to send pin state to external connections

**Pin Configuration:**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| Name | text | Any string | User-friendly pin identifier |
| Direction | select | Input, Output | Pin mode |
| Type | select | Digital, PWM, Analog | Signal type |
| Inverted | checkbox | true/false | Invert logic state |
| Enabled | checkbox | true/false | Activate pin |

**Trigger Management:**

Triggers allow mapping incoming events (WebSocket, MQTT) to GPIO actions:

- **Event Name**: External event source identifier
- **Connection**: Which connection source (internal, MQTT, WebSocket, etc.)
- **State**: Target pin state (HIGH/LOW/TOGGLE)
- **Filter Expression**: JavaScript expression to evaluate event data
- **Condition**: Only trigger if condition evaluates to true

**Feed Configuration:**

Feeds send GPIO state changes to external systems:

- **Connection**: Target connection (internal, MQTT broker, WebSocket server)
- **Topic/Event**: Destination topic or event name
- **Format**: How to serialize GPIO state

**UI Elements:**
- Header selector (Header 0, Header 1, etc.)
- Pin grid showing each header's pins
- Pin configuration modal dialog
- Trigger list and management buttons
- Feed list and management buttons

---

### 3. I2C Configuration Page (`/pages/i2c/`)

**Purpose:** Configure I2C bus devices for sensor and actuator control.

**Capabilities:**
- Manage multiple I2C bus instances (typically Bus 0, Bus 1)
- Scan buses for connected devices
- Add/remove devices by address
- Configure device types (temperature sensors, humidity sensors, etc.)
- Name and enable/disable individual devices
- Set up device triggers and feeds
- Execute device-specific commands
- Change device addresses

**Bus Management:**

| Action | Description |
|--------|-------------|
| Scan Bus | Auto-discover connected I2C devices |
| Add Address | Manually add a device at known address |
| Delete Device | Remove device configuration |
| Reset Device | Perform device reset |
| Change Address | Reassign device I2C address |

**Device Configuration:**

- **Bus Number**: Select I2C bus (0, 1, etc.)
- **Address**: Hexadecimal I2C address (0x00-0xFF)
- **Type**: Device type from available sensor/actuator list
- **Name**: Custom device identifier
- **Enabled**: Activate device

**Device Registers & Channels:**

I2C devices expose multiple data channels (temperature, humidity, pressure, etc.):

- View register/channel list
- Configure each channel as input or output
- Set scaling/calibration parameters
- Create individual triggers/feeds per channel

**Trigger Management:**

Similar to GPIO triggers, I2C triggers map incoming events to device commands:

- **Event Name**: MQTT topic or WebSocket event
- **Channel**: Target device register/channel
- **Transformation**: JavaScript expression to convert event to device value

**Feed Configuration:**

Feeds publish device readings to external systems:

- **Connection**: Target connection
- **Topic/Event**: Publishing destination
- **Interval**: Update frequency (on-change, periodic, etc.)
- **Filter**: Only publish if condition met

**UI Elements:**
- Bus selector tabs
- Device list table (address, type, name, status)
- Scan/Add buttons
- Device detail modal
- Channel configuration table
- Trigger/Feed management sections

---

### 4. SPI Configuration Page (`/pages/spi.js`)

**Purpose:** Configure SPI ADC (Analog-to-Digital Converter) channels.

**Capabilities:**
- Configure SPI0 and SPI1 bus parameters
- Add ADC chips and define channels
- Configure analog device types (pressure sensors, light sensors, etc.)
- Set up channel sampling and calibration
- Create triggers and feeds for analog values

**SPI Controller Configuration:**

- **Controller**: Select SPI0 or SPI1
- **Clock Speed**: SPI clock frequency (Hz)
- **Chip Select**: GPIO pin for chip select
- **MOSI/MISO/CLK**: SPI line assignments

**ADC Channel Configuration:**

| Field | Type | Description |
|-------|------|-------------|
| Chip Type | select | ADC chip model (MCP3008, MCP3208, etc.) |
| Channel | number | Channel number on ADC (0-7) |
| Device Type | select | Physical sensor type connected |
| Name | text | Channel identifier |
| Min/Max | number | Calibration values |

**Channel Feeds:**

- Publish analog readings to connections
- Set update frequency (polling interval)
- Configure value scaling and filtering

**UI Elements:**
- SPI controller selector
- Clock speed input
- Pin configuration section
- Channel grid showing active channels
- Channel detail modal
- Feed configuration panel

---

### 5. 1-Wire Configuration Page (`/pages/oneWire/`)

**Purpose:** Configure 1-Wire bus devices (primarily temperature sensors).

**Capabilities:**
- Manage multiple 1-Wire bus instances
- Scan buses for connected devices
- Configure device types (DS18B20 thermometers, etc.)
- Name and enable/disable devices
- Set up device triggers and feeds
- Perform bus searches and device resets
- Access device-specific ROM information

**Bus Management:**

| Action | Description |
|--------|-------------|
| Scan Bus | Search for connected 1-Wire devices |
| Add Address | Manually add device by ROM address |
| Delete Device | Remove device configuration |
| Reset Bus | Reset 1-Wire bus |
| Read Device | Query device ROM and data |

**Device Configuration:**

- **Bus**: Select 1-Wire bus instance
- **ROM Address**: 1-Wire device ROM address (48-bit hexadecimal)
- **Type**: Device type (DS18B20, DHT22, etc.)
- **Name**: Custom identifier
- **Enabled**: Activate device

**Temperature Reading:**

1-Wire temperature sensors expose:
- Current temperature (Celsius/Fahrenheit)
- Temperature resolution
- Alarm thresholds

**Feed Configuration:**

- Publish temperature readings at configurable intervals
- Apply temperature scaling/offset
- Filter by delta (only send if changed by X degrees)

**UI Elements:**
- Bus selector tabs
- Device list (ROM address, type, name, status)
- Scan/Add buttons
- Device detail modal
- ROM information display
- Temperature settings section
- Trigger/Feed management

---

### 6. Generic Devices Page (`/pages/genericDevices.js`)

**Purpose:** Configure custom/generic devices with plugin architecture.

**Capabilities:**
- Add custom device types via configuration plugins
- Define device properties and methods
- Set up custom triggers and feeds
- Execute device-specific operations
- Manage device options and parameters

**Device Plugin System:**

Generic devices use a plugin architecture allowing:

- Custom device initialization
- Device-specific command handlers
- Dynamic property management
- Plugin-based state synchronization

**Generic Device Configuration:**

- **Type**: Select from available device plugins
- **Name**: Device identifier
- **Options**: Plugin-specific configuration (varies by plugin)
- **Enabled**: Activate device

**Example Generic Devices:**

- **Custom HTTP Sensor**: Fetch data from HTTP endpoint
- **Serial Port Device**: Communicate via serial connection
- **Modbus RTU**: Industrial device via Modbus protocol
- **Network Socket**: TCP/IP based device

**Feed & Trigger Management:**

Generic devices support standard feed/trigger mechanism:

- Map external events to custom commands
- Publish device state to connections
- Execute plugin-specific operations

**UI Elements:**
- Device type selector
- Device list table
- Add/Delete buttons
- Device options configuration panel
- Trigger/Feed management sections

---

## Configuration Page (`/pages/configPage.js`)

**Purpose:** Direct JSON configuration editor for advanced users.

**Capabilities:**
- View raw controller configuration in tree format
- Edit configuration as JSON
- Validate configuration before saving
- Backup/restore complete configuration
- Import/export settings

**Sections:**

- **GPIO**: Pin and header configuration
- **I2C**: Bus and device configuration
- **SPI**: ADC and channel configuration
- **1-Wire**: Bus and device configuration
- **Connections**: Define MQTT/WebSocket connections
- **Generic Devices**: Plugin device instances
- **Logging**: Logger configuration
- **Web**: Web server settings

**Operations:**

- **View/Edit**: Toggle between tree and JSON edit modes
- **Validate**: Check configuration syntax and constraints
- **Save**: Persist changes to `config.json`
- **Backup**: Export complete configuration as JSON file
- **Restore**: Import saved configuration

---

## Widgets & UI Components (`/pages/widgets.js`)

**Shared Components Used Across Pages:**

### Pin State Indicator
Display current GPIO pin state with color coding (HIGH=green, LOW=red, UNKNOWN=gray).

### State Toggle Button
Clickable button to toggle GPIO output pin state.

### Channel Slider
Adjust PWM or analog output values (0-255 or custom range).

### Temperature Display
Show sensor reading with unit selector (°C/°F).

### Graph Widget
Historical data visualization for trending sensor readings (if dataset available).

### Status Badge
Connection status indicators (Connected/Disconnected/Error).

### Modal Dialogs
- Add/Edit device forms
- Trigger configuration wizard
- Feed setup form
- Backup/Restore dialog

### Data Tables
- Device listings with sorting/filtering
- Configuration property tables
- Event/Trigger logs

---

## Real-Time Updates

All pages use WebSocket (Socket.IO) for real-time updates:

**Events Monitored:**

- `stateChanged`: Device state has changed (pin went HIGH, sensor reading updated)
- `statusChanged`: Device status changed (device connected/disconnected)
- `configChanged`: Configuration was modified
- `errorOccurred`: Device error occurred

**WebSocket Connection:**

- Automatic reconnection with exponential backoff
- Reconnection indicator in UI
- Message queue during disconnection

---

## User Workflows

### Adding a New GPIO Pin

1. Navigate to **GPIO** tab
2. Select header and pin
3. Click **Configure**
4. Set Direction (Input/Output), Type (Digital/PWM), Name
5. **Save**
6. (Optional) Create Triggers to respond to events
7. (Optional) Create Feeds to publish state

### Setting Up Temperature Monitoring

1. Navigate to **1-Wire** tab
2. Click **Scan Bus**
3. Select discovered DS18B20 device
4. Enter friendly Name
5. **Save**
6. Navigate to **Feed** section
7. Create feed to publish to MQTT topic `home/temperature`
8. Set interval to 30 seconds

### Routing External Event to GPIO

1. Create MQTT connection in **Connections** config
2. Subscribe to topic `home/button/press`
3. Navigate to **GPIO** tab
4. Select output pin (e.g., GPIO relay)
5. Click **Add Trigger**
6. Set Event Name to MQTT topic
7. Set Filter: `data === 'on'`
8. Set Target State: HIGH
9. **Save**

---

## Theme Support

The UI includes multiple CSS themes in `/pages/themes/`:

- **Light Theme**: White background, dark text (default)
- **Dark Theme**: Dark background, light text
- **High Contrast**: Accessibility-focused theme

Select theme in **General** → **Settings** → **UI Theme**.

---

## Responsive Design

The interface is responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablets (iPad, Android tablets)
- Mobile browsers (iOS Safari, Chrome Mobile)

Touch-friendly controls and collapsible sections on mobile devices.

---

## Troubleshooting

### Page Won't Load

- Check browser console for errors
- Verify HTTP server is running (`http://ip:8080`)
- Check network connectivity

### WebSocket Disconnects

- Check firewall allows port 8080/8081
- Verify browser allows WebSocket connections
- Check server logs for errors

### Configuration Won't Save

- Verify user has write permission to `config.json`
- Check disk space on device
- Validate JSON syntax in config editor

---

## API Integration

Pages communicate with backend via:

- **REST API**: For configuration operations (GET/PUT/DELETE endpoints)
- **WebSocket**: For real-time state updates and echo events
- **Static Files**: HTML/CSS/JavaScript served from `/pages`

See [API Documentation](./api.md) for complete endpoint reference.
