# Plan: Thermistor10k — Pre-calculated Temperature Input Types

## Context

The probe currently has `inputType` options `raw`, `volt`, `ohms` — each describes what the incoming `adcValue` represents. The Sequent Smart Relay Ind v2 board (and others) output a firmware-calculated temperature, but the probe has no way to describe that, so the Input Type section is silently bypassed.

Adding `tempC`, `tempF`, `tempK` as three new `inputType` options makes the incoming unit explicit. The probe then converts to all three scales and outputs `temperature` in whatever the **Units** dropdown is set to. The Device Options panel is always meaningful.

## Data flow

```mermaid
flowchart LR
    board["Smart Relay Ind v2"]
    feed["Feed\nadcValue"]
    probe["Thermistor10k probe"]
    output["temperature\ntempC / tempF / tempK"]

    board -->|"inUniversal2.value (°C)"| feed
    feed --> probe
    probe -->|"inputType = tempC\nUnits = F"| output
```

When `inputType = tempC` and `Units = F`, the probe receives 23.6, derives all three scales, and outputs `temperature = 74.5°F`.

## Changes

### Task 1 — [`devices/temperature.json`](devices/temperature.json): add three new picklist items

In the `inputType` picklist `items` array (~line 1137), add after the existing `ohms` entry:

```json
{
  "val": "tempC",
  "name": "Temperature (°C)",
  "desc": "Pre-calculated temperature in Celsius"
},
{
  "val": "tempF",
  "name": "Temperature (°F)",
  "desc": "Pre-calculated temperature in Fahrenheit"
},
{
  "val": "tempK",
  "name": "Temperature (°K)",
  "desc": "Pre-calculated temperature in Kelvin"
}
```

The existing `selchanged` JS event hides/shows `pnl-{val}input-options` panels. Since `tempC`/`tempF`/`tempK` need no sub-options (no bit-depth, no vccRef, no resistance units), all existing sub-panels hide automatically — the Input Value section becomes clean and empty for these options. The **Calculation** section (interpolate / Steinhart-Hart) is also irrelevant for pre-calculated types; its visibility could be left as-is (it does no harm) or hidden via the same `selchanged` mechanism.

### Task 2 — [`devices/temperature.json`](devices/temperature.json): simplify probe inputs

Replace the current 5-entry `inputs` array back to just `adcValue`. The named `resistance`/`tempC`/`tempF`/`tempK` input slots are no longer needed — `inputType` carries that meaning.

```json
"inputs": [
  { "name": "adcValue", "desc": "ADC Value", "dataType": "number" }
]
```

### Task 3 — [`generic/Temperature.ts`](generic/Temperature.ts): handle new inputTypes in `convertValue()`

Add three cases inside the `switch (device.options.inputType)` block. Each receives `adcValue` already in the named unit and derives all three scales plus the calibrated output:

```typescript
case 'tempc':
    device.values.tempC = device.values.adcValue;
    device.values.tempK = utils.convert.temperature.convertUnits(device.values.adcValue, 'c', 'k');
    device.values.tempF = utils.convert.temperature.convertUnits(device.values.adcValue, 'c', 'f');
    device.values.temperature = utils.convert.temperature.convertUnits(device.values.adcValue, 'c', device.values.units || 'f') + (device.options.calibration || 0);
    return value;
case 'tempf':
    device.values.tempF = device.values.adcValue;
    device.values.tempK = utils.convert.temperature.convertUnits(device.values.adcValue, 'f', 'k');
    device.values.tempC = utils.convert.temperature.convertUnits(device.values.adcValue, 'f', 'c');
    device.values.temperature = utils.convert.temperature.convertUnits(device.values.adcValue, 'f', device.values.units || 'f') + (device.options.calibration || 0);
    return value;
case 'tempk':
    device.values.tempK = device.values.adcValue;
    device.values.tempC = utils.convert.temperature.convertUnits(device.values.adcValue, 'k', 'c');
    device.values.tempF = utils.convert.temperature.convertUnits(device.values.adcValue, 'k', 'f');
    device.values.temperature = utils.convert.temperature.convertUnits(device.values.adcValue, 'k', device.values.units || 'f') + (device.options.calibration || 0);
    return value;
```

These `return value` early exits skip the `calcType` switch (Steinhart-Hart / lookup table), which is correct — there's no resistance to process.

Note: `device.values.units` is set from `device.options.units` at the top of `convertValue()` before the switch, so it's available.

### Task 4 — [`generic/Temperature.ts`](generic/Temperature.ts): remove old early-returns from `setValue()`

Remove the `if (lp === 'tempc' || ...)` and `if (lp === 'resistance')` blocks added in earlier sessions. They were workarounds; the `convertValue()` switch now handles this cleanly. `setValue()` returns to its simple form: store value, call `convertValue()`.

## User workflow after fix

| Board Send Value | Probe Input | Probe Input Type | Probe Units | Result |
|---|---|---|---|---|
| `inUniversal2.resistance` (~10,936 ohms) | `adcValue` | `Resistance` | F | Thermistor table → correct °F |
| `inUniversal2.value` (23.6°C) | `adcValue` | `Temperature (°C)` | F | Converted → 74.5°F |
| `inUniversal2.tempF` (74.5°F) | `adcValue` | `Temperature (°F)` | F | Used directly (+ calibration) |

The Input Type dropdown now always describes exactly what the incoming value is, and the Units dropdown always describes the output. No silent bypassing.

## Critical files

- [`generic/Temperature.ts`](generic/Temperature.ts) — core logic: add three cases to `convertValue()`, remove old early-returns from `setValue()`
- [`devices/temperature.json`](devices/temperature.json) — UI definition: add three picklist items, simplify inputs array
