# Fix ISSUE-002: SequentMegaBAS.setDeviceState() rejects 0-10V output bindings

## Root Cause (Validated)

`SequentMegaBAS.setDeviceState()` — `i2c-bus/SequentIO.ts:1125–1126`:

```ts
let relayId = parseInt(bind.params[0], 10);
if (isNaN(relayId)) return Promise.reject(new Error(`setDeviceState: Invalid triac Id ${bind.params[0]}`));
```

`bind.params[0]` for a 0-10V output binding is `"out0_101"`, `"out0_102"`, etc.  `parseInt` returns NaN for any non-numeric prefix → immediate rejection.

## Fix — Task 1

Replace lines 1125–1126 with:

```ts
let relayId = parseInt(bind.params[0], 10);
if (isNaN(relayId)) {
    let p = bind.params[0].toLowerCase();
    if (p.startsWith('out0_10')) {
        let ord = parseInt(p[p.length - 1], 10);
        if (isNaN(ord) || ord < 1 || ord > this.out0_10.length)
            return Promise.reject(new Error(`setDeviceState: Invalid 0-10v output channel ${bind.params[0]}`));
        let io = this.out0_10[ord - 1];
        if (typeof io === 'undefined' || !io.enabled)
            return Promise.reject(new Error(`setDeviceState: 0-10v output channel [${bind.params[0]}] is not available.`));
        let val = typeof data === 'number' ? data
            : typeof data === 'object' && typeof data.value !== 'undefined' ? data.value
            : parseFloat(data);
        if (isNaN(val)) return Promise.reject(new Error(`setDeviceState: Invalid value for 0-10v output: ${data}`));
        await this.set0_10Output(ord, val);
        return io;
    }
    return Promise.reject(new Error(`setDeviceState: Invalid triac Id ${bind.params[0]}`));
}
```

**Why this approach:**
- `p.startsWith('out0_10')` matches `out0_101`…`out0_104` (and the dot-variant `out0_10.1` if ever used)
- `p[p.length - 1]` extracts the channel digit (mirrors `SequentIO.setValue()` pattern at line 448)
- Bounds check uses `this.out0_10.length` (4) — avoids hardcoding
- `set0_10Output` enforces 0–10V range internally; `data` coercion handles number / `{value: N}` / string forms
- Non-matching non-numeric params still fall through to the original clear error

## No other files need changes

`SequentMegaBAS.set0_10Output` (line 1049) already handles the I2C write correctly.  
`devices/SequentIO.json` is unchanged (bindings already defined as `out0_101`…`out0_104`).

## Task 2 — Build

```bash
cd /Users/rgoldin/Programming/relayEquipmentManager && npm run build
```

Zero TypeScript errors expected.

## Tasks 3–4 — QA tracking

Move ISSUE-002 to `docs/ISSUES_COMPLETED.md` with full Resolution, Date Resolved (2026-08-11), and Regression Test. Update `docs/ISSUES_INDEX.md`. Validate all files per Step 8.
