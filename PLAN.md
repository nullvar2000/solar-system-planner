# Solar System Planner — Full Circuit Layout Plan

Phases 1–10 (scaffold → panel catalog → canvas placement → connections → electrical
readout → inverter MPPT → wire gauge/production → battery/loads → BOM + project
save/load → polish) are **complete**. This plan adds full circuit layout on the
canvas: solar panels → inverters → batteries, with multiple inverters/batteries,
busbars, combiner boxes, and breakers.

Update the header phase label in `client/src/components/Layout/AppShell.tsx`
(currently `Complete`) as each phase below lands.

## Scope

- Placeable devices: **panels, inverters, batteries, busbars, combiner boxes, breakers/DC disconnects**
- Inverters expose **one PV+/- pair per MPPT input** (N = `max_pv_inputs`), plus `BAT+`/`BAT−` and an `AC` terminal
- **Zoom/pan + grid snap**
- **Wire gauge auto-suggested from drawn wire length**, with per-wire **manual length override**
- **No migration** of old panel-only projects (treated as legacy)

---

## 1. Core Data Model (`client/src/types/index.ts`, new `client/src/lib/terminals.ts`)

Replace the panel-centric model with a generic device graph:

```ts
export type DeviceKind = 'panel' | 'inverter' | 'battery' | 'busbar' | 'combiner' | 'breaker'

export interface PlacedDevice {
  id: string            // "dev-<n>"
  kind: DeviceKind
  refId: number | null  // catalog FK (panel/inverter/battery); null for busbar/combiner/breaker
  x: number; y: number; width: number; height: number
  batterySeries?: number; batteryParallel?: number   // battery
  combinerInputs?: number                             // combiner (default 4)
}

export interface Connection {
  id: string
  fromDeviceId: string; fromTerminal: string   // terminal IDs: 'pv1+','pv1-','bat+','bat-','ac','bus+','bus-','in1+','out-','in','out'
  toDeviceId: string; toTerminal: string
  lengthFt?: number | null                     // manual length override (see §6)
}
```

### Terminal definitions

Pure function `getTerminals(device): TerminalDef[]` in `terminals.ts`, where
`TerminalDef = { id, label, polarity: 'pos'|'neg'|'ac'|'any', dx, dy }` (positions
relative to the device rect):

- panel: `+`/`−` below bottom edge (as today)
- inverter: `pv1+…pvN−` along top edge, `bat+`/`bat−` bottom center, `ac` right edge
- battery: `+`/`−` top center
- busbar: `bus+` top-center, `bus−` bottom-center — **unlimited wires per terminal** (the only multi-tap terminals)
- combiner: `in1+…inN−` pairs along top, `out+`/`out−` bottom
- breaker: `in` left, `out` right, polarity `'any'`

### Internal bonds

Each device declares direct electrical continuity between its own terminals:

- breaker: `in—out`
- combiner: `in_i+—out+`, `in_i−—out−` (per input, via fuse)
- busbar / panel / battery / inverter: none

This single concept powers string walking, combiner routing, and short detection.

### Connection rules (rewrite `canConnect`)

- Reject same device
- Enforce **polarity match** (`pos`↔`pos`, `neg`↔`neg`, `ac`↔`ac`; `'any'` matches anything)
- Enforce per-terminal capacity (1, or unlimited for busbar rails)
- Wire color from terminal polarity (red/blue/green/gray)

## 2. Store Rewrite (`client/src/store/canvas.ts`)

- `devices: PlacedDevice[]`, `selectedDeviceId`, `activePlacement: { kind, refId } | null` replace `placedPanels`/`selectedPanelId`/`activePanelTypeId`
- Drop `selectedInverterId`/`selectedBatteryId`/`batterySeries`/`batteryParallel` scalars (now per-device)
- Actions: `placeDevice` (snaps to grid), `moveDevice`, `removeDevice` (cascades connections), `selectDevice`, `setActivePlacement`, `updateDevice` (battery S/P, combiner input count), `addConnection` (now validates via `canConnect`)
- Add `pxPerFt` (default 10) for wire gauge
- `restoreState`: **v2 only** — if config lacks `devices` (legacy shape), reject with a "legacy project" notice; bump `dev-`/`conn-`/`load-` counters

## 3. Canvas UX (`SolarCanvas.tsx`, new `DeviceNode.tsx`, new `DevicePalette.tsx`)

- `PanelNode` → `DeviceNode`: renders per kind:
  - panel: blue rect + resize handle (as today)
  - inverter: rect with N PV pairs on top + BAT/AC terminals
  - battery: green rect + S×P badge
  - busbar: wide bar with two rails
  - combiner: box with input slots
  - breaker: small box with switch glyph
  - fixed sizes for non-panel kinds; terminals rendered from `getTerminals` with the existing pending/hover/valid-target highlighting
- Left sidebar: `DevicePalette` replaces `PanelDropdown` — pick kind, then model (for panel/inverter/battery), click canvas to place at snapped position. Catalogs unchanged
- **Zoom/pan**: stage `x/y/scale` in component state; wheel-zoom to cursor, drag empty background to pan; mousePos/preview line in world coordinates (Konva `getPointerPosition()` is already inverse-transformed)
- **Grid**: grid-line layer that pans/zooms with content (20 px cells); placement and drag-end snap to 10 px
- Keyboard: Esc/Delete unchanged, acting on selected device/wire

## 4. Circuit Analysis (rewrite `client/src/lib/topology.ts`)

Graph = terminals as nodes; edges = wires + internal bonds.

