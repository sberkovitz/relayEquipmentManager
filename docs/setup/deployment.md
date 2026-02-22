# Deployment Guide

## Overview

This guide covers deploying Relay Equipment Manager to production environments including system-level configuration, bus enablement, and runtime management.

## Pre-Deployment Checklist

- [ ] Node.js and npm installed
- [ ] Repository cloned and built
- [ ] Hardware buses tested (GPIO, I2C, SPI, 1-Wire)
- [ ] Network connectivity verified
- [ ] Firewall rules configured
- [ ] User permissions configured

## System-Level Configuration

### 1. User and Permissions Setup

#### Create Dedicated User

```bash
# Create user for REM service
sudo useradd -m -s /bin/bash relay-mgr

# Add user to required groups for hardware access
sudo usermod -a -G gpio,i2c,spi relay-mgr

# Set ownership of application directory
sudo chown -R relay-mgr:relay-mgr /opt/relayEquipmentManager
```

#### GPIO Permissions

```bash
# Enable GPIO access for non-root users
sudo usermod -a -G gpio relay-mgr

# Verify permissions
groups relay-mgr
```

### 2. Network Configuration

#### Firewall Rules (ufw)

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow web server access
sudo ufw allow 8080/tcp        # HTTP
sudo ufw allow 8443/tcp        # HTTPS (if enabled)

# Allow SSH (if needed for remote management)
sudo ufw allow 22/tcp

# Check rules
sudo ufw status
```

#### Hostname Configuration

```bash
# Set hostname for easy access
sudo hostnamectl set-hostname relay-equipment-1

# Verify
hostname
```

## Bus Enablement and Configuration

### 1. I2C Bus Configuration

#### Raspberry Pi

```bash
# Enable I2C via raspi-config
sudo raspi-config

# Navigate: Interfacing Options → I2C → Yes
```

Or via command line:
```bash
# Edit boot configuration
sudo nano /boot/config.txt

# Add/verify these lines:
# dtparam=i2c_arm=on
# dtparam=i2c_vc=on

# Reboot
sudo reboot
```

#### BeagleBone

I2C is typically enabled by default. Verify:
```bash
# Check for I2C devices
ls -la /dev/i2c*

# Should show: /dev/i2c-0, /dev/i2c-1, etc.
```

#### Verify I2C Installation

```bash
# Install i2c tools
sudo apt-get install -y i2c-tools

# Scan I2C buses
i2cdetect -y 0        # Bus 0
i2cdetect -y 1        # Bus 1

# Expected output: List of I2C device addresses (hex)
```

#### REM Configuration for I2C

Edit `config.json`:
```json
{
  "i2c": {
    "isActive": true
  }
}
```

In application, configure devices via web UI:
1. Navigate to "General" tab
2. Enable I2C bus
3. Configure connected devices (ADS1115, MEGA-IND, etc.)

### 2. SPI Bus Configuration

#### Raspberry Pi

```bash
# Enable SPI via raspi-config
sudo raspi-config

# Navigate: Interfacing Options → SPI → Yes
```

Or via command line:
```bash
# Edit boot configuration
sudo nano /boot/config.txt

# Add/verify this line:
# dtparam=spi=on

# Reboot
sudo reboot
```

#### BeagleBone

SPI is typically enabled. Verify:
```bash
# Check SPI devices
ls -la /dev/spidev*

# Should show: /dev/spidev0.0, /dev/spidev0.1, /dev/spidev1.0, /dev/spidev1.1
```

#### Verify SPI Installation

```bash
# Check kernel module
lsmod | grep spi

# Expected output: spi_bcm2835, spi_rockchip, etc.
```

#### REM Configuration for SPI

Edit `config.json`:
```json
{
  "spi0": {
    "isActive": true,
    "busNumber": 0,
    "channels": []
  },
  "spi1": {
    "isActive": true,
    "busNumber": 1,
    "channels": []
  }
}
```

In application web UI, add SPI devices (MCP3008, MCP3208, etc.):
1. Navigate to "General" tab
2. Enable SPI buses
3. Configure ADC channels and chip profiles

### 3. 1-Wire Bus Configuration

#### Raspberry Pi

```bash
# Edit boot configuration
sudo nano /boot/config.txt

# Add this line (GPIO4 is default):
# dtoverlay=w1-gpio,gpiopin=4

# Or for custom GPIO:
# dtoverlay=w1-gpio,gpiopin=17

# Reboot
sudo reboot
```

#### BeagleBone

1-Wire typically requires manual device tree configuration.

#### Verify 1-Wire Installation

```bash
# Check for 1-Wire devices
ls -la /sys/bus/w1/devices/

