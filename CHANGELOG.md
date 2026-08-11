# Changelog

## [10.0.0] - 2026-08-11

### Added
- Software-selectable input type configuration for Sequent Building Automation v5.0+ cards. On startup and when channel types are changed in the UI, the driver now writes I2C registers 215-217 to configure each input channel's hardware mode (0-10V, 1K thermistor, 10K thermistor, or dry contact).
- `hwVersionMajor` getter on `SequentMegaBAS` to detect hardware revision and gate v5+ features.
- `setInputTypeConfig()` method on `SequentMegaBAS` to push channel type bitmasks to the card firmware.

### Changed
- Renamed device display names: "Sequent MEGA-BAS" to "Sequent Building Automation", "Sequent Home Automation v4" to "Sequent Home Automation".

### Fixed
- `SequentMegaBAS.getValue()` now handles `relayval`/`relayobj` bindings (triac feed outputs) — previously returned undefined for triac channels. (#120)
- `SequentMegaBAS.setDeviceState()` now accepts `out0_10*` bindings for 0-10V output channels — previously rejected them with a NaN error. (#120)
- `SequentMegaBAS.getDeviceState()` no longer returns a degraded NaN error for unrecognized binding params — delegates to base class and rejects cleanly if result is undefined. (#120)

## [9.5.0] - 2026-07-14

### Added
- Invert signal support for input channels — allows logical inversion of digital input state via UI toggle. (#118)
- T10k thermistor temperature sub-bindings for 0-10V inputs on Sequent IO boards — exposes calculated temperature values as bindable properties. (#117)
- T10k temperature unit conversion (Celsius/Fahrenheit) and feed properties for thermistor inputs. (#117)

## [9.4.0] - 2026-06-29

### Added
- Digital inputs 5-8 state definitions for Feeds/Triggers on Sequent Home Automation v4 board. (#1213)

### Fixed
- Extended Trixie libgpiod reconfigure workaround to all Pi models, not just Pi 5 — prevents assertion crashes when reconfiguring GPIO lines on any Raspberry Pi running Trixie. (#114)
- Workaround for RP1 libgpiod assertion crash on Pi 5 + Trixie (Debian Bookworm successor). (#114)

## [9.3.0] - 2026-06-16

### Fixed
- SPI ADC bus error handling — SPI bus failures now log diagnostics and recover gracefully instead of crashing.
- Added global error handlers (`uncaughtException`, `unhandledRejection`) to prevent silent server crashes. (#114)
- I2C bus initialization now provides clearer error messaging when the bus is unavailable or fails to open. (#114)

## [9.2.0] - 2026-06-09

### Added
- Delete pin functionality with confirmation dialog in the GPIO management UI. (#112)
- Triac output support for MEGA-BAS board — enables controlling triac channels through the standard output binding interface.
- `MockGpioPin` and `MockBackend` for hardware-free testing — allows running the server on non-Pi hardware for development and CI.

## [9.1.0] - 2026-05-13

### Added
- Sequent Smart Relay Ind v2 device class and JSON configuration file — supports the 4-relay industrial board with status LEDs and input channels.

## [9.0.0] - 2026-04-17

### Changed
- Refactored `SequentSmartFanV6` GPIO handling and fan power retrieval for cleaner separation of concerns.

## [8.9.0] - 2026-03-25

### Changed
- Enhanced GPIO backend support and documentation — improved abstraction layer for multiple GPIO backends (sysfs, libgpiod, mock).

## [8.8.0] - 2026-03-03

### Fixed
- Improved error handling during server initialization and startup in the WebServer class — startup failures now log context and exit cleanly instead of hanging.
