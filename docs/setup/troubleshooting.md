# Troubleshooting Guide

## Common Issues and Solutions

### General Application Issues

#### Application Won't Start

**Symptom:** No error, application exits immediately or hangs

**Solutions:**

1. **Check Node.js installation:**
   ```bash
   node --version
   npm --version
   ```
   Ensure version 12.0.0 or higher.

2. **Verify dependencies installed:**
   ```bash
   cd /opt/relayEquipmentManager
   npm install
   ```

3. **Check for syntax errors in config.json:**
   ```bash
   # Validate JSON
   python3 -m json.tool config.json > /dev/null && echo "Valid JSON"
   ```

4. **View detailed error output:**
   ```bash
   # Run directly without npm wrapper
   cd dist
   node app.js
   ```

5. **Check disk space:**
   ```bash
   df -h
   # Ensure at least 100 MB free space
   ```

#### Port Already in Use

**Symptom:** Error "Address already in use" or "EADDRINUSE"

**Solutions:**

1. **Find process using port:**
   ```bash
   sudo netstat -tulpn | grep 8080
   sudo lsof -i :8080
   ```

2. **Kill existing process (if necessary):**
   ```bash
   sudo kill -9 <PID>
   ```

3. **Change REM port in config.json:**
   ```json
   {
     "web": {
       "servers": {
         "http": {
           "port": 8081
         }
       }
     }
   }
   ```

4. **Verify port is available:**
   ```bash
   nc -z localhost 8080 && echo "Port in use" || echo "Port available"
   ```

#### Web Interface Not Accessible

**Symptom:** Browser shows "Connection refused" or timeout

**Solutions:**

1. **Verify REM is running:**
   ```bash
   ps aux | grep node
   systemctl status relay-equipment-manager
   ```

2. **Check if web server is listening:**
   ```bash
   sudo netstat -tulpn | grep node
   curl http://localhost:8080
   ```

3. **Verify firewall allows access:**
   ```bash
   sudo ufw status
   sudo ufw allow 8080/tcp
   ```

4. **Check bind address in config.json:**
   ```json
   {
     "web": {
       "servers": {
         "http": {
           "ip": "0.0.0.0",  # Use 0.0.0.0 for all interfaces
           "port": 8080
         }
       }
     }
   }
   ```

5. **Test local connectivity first:**
   ```bash
   curl http://127.0.0.1:8080
   # Then try from remote machine with device IP
   ```

#### High Memory Usage

**Symptom:** Process consuming increasing memory, application slows down

**Solutions:**

1. **Monitor memory usage:**
   ```bash
   ps aux | grep node
   free -h
   ```

2. **Increase Node.js heap size (if needed):**
   ```bash
   # Edit systemd service
   export NODE_OPTIONS="--max_old_space_size=1024"
   ```

3. **Restart application:**
   ```bash
   sudo systemctl restart relay-equipment-manager
   ```

4. **Check for device polling issues:**
   - Review configuration for excessive polling rates
   - Disable unused interfaces in config.json

---

## GPIO Issues

### GPIO Pins Not Responding

**Symptom:** Pin commands in web UI have no effect on hardware

**Solutions:**

1. **Verify GPIO permissions:**
   ```bash
   # Check GPIO group membership
   groups $USER
   # Should include 'gpio'
   
   # If not, add user to gpio group
   sudo usermod -a -G gpio $USER
   
   # Apply new group membership (logout/login or use)
   newgrp gpio
   ```

2. **Check GPIO device access:**
   ```bash
   ls -la /dev/gpiochip*
   # Should be readable by gpio group
   ```

3. **Verify controller type in config.json:**
   ```json
   {
     "controllerType": "raspi"  # or "beaglebone"
   }
   ```

4. **Test GPIO directly:**
   ```bash
   # Install GPIO test tool
   sudo apt-get install -y wiringpi
   
   # List GPIO pins
   gpio readall
   ```

5. **Check pin availability:**
   - Ensure pin is not already in use by system
   - Verify pin is physically available (not used by display, etc.)

### GPIO Input Not Detecting State Changes

**Symptom:** GPIO inputs stuck on one state

**Solutions:**

1. **Verify pin configuration:**
   - In web UI, check input pin is set to "IN" mode
   - Verify pull-up/pull-down settings match hardware

2. **Check hardware connections:**
   ```bash
   # Use multimeter to verify voltage levels
   # GPIO input should show 0V (low) or 3.3V (high)
   ```

3. **Test pin manually:**
   ```bash
   # Read GPIO value directly
   cat /sys/class/gpio/gpio17/value
   # Should show 0 or 1
   ```