# Should show: w1_bus_master0, 28-XXXX (temperature sensors), etc.
```

#### REM Configuration for 1-Wire

Edit `config.json`:
```json
{
  "oneWire": {
    "isActive": true
  }
}
```

In application web UI:
1. Navigate to "General" tab
2. Enable 1-Wire bus
3. Configure temperature sensors and other 1-Wire devices

### 4. GPIO Configuration

GPIO pins can be configured directly via web UI without additional OS setup.

Edit `config.json` for default GPIO setup:
```json
{
  "gpio": {
    "pins": []
  },
  "controllerType": "raspi"
}
```

Supported controller types: `raspi`, `beaglebone`, `sim` (simulation mode)

## Configuration File Walkthrough

### Default Configuration Template

File: `defaultConfig.json`

```json
{
  "development": false,
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
        "ip": "127.0.0.1",
        "port": 8443,
        "authentication": "none",
        "authFile": "/users.htpasswd",
        "sslKeyFile": "",
        "sslCertFile": ""
      },
      "mdns": { "enabled": false },
      "ssdp": { "enabled": true },
      "services": {}
    }
  },
  "log": {
    "app": {
      "enabled": true,
      "level": "info",
      "logToFile": false
    }
  },
  "appVersion": "8.0.0"
}
```

### Configuration Parameters

#### Web Servers Section

- **http.enabled**: Enable HTTP server (boolean)
- **http.ip**: Bind IP address (0.0.0.0 = all interfaces)
- **http.port**: Web server port (default: 8080)
- **https.enabled**: Enable HTTPS server
- **https.sslKeyFile**: Path to SSL private key
- **https.sslCertFile**: Path to SSL certificate
- **authentication**: `"none"`, `"htpasswd"`, or custom
- **mdns.enabled**: Enable mDNS discovery
- **ssdp.enabled**: Enable SSDP discovery (UPnP)

#### Logging Section

- **app.enabled**: Enable application logging
- **app.level**: Log level (`"debug"`, `"info"`, `"warn"`, `"error"`)
- **app.logToFile**: Write logs to file
- **app.logPath**: Directory for log files (default: `/var/log/rem`)

### Using Configuration File

```bash
# Edit working configuration
sudo nano /opt/relayEquipmentManager/config.json

# Configuration persists across restarts
# REM reloads configuration without restart (via web UI)
```

## Runtime Management

### Starting the Service

```bash
# Manual start (for testing)
cd /opt/relayEquipmentManager
sudo npm run start:cached

# With output logging
sudo npm run start:cached 2>&1 | tee output.log
```

### Creating SystemD Service

Create `/etc/systemd/system/relay-equipment-manager.service`:

```ini
[Unit]
Description=Relay Equipment Manager
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=relay-mgr
WorkingDirectory=/opt/relayEquipmentManager
ExecStart=/usr/bin/npm run start:cached
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable relay-equipment-manager

# Start service
sudo systemctl start relay-equipment-manager

# Check status
sudo systemctl status relay-equipment-manager

# View logs
sudo journalctl -u relay-equipment-manager -f
```

### Stopping the Service

```bash
# Stop service
sudo systemctl stop relay-equipment-manager

# Manual stop (if running manually)
# Press Ctrl+C in terminal
```

### Monitoring and Logs

```bash
# Check service status
sudo systemctl status relay-equipment-manager

# View last 50 lines of logs
sudo journalctl -u relay-equipment-manager -n 50

# Follow logs in real-time
sudo journalctl -u relay-equipment-manager -f

# View logs for specific time period
sudo journalctl -u relay-equipment-manager --since "2 hours ago"
```

### Health Checks

```bash
# Check if web server is responding
curl http://localhost:8080/health || echo "Server not responding"

# Check if service is running
systemctl is-active relay-equipment-manager

# Check service resource usage
systemctl status relay-equipment-manager | grep Memory
```

## Performance Tuning

### Node.js Optimization

Edit service file or startup script:
```bash
# Increase heap size for large configurations
export NODE_OPTIONS="--max_old_space_size=512"

# Enable clustering (if needed)
# Modify app.ts for multi-process mode
```

### System Resource Limits

```bash
# Edit /etc/security/limits.conf
# Add for relay-mgr user:
relay-mgr soft nofile 65536
relay-mgr hard nofile 65536
relay-mgr soft nproc 32768
relay-mgr hard nproc 32768
```

## Backup and Recovery

### Configuration Backup

```bash
# Backup configuration and device settings
sudo tar -czf rem_backup_$(date +%Y%m%d).tar.gz \
  /opt/relayEquipmentManager/config.json \
  /opt/relayEquipmentManager/dist/

# Store backup securely
sudo cp rem_backup_*.tar.gz /backup/
```

### Disaster Recovery

```bash
# Stop service
sudo systemctl stop relay-equipment-manager

# Restore from backup
sudo tar -xzf rem_backup_20240115.tar.gz -C /

# Start service
sudo systemctl start relay-equipment-manager
```

## Security Configuration

### HTTPS Setup

```bash
# Generate self-signed certificate (for development)
sudo openssl req -x509 -newkey rsa:2048 -keyout /opt/relayEquipmentManager/key.pem \
  -out /opt/relayEquipmentManager/cert.pem -days 365 -nodes

# Update config.json
```

```json
{
  "https": {
    "enabled": true,
    "port": 8443,
    "sslKeyFile": "/opt/relayEquipmentManager/key.pem",
    "sslCertFile": "/opt/relayEquipmentManager/cert.pem"
  }
}
```

### Authentication Setup

```bash
# Create htpasswd file for HTTP authentication
sudo apt-get install -y apache2-utils
sudo htpasswd -c /opt/relayEquipmentManager/users.htpasswd admin
```

Update config.json:
```json
{
  "http": {
    "authentication": "htpasswd",
    "authFile": "/opt/relayEquipmentManager/users.htpasswd"
  }
}
```

## Deployment Verification

After deployment, verify:

1. **Web Server Accessibility:**
   ```bash
   curl http://localhost:8080/
   ```

2. **GPIO Access:**
   - Navigate to GPIO tab in web UI
   - Test pin read/write

3. **I2C/SPI Devices:**
   - Verify device detection in web UI
   - Test device communication

4. **Logging:**
   - Check service logs
   - Verify expected startup messages

5. **Persistence:**
   - Restart service
   - Verify configuration persisted

## Troubleshooting

See `troubleshooting.md` for detailed guidance on:
- Service startup failures
- Bus communication errors
- Permission issues
- Device detection problems
