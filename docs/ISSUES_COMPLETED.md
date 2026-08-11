# Completed Issues

## ISSUE-001: SequentMegaBAS.getValue() missing relayval/relayobj branch — triac feeds silently broken

| Field | Details |
|---|---|
| **ID** | ISSUE-001 |
| **Title** | SequentMegaBAS.getValue() missing relayval/relayobj branch — triac feeds silently broken |
| **Date Reported** | 2026-08-09 |
| **Date Resolved** | 2026-08-11 |
| **Status** | Resolved |
| **Severity** | High |
| **Component** | i2c-bus/SequentIO.ts — SequentMegaBAS.getValue(), devices/SequentIO.json |
| **Environment** | All MEGA-BAS boards |

### Symptoms
- Any feed bound to `relayVal1`–`relayVal4` or `relayObj1`–`relayObj4` on a MEGA-BAS device returns `undefined`
- Log shows: `error getting I/O channel relayVal1` (and relayVal2–4, relayObj1–4) on every poll

### Root Cause
Commit `a9f964e` added `relayVal1..4`/`relayObj1..4` entries (described as "Value for triac #1" etc.) to the MEGA-BAS `feeds` array in `devices/SequentIO.json`. However, `SequentMegaBAS.getValue()` had no `relayval` or `relayobj` branch — the `default:` case only handled `out4_20`, `in4_20`, `out0_10`, `in0_10`, falling through to an error log + `return undefined`. `Sequent4RelIND.getValue()` and `SequentHomeAuto.getValue()` both had the branches; MEGA-BAS was the only one missing them.

### Evidence
- `i2c-bus/SequentIO.ts` (pre-fix) `default:` block: no `relayval`/`relayobj` case
- `Sequent4RelIND.getValue()` line ~1532–1550: reference implementation used for the fix
- `devices/SequentIO.json`: MEGA-BAS feeds include `"name": "relayVal1"`, `"desc": "Value for triac #1"` through relayVal4/relayObj4
- Reported by `johnny2678` in PR #120 comment, 2026-08-09

### Resolution
Added `relayvalall`, `relayval`, and `relayobj` branches to `SequentMegaBAS.getValue()` (`i2c-bus/SequentIO.ts` line ~1302), mirroring the existing implementation in `Sequent4RelIND.getValue()`. The new branches return the triac boolean state or relay object for the requested index, using the same `parseInt(p.substring(8))` / bounds-check pattern as sibling classes.

### Regression Test
- **Check:** MEGA-BAS feed `relayVal1` resolves to a value (not undefined)
- **Command:** Visit the board's feed/trigger config in the UI; verify relayVal1..4 / relayObj1..4 show triac state rather than empty
- **Expected:** Feed resolves to the boolean triac state; no "error getting I/O channel relayVal1" in logs

### Notes
- Independent of PR #120 — bug existed in master since `a9f964e`
- Flagged by `johnny2678` at: https://github.com/rstrouse/relayEquipmentManager/pull/120#issuecomment-5232382512


## ISSUE-003: PR #120 — garbage binding params return undefined instead of rejecting in getDeviceState

| Field | Details |
|---|---|
| **ID** | ISSUE-003 |
| **Title** | PR #120 — garbage binding params return undefined instead of rejecting in getDeviceState |
| **Date Reported** | 2026-08-09 |
| **Date Resolved** | 2026-08-11 |
| **Status** | Resolved |
| **Severity** | Low |
| **Component** | i2c-bus/SequentIO.ts — SequentMegaBAS.getDeviceState() |
| **Environment** | MEGA-BAS boards, only affects misconfigurations / truly unrecognized binding params |

### Symptoms
- Before fix: any non-numeric param to `getDeviceState` rejected with `Invalid triac Id <param>`, blocking valid IO channel reads
- PR #120's delegation-only fix: valid params work; garbage params (`foo`) resolve as `undefined` instead of rejecting

### Root Cause
PR #120 delegated non-numeric params to `super.getDeviceState(bind)`. The base class calls `this.getValue(bind.params[0])`, which returns `undefined` for unrecognised props (feeding polling needs this contract). Making `getValue` throw would have side effects on `feed.send()`. The fix needed to be at the `getDeviceState` layer.