- `findStrings(devices, connections)`: keep the existing panel series/parallel walk
  (junction = opposite polarity → series, same → parallel; ring splitting), but
  chains may **pass through breakers and combiners** via bonds, and each string
  resolves to a **destination**: inverter `pvN` input, combiner slot, busbar rail, or open
- Destination resolution follows bonds forward: combiner slot → `out+` → (breakers/busbar) → inverter input; busbar rail merges all tapped strings
- Per-inverter, per-MPPT-input electricals: `computeGroupElectricals` over all strings
  reaching that input (reuses `electrical.ts` unchanged)
- `findShorts`: `bat+` and `bat−` reachable via wires+bonds without crossing an inverter → short warning
- `findCircuitWarnings` (generalizes `findTopologyWarnings`): keep existing three
  (mixed models in series, mismatched parallel Vmp, open panel terminal); add:
  string dead-ending at a dangling breaker/combiner output, combiner output not
  reaching an inverter, inverter PV input unconnected, battery unconnected,
  **battery short**, battery bank voltage vs inverter (§5)

## 5. Right Panel + Validation

- `InverterStatus` → **SystemStatus**: iterate *placed* inverters; per instance show per-MPPT-input checks (cold Voc ≤ max, Vmp ≥ min, A ≤ `max_input_a`, inputs used ≤ N) plus total array W vs `max_power_w`; worst-status rollup
- `BatteryBankPanel`: one row per placed battery (model, S×P, V/Ah/Wh/usable); S/P editing moves to `PropertiesPanel` for the selected battery
- **Optional catalog field** `battery_voltage` on Inverter (nominal DC system voltage, 0 = no storage) enabling "bank 51.2 V vs inverter 48 V ±10%" check. Requires editing `server/src/db.ts` + routes + editor + seed **and a DB reset** (known gotcha)
- `TopologyPanel`: strings listed with destinations ("3S × 2P → INV-1 · MPPT 1", "2S → combiner slot 2")
- `ElectricalReadout`: per inverter per input + system totals
- `PropertiesPanel`: per-kind property views (panel specs as today; inverter spec + input occupancy; battery S/P + bank electricals; combiner input count editor; breaker/busbar = label + delete)

## 6. Wire Gauge from Geometry (`client/src/lib/wireGeometry.ts` + `WireGaugePanel.tsx`)

- `Connection.lengthFt` — optional manual override (see §1), persisted in `ProjectConfig` v2
- `effectiveLengthFt(connection, devices, pxPerFt)` = `connection.lengthFt ?? bezierLengthFt(...)`; the gauge suggestion always uses the effective length
- `bezierLengthFt`: sum the 25-point Bézier segments in world px ÷ `pxPerFt` (same sampling `ConnectionLine` uses)
- `wireContext(...)`: resolve the voltage/current a wire carries — PV-side wire → its string's Vmp/A (walking to the destination group); battery lead → bank voltage (current: n/a); else null
- `WireGaugePanel` (selected wire): shows the auto length in ft, plus an input field
  (empty = "auto"); typing a value sets the override, clearing it (or a small "auto"
  button) removes it. The suggested gauge recalculates live from whichever length is
  in effect; a badge shows `auto` vs `manual`. Suggested gauge via existing
  `calculateWireGauge` (3% drop)
- Manual calculator (arbitrary A/ft/V) remains below as a standalone tool

## 7. BOM + Persistence

- `computeBom(devices, catalogs)`: panel counts per model (as today), inverters per model, batteries per model × S×P per instance, plus combiners, breakers, busbars. Busbar/combiner/breaker have no catalog — use **fixed default prices in code** (busbar $75, breaker $40, combiner $120)
- `ProjectConfig` v2: `{ version: 2, devices, connections, loads, pxPerFt }`; `ProjectBar` assembles/exports it; `restoreState` guards legacy
- **No server changes** (config is opaque JSON), except the optional `battery_voltage` above

## 8. Phases (one branch each, per WORKFLOW.md)

1. `feat/device-model` — types/terminals/bonds, store rewrite, `DeviceNode` for all 6 kinds, `DevicePalette`, generic wiring rules (polarity + busbar multi-tap), zoom/pan/grid/snap, `ProjectConfig` v2 + legacy guard, `PropertiesPanel` per-kind, BOM v2
2. `feat/circuit-analysis` — topology rewrite (string destinations, combiner routing, busbar merge, shorts), SystemStatus/BatteryBankPanel/TopologyPanel/ElectricalReadout updates, optional `battery_voltage` schema
3. `feat/wire-gauge-geometry` — `wireGeometry`, px/ft scale, per-wire length override, WireGaugePanel
4. `feat/polish-circuits` — empty states, print BOM/JSON export v2, header label, AGENTS.md wiring-model note, full `pnpm build && pnpm test`

## 9. Tests (vitest, pure logic, same pattern as existing)

- `topology.test.ts` rewritten: keep 2S×2P ring cases; add breaker in chain, combiner slot routing to inverter input, busbar merging two strings, polarity rejection, short detection (direct bat+→bat−, same-rail, and the non-short case through an inverter)
- `electrical.test.ts`: per-input validation cases
- `bom.test.ts`: multi-inverter, battery × S×P, fixed-price accessories
- New `wireGeometry.test.ts`: Bézier length, px→ft conversion, override taking precedence, null override falling back to auto
- Server: `battery_voltage` CRUD test if that field lands

## Open Items (defaults in effect — object before starting)

- Busbar/combiner/breaker **fixed code prices** in BOM
- **`battery_voltage` inverter field** (DB reset required)
- Inverter `AC` terminal is decorative for now (no AC loads on canvas per scope) — kept for the future
- Busbar = one device with two rails (`bus+`/`bus−`), each rail one multi-tap point