4. **Increase polling rate (if applicable):**
   - In web UI device settings, reduce polling interval
   - Typical range: 100-500ms

### GPIO Output Not Controlling Hardware

**Symptom:** Relay or LED not responding to GPIO output commands

**Solutions:**

1. **Verify pin direction:**
   ```bash
   cat /sys/class/gpio/gpio17/direction
   # Should show "out"
   ```

2. **Test voltage output:**
   ```bash
   # Use multimeter to verify 3.3V output
   cat /sys/class/gpio/gpio17/value  # Should show 0 or 1
   ```

3. **Check hardware connections:**
   - Verify relay/transistor is connected properly
   - Check pull-up resistor if needed
   - Verify power supply to relay/LED

4. **Test GPIO state directly:**
   ```bash
   # Test drive GPIO high
   echo 1 > /sys/class/gpio/gpio17/value
   
   # Test drive GPIO low
   echo 0 > /sys/class/gpio/gpio17/value
   ```

5. **Check current limitations:**
   - GPIO pins typically support 16mA max
   - Use transistor or relay for higher current loads

---

## I2C Bus Issues

### I2C Bus Not Detected

**Symptom:** "I2C bus not found" error or no devices listed

**Solutions:**

1. **Verify I2C is enabled in OS:**

   **Raspberry Pi:**
   ```bash
   # Check raspi-config
   sudo raspi-config
   # Navigate: Interfacing Options → I2C → Enabled
   ```

   **Or edit config.txt:**
   ```bash
   sudo nano /boot/config.txt
   # Verify dtparam=i2c_arm=on exists
   sudo reboot
   ```

2. **Check I2C devices appear:**
   ```bash
   ls -la /dev/i2c*
   # Should show /dev/i2c-0 and/or /dev/i2c-1
   ```

3. **Install I2C tools:**
   ```bash
   sudo apt-get install -y i2c-tools
   i2c-detect -l  # List I2C buses
   ```

4. **Verify I2C library installed:**
   ```bash
   npm list i2c-bus
   # Should show version 5.2.2 or later
   ```

5. **Check permissions:**
   ```bash
   ls -la /dev/i2c-0
   # Should be accessible to relay-mgr user
   
   sudo usermod -a -G i2c relay-mgr
   ```

### I2C Devices Not Detected on Bus

**Symptom:** Bus detected but no devices appear

**Solutions:**

1. **Scan I2C bus for devices:**
   ```bash
   i2cdetect -y 0  # Bus 0
   i2cdetect -y 1  # Bus 1
   # Should show hexadecimal addresses where devices connected
   ```

2. **Verify hardware connections:**
   - Check SDA (data) and SCL (clock) connections
   - Verify pull-up resistors present (typically 4.7k Ohm)
   - Check power supply to I2C devices (3.3V or 5V as appropriate)

3. **Check pin conflicts:**
   ```bash
   # List devices using GPIO pins
   raspi-gpio get
   ```

4. **Try different I2C bus:**
   - Some devices support multiple I2C buses
   - Try I2C-0 vs I2C-1

5. **Verify I2C address in REM:**
   - Get actual device address: `i2cdetect -y 0`
   - Update REM configuration with correct address
   - Common addresses: 0x48-0x4F (ADS1115), 0x20-0x27 (expansion), etc.

### I2C Device Communication Errors

**Symptom:** "Read error", "Write error", or "Device not responding"

**Solutions:**

1. **Test I2C communication directly:**
   ```bash
   # Read register from device
   i2cget -y 0 0x48 0x00  # Bus 0, Address 0x48, Register 0x00
   
   # Should return a value or "error"
   ```

2. **Check I2C voltage levels:**
   ```bash
   # SDA and SCL should be 3.3V when idle (pulled high)
   # Use oscilloscope or multimeter
   ```

3. **Verify pull-up resistors:**
   - Many Pi/BeagleBone boards have internal pull-ups
   - Some I2C devices require external pull-ups (4.7k Ohm typical)

4. **Reduce I2C clock speed:**
   ```bash
   # Edit /boot/config.txt (Raspberry Pi)
   dtparam=i2c_arm=on
   dtparam=i2c_baudrate=50000  # Reduce from default 100000
   ```

5. **Check for bus conflicts:**
   ```bash
   # Multiple I2C devices at same address
   i2cdetect -y 0
   ```

6. **Reset I2C bus:**
   ```bash
   # Unplug devices, power cycle, reconnect
   # Or restart REM service
   sudo systemctl restart relay-equipment-manager
   ```