### Evidence
- `feed.send()` at Controller.ts line 973–974: explicitly converts `undefined` → `''`, confirming `undefined` is `getValue`'s intentional "no value" signal
- `SequentMegaBAS.getDeviceState()` try/catch at line 1204 correctly converts thrown errors to rejected Promises

### Resolution
Applied PR #120's delegation with a post-check: after `await super.getDeviceState(bind)`, if result is `undefined`, reject with `Unrecognized binding parameter: <param>`. Outcomes:
- Valid IO channel (`in0_10.8`) → resolved ✅
- Valid feed prop (`relayVal1`, `relayObj1`, after ISSUE-001 fix) → resolved ✅
- Garbage (`foo`) → rejected with clear error ✅

Supersedes PR #120 — the same fix is now in master with the stronger contract.

### Regression Test
- **Check:** Valid IO channel binding on MEGA-BAS resolves; garbage param rejects with informative error
- **Command:** Call getDeviceState with `in0_10.8` (expect value) and `foo` (expect rejection) on MEGA-BAS
- **Expected:** `in0_10.8` returns channel value; `foo` rejects with `Unrecognized binding parameter: foo`

### Notes
- ISSUE-001's fix was a prerequisite: without it, `relayVal1` would still fail even after this fix
- The PR #120 author's prefix-guard alternative was rejected as fragile (would duplicate getValue's dispatch)

## ISSUE-002: SequentMegaBAS.setDeviceState() unconditional parseInt rejects 0-10V output bindings

| Field | Details |
|---|---|
| **ID** | ISSUE-002 |
| **Title** | SequentMegaBAS.setDeviceState() unconditional parseInt rejects 0-10V output bindings |
| **Date Reported** | 2026-08-09 |
| **Date Resolved** | 2026-08-11 |
| **Status** | Resolved |
| **Severity** | High |
| **Component** | i2c-bus/SequentIO.ts — SequentMegaBAS.setDeviceState() |
| **Environment** | All MEGA-BAS boards with 0-10V output bindings |

### Symptoms
- Any attempt to write a value to a MEGA-BAS 0-10V output via a feed binding (e.g., `out0_101`) is rejected immediately
- Error: `setDeviceState: Invalid triac Id out0_101`
- 0-10V outputs on MEGA-BAS cannot be set via device bindings

### Root Cause
`SequentMegaBAS.setDeviceState()` called `parseInt(bind.params[0], 10)` unconditionally and immediately rejected any NaN result with "Invalid triac Id". Feed bindings for 0-10V outputs use params like `"out0_101"` which parse to NaN, so they were always rejected before reaching `set0_10Output`. The base class `SequentIO` has no `setDeviceState`, so a simple base-class delegation (as used for `getDeviceState` in PR #120) was not possible — a real dispatch branch was required.

### Evidence
- `i2c-bus/SequentIO.ts:1125–1126` (pre-fix): `setDeviceState` did `parseInt` unconditionally with no `out0_10` path
- `SequentMegaBAS.set0_10Output` (line ~1049): already correctly handled the I2C write; was just never reached
- Feed names in `devices/SequentIO.json`: `out0_101`…`out0_104` confirm non-numeric params
- Reported by `johnny2678` in PR #120 body and comment, 2026-08-09

### Resolution
Added an `out0_10` dispatch branch to `SequentMegaBAS.setDeviceState()` (`i2c-bus/SequentIO.ts`). When `parseInt` yields NaN, the new code checks if the param starts with `"out0_10"`, extracts the channel ordinal from the last character, validates range (1–4), checks `io.enabled`, coerces `data` to a numeric voltage value, then calls `this.set0_10Output(ord, val)` and returns the IO channel object. All other non-numeric params fall through to the original "Invalid triac Id" rejection.

### Regression Test
- **Check:** Writing to a MEGA-BAS 0-10V output via a feed binding (`out0_101`…`out0_104`) routes to `set0_10Output` without error
- **Command:** Trigger a device state set on a MEGA-BAS board using an `out0_101` binding with a numeric value (e.g., 5.0); verify no "Invalid triac Id" error in logs
- **Expected:** `set0_10Output` is called with the correct channel id and voltage value; log shows no error

### Notes
- The base-class `SequentIO.setValue()` uses the same last-character ordinal extraction pattern (`p[p.length - 1]`); fix mirrors that convention
- Reported by `johnny2678` at: https://github.com/rstrouse/relayEquipmentManager/pull/120

