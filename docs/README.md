# Relay Equipment Manager - Documentation

Welcome to the Relay Equipment Manager (REM) documentation. This directory contains comprehensive guides for setup, deployment, architecture, API usage, and component specifications.

## Documentation Structure

### 📚 Main Sections

#### [Setup Documentation](./setup/)
Quick-start guides for getting REM up and running:
- **setup.md** - Installation instructions for Raspberry Pi and BeagleBone
- **deployment.md** - Production deployment, bus enablement, and runtime management
- **troubleshooting.md** - Common issues and solutions for all bus types
- **component-prd.md** - Product requirements for major system components
- **index.md** - Setup documentation overview

#### [Architecture Documentation](./architecture/)
System design and component interactions:
- **architecture.md** - Overall system architecture and design patterns
- **diagrams/** - Visual system architecture diagrams

#### [API Documentation](./api/)
REST API, WebSocket, and MQTT interface specifications:
- **api.md** - REST API endpoint reference
- **web-ui.md** - Web UI feature documentation
- **configuration.md** - Configuration file format and options

#### [Component Documentation](./components/)
Detailed documentation for hardware interfaces:
- **gpio.md** - GPIO pin configuration and control
- **i2c.md** - I2C bus devices and addressing
- **spi.md** - SPI bus and ADC channel configuration
- **onewire.md** - 1-Wire protocol and temperature sensors

## Quick Start by Role

### For Initial Installation
1. Read [setup.md](./setup/setup.md)
2. Follow hardware-specific instructions (Raspberry Pi or BeagleBone)
3. Install dependencies with `npm install`

### For Production Deployment
1. Start with [deployment.md](./setup/deployment.md)
2. Enable required hardware buses (I2C, SPI, 1-Wire)
3. Configure user permissions and security
4. Set up systemd service for auto-start

### For Troubleshooting Issues
1. Check [troubleshooting.md](./setup/troubleshooting.md)
2. Search for your issue or component type (GPIO, I2C, SPI, 1-Wire)
3. Follow diagnostic steps and solutions

### For Understanding Architecture
1. Review [architecture.md](./architecture/architecture.md)
2. Study component PRDs in [component-prd.md](./setup/component-prd.md)
3. Examine component-specific docs in [components/](./components/)

### For API Integration
1. Reference [api.md](./api/api.md) for REST endpoints
2. Check [web-ui.md](./api/web-ui.md) for UI features
3. Review [configuration.md](./api/configuration.md) for config options

## System Overview

### What is REM?
Relay Equipment Manager is a Node.js-based software console for controlling hardware interfaces on embedded Linux systems (Raspberry Pi, BeagleBone). It provides:

- **Hardware Interface Control**: GPIO, I2C, SPI, 1-Wire protocols
- **Device Management**: Automatic discovery and configuration of connected devices
- **Data Routing**: Connection broker for linking inputs (triggers) to outputs (feeds)
- **Web Interface**: Real-time web UI for system management and monitoring
- **External Integration**: MQTT, WebSocket, and REST API support

### Supported Hardware

**Platforms:**
- Raspberry Pi (all models)
- BeagleBone (Black, Green, AI)
- Other Linux systems (GPIO/buses operate in simulation mode)

**Bus Types:**
- GPIO (digital I/O)
- I2C (multi-device serial)
- SPI (ADC, analog sampling)
- 1-Wire (temperature sensors, iButton)

**Common Devices:**
- GPIO: Relays, buttons, LEDs, flow switches
- I2C: ADS1115 ADC, Sequent MEGA-IND/BAS expansion boards
- SPI: MCP3008, MCP3208 analog-to-digital converters
- 1-Wire: DS18B20 temperature sensors

## Installation Methods

### Standard Installation
```bash
# Clone repository
git clone https://github.com/sberkovitz/relayEquipmentManager.git
cd relayEquipmentManager

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start application
npm start
```

Visit `http://localhost:8080` to access the web interface.

See [setup.md](./setup/setup.md) for detailed instructions.

### Docker Installation (Optional)
REM can be containerized for deployment. See deployment.md for container configuration.

### Systemd Service
For production use, run as systemd service. Configuration detailed in [deployment.md](./setup/deployment.md).

## Key Concepts

### Triggers (Inputs)
Data sources that can initiate actions:
- GPIO pin state changes
- I2C/SPI device readings
- 1-Wire sensor updates
- External MQTT messages
- Scheduled events

### Feeds (Outputs)
Data destinations for routed updates:
- GPIO pin control
- MQTT topic publishing
- WebSocket events
- HTTP API calls
- Logging

### Connections
Configurable routes between triggers and feeds:
- Direct pass-through
- Value transformation
- Conditional logic
- Multi-output broadcasting

### Devices
Physical or logical hardware endpoints:
- GPIO pins
- I2C devices (addresses)
- SPI ADC channels
- 1-Wire sensors
- Generic devices

## Configuration

### Main Configuration File
**Location:** `/opt/relayEquipmentManager/config.json`

**Key Sections:**
- **web**: HTTP/HTTPS server configuration
- **log**: Logging and debug settings
- **controllerType**: Hardware platform (raspi, beaglebone, sim)
- **i2c, spi0, spi1, oneWire, gpio**: Bus enablement
- **connections**: Trigger-feed routing configuration

See [configuration.md](./api/configuration.md) for detailed parameter descriptions.

### Device Configuration
Individual devices configured via:
- Web UI (recommended)
- JSON configuration files
- API endpoints

## Troubleshooting

### Common Issues

| Issue | Documentation |
|-------|---|
| Application won't start | [troubleshooting.md - General Issues](./setup/troubleshooting.md#general-application-issues) |
| GPIO pins not responding | [troubleshooting.md - GPIO Issues](./setup/troubleshooting.md#gpio-issues) |
| I2C devices not detected | [troubleshooting.md - I2C Issues](./setup/troubleshooting.md#i2c-bus-issues) |
| SPI/ADC communication errors | [troubleshooting.md - SPI Issues](./setup/troubleshooting.md#spi-bus-issues) |
| Temperature sensors not reading | [troubleshooting.md - 1-Wire Issues](./setup/troubleshooting.md#1-wire-bus-issues) |
| Web interface not accessible | [troubleshooting.md - Web Server Issues](./setup/troubleshooting.md#web-server-issues) |

For comprehensive troubleshooting guide, see [troubleshooting.md](./setup/troubleshooting.md).

## Performance and Scalability

### Resource Requirements
- **Memory**: 50-200 MB baseline (depending on device count)
- **CPU**: Low usage on idle, < 5% on Pi3 with 50+ devices
- **Storage**: ~100 MB for application + logs
- **Network**: Minimal bandwidth except MQTT/WebSocket traffic

### Typical Performance
- GPIO response: < 1ms
- I2C read/write: < 50ms
- SPI ADC sample: < 20ms
- 1-Wire temperature read: < 1 second
- Web UI update latency: < 100ms

### Scaling Considerations
- Support 100+ GPIO pins
- Support 100+ I2C devices (across multiple addresses)
- Support 100+ SPI channels (multiple chips)
- Support 1000+ 1-Wire devices (practical limit ~20 per bus)

## Development and Contributions

### Project Structure
```
relayEquipmentManager/
├── docs/                    # This directory
├── boards/                  # Hardware controller logic
├── connections/             # Connection broker system
├── devices/                 # Device drivers
├── gpio/, i2c-bus/, etc.   # Hardware interface implementations
├── web/                     # Web server and UI
├── config/                  # Configuration management
├── logger/                  # Logging system
└── app.ts                   # Application entry point
```

### Building from Source
```bash
npm install
npm run build
npm test  # If test suite added
```

### Code Style
- TypeScript with strict mode
- ESLint configuration included
- Async/await patterns for I/O

## Support and Resources

### Documentation
- [Complete documentation index](./README.md) (this file)
- [Setup and installation](./setup/)
- [Architecture and design](./architecture/)
- [API and integration](./api/)
- [Hardware components](./components/)

### Community and Issues
- GitHub Issues: [sberkovitz/relayEquipmentManager/issues](https://github.com/sberkovitz/relayEquipmentManager/issues)
- Project Repository: [sberkovitz/relayEquipmentManager](https://github.com/sberkovitz/relayEquipmentManager)

### Diagnostic Logs
When reporting issues, include:
1. Application logs (with debug enabled)
2. Output of: `uname -a`, `cat /etc/os-release`
3. Hardware details: `raspi-config` version, device connections
4. Network status: `ifconfig`, firewall rules
5. Relevant bus diagnostics: `i2cdetect`, `lsmod`, etc.

## License

See LICENSE file in repository root.

## Version Information

- **REM Version**: 8.0.0
- **Documentation Version**: 1.0.0
- **Last Updated**: 2024

## Navigation

- [Setup Documentation →](./setup/)
- [Architecture Documentation →](./architecture/)
- [API Documentation →](./api/)
- [Component Documentation →](./components/)

---

**Getting Started?** Start with [setup.md](./setup/setup.md)

**Production Ready?** Read [deployment.md](./setup/deployment.md)

**Troubleshooting?** Check [troubleshooting.md](./setup/troubleshooting.md)
