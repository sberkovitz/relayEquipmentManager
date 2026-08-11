# Plan: Sequent Building Automation v5.0–5.2 Support

## Background

From [this pool controller discussion](https://github.com/tagyoureit/nodejs-poolController/discussions/1226#discussioncomment-17769096), a user reported their current Sequent Building Automation card is v5.2 and asked if it works with REM. Sequent confirmed the relevant software change for v5.x:

> DIP Switches for analog input selection replaced with many MOSFETs for **software selection**.

This matches what is documented in the [megabas-rpi repository](https://github.com/SequentMicrosystems/megabas-rpi):

> For cards version 5.0 and up, input types are not dipswitch selectable, as for the previous versions, but software selectable.

The other v5.x changes (stronger power supply, lower-resistance watchdog MOSFET) require no software changes.

## What Changed at the Hardware Level

On v5.0+ Building Automation cards, the firmware reads three bitmask registers at I2C addresses 215–217 to determine each channel's input mode. If the software never writes these registers, the card defaults all channels to 0-10V mode internally — so thermistor and dry-contact readings would be wrong.

| Register | Address | Bitmask meaning |
|---|---|---|
| `I2C_MEM_UIN_SEL` | 215 | Bit N set → channel N+1 is 0-10V |
| `I2C_MEM_1K_SEL` | 216 | Bit N set → channel N+1 is 1K thermistor or dry contact |
| `I2C_MEM_10K_SEL` | 217 | Bit N set → channel N+1 is 10K thermistor |

Type mapping from C source (`doInCfgWrite`):

| UI type | Register bit to set |
|---|---|
| `AIN` (0-10V) | 215 |
| `T1k` (1K thermistor) | 216 |
| `DIN` (dry contact) | 216 (same hardware config as T1k) |
| `T10k` (10K thermistor) | 217 |

On pre-v5 cards, this change has **no effect** — the write is simply ignored because those registers are unused/read-only on older firmware. So the version-conditional gate is strictly a safety measure.

## What Does NOT Change

- The register addresses for **reading** values are unchanged (12 for AIN, 28 for T1k, 44 for T10k, reg 3 for DIN)
- The UI options (DIN/AIN/T1k/T10k per channel) are unchanged
- No new JSON options fields needed
- No new device entry needed — single selector remains

## Regarding the Home Automation Card (ioplus)

The `ioplus-rpi` repository has **no** equivalent software-selectable input type registers (`I2C_MEM_UIN_SEL` etc. do not appear in `ioplus.h`). The ioplus analog inputs are fixed 0-10V. No code changes are needed for v5 of this card — only a display name cleanup.

---

## Implementation Steps

### Task 1 — Rename display names in `devices/SequentIO.json`

Remove the version suffix from both device names so they are future-proof:

- `id 902`: `"Sequent MEGA-BAS"` → `"Sequent Building Automation"`
- `id 905`: `"Sequent Home Automation v4"` → `"Sequent Home Automation"`

The `deviceClass` and `module` fields stay the same.

### Task 2 — Add `hwVersionMajor` helper to `SequentMegaBAS`

The base `getHwFwVer()` already reads register 120 (0x78) into `this.info.hwVersion` as a string like `"5.00"` or a number like `5.01`. A private getter parses the integer major:

```typescript
private get hwVersionMajor(): number {
    if (typeof this.info === 'undefined' || typeof this.info.hwVersion === 'undefined') return 0;
    return parseInt(String(this.info.hwVersion), 10);
}
```

### Task 3 — Add `setInputTypeConfig()` to `SequentMegaBAS`

New method that derives the three bitmasks from the current `this.in0_10` channel types and writes all three bytes in a single `writeI2cBlock` call:

```typescript
protected async setInputTypeConfig(): Promise<void> {
    try {
        let uinSel = 0, k1Sel = 0, k10Sel = 0;
        for (const ch of this.in0_10) {
            const bit = 1 << (ch.id - 1);
            if (ch.type === 'T10k')              k10Sel |= bit;
            else if (ch.type === 'T1k' || ch.type === 'DIN') k1Sel  |= bit;
            else                                  uinSel |= bit; // AIN default
        }
        if (!this.i2c.isMock) {
            await this.i2c.writeI2cBlock(this.device.address, 215, 3,
                Buffer.from([uinSel, k1Sel, k10Sel]));
        }
    } catch (err) {
        logger.error(`${this.device.name} error writing input type config: ${err.message}`);
    }
}
```

### Task 4 — Call `setInputTypeConfig()` in `initAsync`

In `SequentMegaBAS.initAsync`, after the existing `getHwFwVer()` / `getStatus()` calls:

```typescript
if (this.device.isActive) {
    await this.getHwFwVer();
    await this.getStatus();
    if (this.hwVersionMajor >= 5) await this.setInputTypeConfig();
}
```

This pushes the saved UI configuration to the card each time the device initialises, ensuring the card's hardware matches the user's stored settings after a restart.

### Task 5 — Call `setInputTypeConfig()` in `setValues`

In `SequentMegaBAS.setValues`, after the existing `setIOChannelOptions` call for `in0_10`:

```typescript
if (typeof vals.inputs.in0_10 !== 'undefined') {
    await this.setIOChannelOptions(vals.inputs.in0_10, this.in0_10);
    if (this.hwVersionMajor >= 5) await this.setInputTypeConfig();
}
```

This writes the new type to the card immediately when the user changes a channel type in the UI.

### Task 6 — Build and verify

```bash
npm run build
```

Expect zero TypeScript errors. The changes are all additive — no existing call sites change.

---

## v4 Compatibility

- The `hwVersionMajor >= 5` guard means `setInputTypeConfig()` is **never called** on pre-v5 hardware
- The only other change on v4 is the display name in the device picker (cosmetic)
- No existing persisted data structures are modified

---

## Critical Files

- [`i2c-bus/SequentIO.ts`](i2c-bus/SequentIO.ts) — `SequentMegaBAS` class (lines 941–1339): add getter + new method + two call sites
- [`devices/SequentIO.json`](devices/SequentIO.json) — two `"name"` string changes (ids 902 and 905)