---

## SPI Bus Issues

### SPI Bus Not Detected

**Symptom:** "SPI not found" or no devices listed

**Solutions:**

1. **Enable SPI in OS:**

   **Raspberry Pi:**
   ```bash
   sudo raspi-config
   # Navigate: Interfacing Options → SPI → Yes
   ```

   **Or edit config.txt:**
   ```bash
   sudo nano /boot/config.txt
   # Verify dtparam=spi=on exists
   sudo reboot
   ```

2. **Check SPI devices:**
   ```bash
   ls -la /dev/spidev*
   # Should show /dev/spidev0.0, /dev/spidev0.1, etc.
   ```

3. **Verify SPI kernel module loaded:**
   ```bash
   lsmod | grep spi
   # Should show spi_bcm2835 (Raspberry Pi) or similar
   ```

4. **Check permissions:**
   ```bash
   sudo usermod -a -G spi relay-mgr
   ```

### SPI Device Communication Errors

**Symptom:** ADC not reading, SPI timeout, corrupted data

**Solutions:**

1. **Verify hardware connections:**
   - MOSI (GPIO10): Master Out, Slave In
   - MISO (GPIO9): Master In, Slave Out
   - SCLK (GPIO11): Serial Clock
   - CS (GPIO8/CE0 or GPIO7/CE1): Chip Select
   - VCC: 3.3V or 5V (check device spec)
   - GND: Ground

2. **Check SPI clock speed:**
   ```bash
   # Test with slower clock speed
   # Edit REM configuration for SPI device
   # Typical: 1MHz for long cables, 10MHz for short
   ```

3. **Verify chip select pin:**
   ```bash
   # Ensure correct CE pin selected (CE0 = GPIO8, CE1 = GPIO7)
   # Single device: Use CE0 (GPIO8)
   # Multiple devices: Separate CE pins
   ```

4. **Test SPI directly:**
   ```bash
   # Install SPI tools
   sudo apt-get install -y spi-tools
   
   # Loopback test
   spidev_test -D /dev/spidev0.0
   ```

5. **Check ADC configuration:**
   - Verify correct chip type selected (MCP3008 vs MCP3208, etc.)
   - Check reference voltage configuration
   - Verify channel selection matches wiring

---

## 1-Wire Bus Issues

### 1-Wire Bus Not Detected

**Symptom:** "No 1-Wire bus found" or no temperature sensors appearing

**Solutions:**

1. **Enable 1-Wire overlay:**
   ```bash
   sudo nano /boot/config.txt
   # Add (or modify) this line:
   # dtoverlay=w1-gpio,gpiopin=4
   # (GPIO4 is default, adjust if needed)
   
   sudo reboot
   ```

2. **Check 1-Wire bus:**
   ```bash
   ls -la /sys/bus/w1/devices/
   # Should show w1_bus_master0 and device IDs (28-XXXX for temp sensors)
   ```

3. **Verify 1-Wire kernel modules loaded:**
   ```bash
   lsmod | grep w1
   # Should show: w1_gpio, w1_therm, wire
   ```

### 1-Wire Devices Not Detected

**Symptom:** Bus present but no sensors listed

**Solutions:**

1. **Verify hardware connection:**
   - Check GPIO pin matches config (default GPIO4)
   - Verify power connection to 1-Wire devices
   - Check pull-up resistor (4.7k Ohm typical)
   - Use correct 1-Wire bus topology (parasite power vs separate)

2. **Check 1-Wire device family:**
   ```bash
   cat /sys/bus/w1/devices/w1_bus_master0/w1_master_slave_count
   # Should show number of connected devices
   ```

3. **Read sensor directly:**
   ```bash
   # Temperature sensors have 28-XXXX device IDs
   cat /sys/bus/w1/devices/28-XXXX/w1_slave
   # Shows temperature value
   ```

4. **Try stronger pull-up:**
   - Install external 4.7k pull-up resistor if not present
   - For longer cables, use 2.2k pull-up

### 1-Wire Temperature Readings Erratic

**Symptom:** Temperature jumps around or shows invalid readings

**Solutions:**

1. **Check sensor connection quality:**
   - Ensure secure connections
   - Check for corroded pins
   - Verify correct pin assignment

2. **Reduce sensor polling rate:**
   - In REM web UI, increase polling interval
   - Recommended: 5-10 seconds minimum

3. **Check power supply stability:**
   - Use separate power supply for 1-Wire devices if possible
   - Verify no voltage drops

