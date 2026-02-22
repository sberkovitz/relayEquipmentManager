# Setup and Installation Guide

## Overview

Relay Equipment Manager (REM) is a Node.js-based software console for controlling hardware interfaces on embedded Linux systems. This guide covers installation and configuration for Raspberry Pi and BeagleBone platforms.

## System Requirements

### Hardware
- **Supported Platforms:**
  - Raspberry Pi (all models with GPIO support)
  - BeagleBone (Black, Green, AI)
- **Memory:** Minimum 512 MB RAM
- **Storage:** Minimum 500 MB free disk space
- **Network:** Ethernet or WiFi connectivity

### Software Requirements
- **Node.js:** v12.0.0 or higher
- **npm:** v6.0.0 or higher
- **Linux OS:** Raspbian/Debian-based distribution

## Prerequisites

### 1. Raspberry Pi Setup

#### Hardware Preparation
```bash
# Ensure Raspberry Pi is running latest OS
sudo apt-get update
sudo apt-get upgrade -y

# Install required system packages
sudo apt-get install -y \
  build-essential \
  python3 \
  python3-dev \
  git \
  curl \
  libffi-dev \
  libssl-dev
```

#### Install Node.js
```bash
# For Raspberry Pi (ARM-based)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

### 2. BeagleBone Setup

#### Hardware Preparation
```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y \
  build-essential \
  python3 \
  python3-dev \
  git \
  curl \
  libffi-dev \
  libssl-dev
```

#### Install Node.js
```bash
# For BeagleBone (ARM-based)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

## Installation Steps

### 1. Clone Repository

```bash
# Navigate to desired installation directory
cd /opt

# Clone the repository
sudo git clone https://github.com/sberkovitz/relayEquipmentManager.git
cd relayEquipmentManager
```

### 2. Install Dependencies

```bash
# Install npm packages
sudo npm install

# This will install all required dependencies including:
# - i2c-bus: I2C communication library
# - onoff: GPIO control library
# - spi-device: SPI communication library
# - express: Web server framework
# - socket.io: Real-time communication
# - mqtt: MQTT client for IoT connectivity
```

### 3. Build TypeScript

```bash
# Compile TypeScript to JavaScript
sudo npm run build

# This generates the dist/ directory containing compiled JavaScript
```

## Configuration

### Initial Setup

1. **Create config.json** (if not present):
   ```bash
   # Copy default configuration
   cp defaultConfig.json config.json
   ```

2. **Edit configuration file:**
   ```bash
   sudo nano config.json
   ```

### Key Configuration Parameters

#### Web Server Configuration
```json
{
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
        "enabled": false,
        "ip": "0.0.0.0",
        "port": 8443,
        "authentication": "none",
        "authFile": "/users.htpasswd",
        "sslKeyFile": "",
        "sslCertFile": ""
      },
      "mdns": { "enabled": false },
      "ssdp": { "enabled": true }
    }
  }
}
```

#### Logging Configuration
```json
{
  "log": {
    "app": {
      "enabled": true,
      "level": "info",
      "logToFile": false,
      "logPath": "/var/log/rem"
    }
  }
}
```

#### Bus Enablement
```json
{
  "controllerType": "raspi",
  "gpio": { "pins": [] },
  "i2c": { "isActive": true },
  "spi0": { "isActive": true, "busNumber": 0, "channels": [] },
  "spi1": { "isActive": true, "busNumber": 1, "channels": [] },
  "oneWire": { "isActive": false },
  "genericDevices": { "isActive": true }
}
```

See `deployment.md` for detailed bus configuration walkthrough.

## Running the Application

### Start Application

```bash
# Build and start in one command
sudo npm start

# Or start from cached build (faster)
sudo npm run start:cached
```

### Expected Output
```
[2024-01-15 10:30:45] INFO: Relay Equipment Manager starting...
[2024-01-15 10:30:46] INFO: GPIO Controller initialized
[2024-01-15 10:30:47] INFO: I2C Bus initialized
[2024-01-15 10:30:48] INFO: Web server listening on http://0.0.0.0:8080
[2024-01-15 10:30:49] INFO: Connection Broker initialized
```

### Access Web Interface

Open web browser and navigate to:
```
http://<device-ip>:8080
```

For Raspberry Pi:
```
http://raspberrypi.local:8080
```

For BeagleBone:
```
http://beaglebone.local:8080
```

## File Structure

```
relayEquipmentManager/
├── app.ts                      # Application entry point
├── package.json                # npm configuration
├── config.json                 # Runtime configuration (created)
├── defaultConfig.json          # Default configuration template
├── defaultController.json       # Default controller template
├── tsconfig.json               # TypeScript configuration
├── dist/                       # Compiled JavaScript (generated)
├── boards/                     # Hardware controller implementations
│   ├── Controller.ts           # Main controller class
│   └── Constants.ts            # Constants and mappings
├── config/                     # Configuration management
├── connections/                # Connection broker and bindings
├── devices/                    # Device-specific implementations
├── gpio/                       # GPIO interface
├── i2c-bus/                    # I2C bus interface
├── spi-adc/                    # SPI/ADC interface
├── one-wire/                   # 1-Wire interface
├── generic/                    # Generic device support
├── web/                        # Web server and UI
├── logger/                     # Logging system
├── pinouts/                    # Pin mapping definitions
└── docs/                       # Documentation
```

## Common Issues and Solutions

See `troubleshooting.md` for detailed troubleshooting guide including:
- GPIO permission issues
- I2C bus not detected
- SPI enablement problems
- 1-Wire configuration
- Web server connectivity issues

## Next Steps

1. **Enable hardware buses** - See `deployment.md` for I2C/SPI/1-Wire enablement
2. **Configure devices** - Use web UI to configure connected devices
3. **Set up connections** - Link triggers and feeds through Connection Broker
4. **Monitor logs** - Check application logs for issues

## Getting Help

- Review `deployment.md` for detailed configuration walkthrough
- Check `troubleshooting.md` for common issues
- Review component PRDs in `component-prd.md` for architecture details
- Check application logs: `tail -f /var/log/rem/app.log` (if logging to file enabled)

## Version Information

- **REM Version:** 8.0.0
- **Node.js Support:** v12+ (tested on v14, v16)
- **Supported Platforms:** Raspberry Pi, BeagleBone
