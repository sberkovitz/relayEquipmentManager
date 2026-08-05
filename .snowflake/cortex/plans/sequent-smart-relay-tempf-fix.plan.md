# Fix: Sequent Smart Relay Ind v2 — Temperature Unit Conversion

## Problem Summary

The Sequent Smart Relay Ind v2 board firmware returns temperature for T10k thermistor channels directly in °C (e.g. 35.096°C ≈ 95.2°F). The `takeReadings()` method stores this raw °C value in `chU.value`. The only feed property exposed for these channels is `inUniversalN.value`, which returns the raw °C number unchanged.

When this value is fed to nodejs-poolController (njspc), njspc expects Fahrenheit, so it displays 35°F instead of the correct ~95°F. There is no `inUniversalN.tempF` property to select, and no automatic conversion in the feed pipeline.

## Root Cause

`SequentSmartRelayInd.getValue()` (`i2c-bus/SequentIO.ts:3031-3034`) only handles `.value` and `.resistance` sub-properties. The parent class has `cputempf`/`cputempk` with `utils.convert.temperature.convertUnits`, but the `inUniversal` prefix path returns early before reaching that logic.

The JSON definition (`devices/SequentIO.json:3542-3549`) only lists `inUniversalN.value` and `inUniversalN.resistance`, giving users no temperature-unit option to select.

## Fix

### Task 1 — `i2c-bus/SequentIO.ts` (~line 3031)

```typescript
// Before:
if (parr[1] === 'value') return chan.value;
if (parr[1] === 'resistance') return chan.resistance;
return super.getValue(parr[1]);

// After:
if (parr[1] === 'value') return chan.value;
if (parr[1] === 'resistance') return chan.resistance;
if (parr[1] === 'tempc') return chan.type === 'T10k' ? chan.value : undefined;
if (parr[1] === 'tempf') return chan.type === 'T10k' ? utils.convert.temperature.convertUnits(chan.value, 'c', 'f') : undefined;
if (parr[1] === 'tempk') return chan.type === 'T10k' ? utils.convert.temperature.convertUnits(chan.value, 'c', 'k') : undefined;
return super.getValue(parr[1]);
```

### Task 2 — `devices/SequentIO.json` (after line 3549)

Add after the 4 `inUniversalN.resistance` entries:

```json
{ "name": "inUniversal1.tempC", "desc": "Universal in #1 T10k temperature (°C)", "maxSamples": 50 },
{ "name": "inUniversal2.tempC", "desc": "Universal in #2 T10k temperature (°C)", "maxSamples": 50 },
{ "name": "inUniversal3.tempC", "desc": "Universal in #3 T10k temperature (°C)", "maxSamples": 50 },
{ "name": "inUniversal4.tempC", "desc": "Universal in #4 T10k temperature (°C)", "maxSamples": 50 },
{ "name": "inUniversal1.tempF", "desc": "Universal in #1 T10k temperature (°F)", "maxSamples": 50 },
{ "name": "inUniversal2.tempF", "desc": "Universal in #2 T10k temperature (°F)", "maxSamples": 50 },
{ "name": "inUniversal3.tempF", "desc": "Universal in #3 T10k temperature (°F)", "maxSamples": 50 },
{ "name": "inUniversal4.tempF", "desc": "Universal in #4 T10k temperature (°F)", "maxSamples": 50 },
{ "name": "inUniversal1.tempK", "desc": "Universal in #1 T10k temperature (°K)", "maxSamples": 50 },
{ "name": "inUniversal2.tempK", "desc": "Universal in #2 T10k temperature (°K)", "maxSamples": 50 },
{ "name": "inUniversal3.tempK", "desc": "Universal in #3 T10k temperature (°K)", "maxSamples": 50 },
{ "name": "inUniversal4.tempK", "desc": "Universal in #4 T10k temperature (°K)", "maxSamples": 50 }
```

## User instructions after the fix

In the feed configuration for the Smart Relay Ind v2, select **"Universal in #2 T10k temperature (°F)"** (`inUniversal2.tempF`) as the Send Value instead of `inUniversal2.value`. This will feed the correctly converted Fahrenheit temperature to the dashboard.