4. **Verify sensor data format:**
   ```bash
   # Raw sensor output should show YES at end
   cat /sys/bus/w1/devices/28-XXXX/w1_slave
   # Last line should end with "YES"
   ```

---

## Web Server Issues

### HTTPS Certificate Errors

**Symptom:** Browser warning about self-signed certificate

**Solutions:**

1. **For development/testing:**
   - Click "Advanced" and accept exception
   - Or disable HTTPS in config.json

2. **For production:**
   - Obtain valid certificate from trusted CA
   - Update config.json with certificate paths:
     ```json
     {
       "https": {
         "sslKeyFile": "/path/to/key.pem",
         "sslCertFile": "/path/to/cert.pem"
       }
     }
     ```

3. **Generate self-signed certificate:**
   ```bash
   sudo openssl req -x509 -newkey rsa:2048 \
     -keyout /opt/relayEquipmentManager/key.pem \
     -out /opt/relayEquipmentManager/cert.pem \
     -days 365 -nodes
   ```

### Authentication Failures

**Symptom:** 403 Forbidden or login issues

**Solutions:**

1. **Verify htpasswd file created:**
   ```bash
   # If authentication enabled, htpasswd must exist
   sudo htpasswd -c /opt/relayEquipmentManager/users.htpasswd admin
   
   # Add additional users
   sudo htpasswd /opt/relayEquipmentManager/users.htpasswd user2
   ```

2. **Check auth file path in config.json:**
   ```json
   {
     "authentication": "htpasswd",
     "authFile": "/opt/relayEquipmentManager/users.htpasswd"
   }
   ```

3. **Disable authentication if needed (for testing):**
   ```json
   {
     "authentication": "none"
   }
   ```

### WebSocket Connection Fails

**Symptom:** Real-time updates not working, web UI unresponsive

**Solutions:**

1. **Check firewall allows WebSocket:**
   ```bash
   # WebSocket uses same port as HTTP/HTTPS
   sudo ufw allow 8080/tcp
   ```

2. **Verify socket.io library:**
   ```bash
   npm list socket.io
   # Should show version 4.5.0 or later
   ```

3. **Check browser console for errors:**
   - Open browser Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed WebSocket connections

---

## Performance Issues

### Web UI Slow or Unresponsive

**Symptom:** Delays when clicking buttons, scrolling, or updating values

**Solutions:**

1. **Check system resources:**
   ```bash
   top          # CPU and memory usage
   iostat -x 1  # Disk I/O
   ```

2. **Reduce polling rates:**
   - For GPIO: increase interval to 500ms+
   - For I2C/SPI: increase interval to 1000ms+
   - For 1-Wire: increase interval to 5000ms+

3. **Reduce number of active devices:**
   - Disable unused interfaces
   - Remove unused device configurations

4. **Optimize device configuration:**
   - Disable unnecessary logging
   - Reduce connection broker update frequency

### Device Updates Delayed

**Symptom:** Device state changes take seconds to reflect in UI

**Solutions:**

1. **Check polling configuration:**
   - Ensure polling intervals are set appropriately
   - Verify device supports continuous polling

2. **Check bus contention:**
   - Multiple devices on same bus can cause delays
   - Verify no bus conflicts

3. **Monitor system load:**
   ```bash
   uptime
   # If load > CPU cores, reduce polling or disable devices
   ```

---

## Log Analysis

### Enable Debug Logging

```bash
# Edit config.json
{
  "log": {
    "app": {
      "level": "debug",
      "logToFile": true,
      "logPath": "/var/log/rem"
    }
  }
}
```

### View Application Logs

```bash
# If using systemd service
sudo journalctl -u relay-equipment-manager -f

# If logging to file
sudo tail -f /var/log/rem/app.log
```

### Common Log Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| EACCES (Permission denied) | Insufficient user permissions | Add user to required groups |
| ENOENT (No such file) | Missing config or device file | Verify file paths in config |
| ENODEV (No such device) | Hardware not detected | Enable in OS, verify connections |
| EADDRINUSE | Port already in use | Change port or kill existing process |
| ECONNREFUSED | Connection to device failed | Check I2C/SPI bus, verify device address |

---

## Escalation Checklist

If issue persists after trying these solutions:

- [ ] Collect detailed error logs with debug enabled
- [ ] Document exact steps to reproduce
- [ ] Include system information: `uname -a`, `cat /etc/os-release`
- [ ] Include hardware details: Raspberry Pi model, connected devices
- [ ] Include output of relevant diagnostic commands
- [ ] Check GitHub issues for similar problems
- [ ] File issue with collected diagnostic information
