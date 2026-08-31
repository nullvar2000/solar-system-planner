import { Inverter, Panel, PlacedDevice } from '../types'
import { GroupInfo } from './topology'

export const STC_TEMP_C = 25
export const COLD_TEMP_C = -10

export interface Electricals {
  v: number
  a: number
  w: number
  voc: number
  vocCold: number
}

export function panelMap(devices: PlacedDevice[], catalog: Panel[]): Map<string, Panel> {
  const byId = new Map(catalog.map((p) => [p.id, p]))
  const map = new Map<string, Panel>()
  for (const placed of devices) {
    if (placed.kind !== 'panel' || placed.refId === null) continue
    const p = byId.get(placed.refId)
    if (p) map.set(placed.id, p)
  }
  return map
}

export function computeStringElectricals(
  placedIds: string[],
  panels: Map<string, Panel>
): Electricals {
  let v = 0
  let a = Infinity
  let voc = 0
  let vocCold = 0
  const coldFactor = (p: Panel) => 1 + p.temp_coeff_v * (COLD_TEMP_C - STC_TEMP_C)
  for (const id of placedIds) {
    const p = panels.get(id)
    if (!p) continue
    v += p.vmp
    a = Math.min(a, p.imp)
    voc += p.voc
    vocCold += p.voc * coldFactor(p)
  }
  if (!Number.isFinite(a)) a = 0
  return { v, a, w: v * a, voc, vocCold }
}

export function computeGroupElectricals(
  group: GroupInfo,
  panels: Map<string, Panel>
): Electricals {
  const strings = group.seriesStrings.map((run) => computeStringElectricals(run, panels))
  const max = (pick: (s: Electricals) => number) =>
    strings.length ? Math.max(...strings.map(pick)) : 0
  const v = max((s) => s.v)
  const voc = max((s) => s.voc)
  const vocCold = max((s) => s.vocCold)
  const a = strings.reduce((sum, s) => sum + s.a, 0)
  const w = strings.reduce((sum, s) => sum + s.w, 0)
  return { v, a, w, voc, vocCold }
}

export function computeArrayElectricals(
  groups: GroupInfo[],
  panels: Map<string, Panel>
): Electricals {
  if (groups.length === 0) return { v: 0, a: 0, w: 0, voc: 0, vocCold: 0 }
  const electricals = groups.map((g) => computeGroupElectricals(g, panels))
  const max = (pick: (s: Electricals) => number) => Math.max(...electricals.map(pick))
  const v = max((s) => s.v)
  const voc = max((s) => s.voc)
  const vocCold = max((s) => s.vocCold)
  const a = electricals.reduce((sum, s) => sum + s.a, 0)
  const w = electricals.reduce((sum, s) => sum + s.w, 0)
  return { v, a, w, voc, vocCold }
}

export type CheckStatus = 'ok' | 'warn' | 'fail'

export interface MpptCheck {
  label: string
  status: CheckStatus
  detail: string
}

export interface InverterValidation {
  status: CheckStatus
  checks: MpptCheck[]
}

const WARN_MARGIN = 0.9

function upperLimitCheck(label: string, value: number, limit: number, unit: string): MpptCheck {
  const status: CheckStatus = value > limit ? 'fail' : value > WARN_MARGIN * limit ? 'warn' : 'ok'
  return { label, status, detail: `${value.toFixed(1)}${unit} / max ${limit}${unit}` }
}

function lowerLimitCheck(label: string, value: number, limit: number, unit: string): MpptCheck {
  const status: CheckStatus = value < limit ? 'fail' : value < limit / WARN_MARGIN ? 'warn' : 'ok'
  return { label, status, detail: `${value.toFixed(1)}${unit} / min ${limit}${unit}` }
}

// Copper DC resistance at 20°C, ohms per 1000 ft, thinnest to thickest.
export const WIRE_GAUGES: { label: string; ohmPer1000ft: number }[] = [
  { label: '14 AWG', ohmPer1000ft: 2.52 },
  { label: '12 AWG', ohmPer1000ft: 1.98 },
  { label: '10 AWG', ohmPer1000ft: 1.538 },
  { label: '8 AWG', ohmPer1000ft: 1.212 },
  { label: '6 AWG', ohmPer1000ft: 0.961 },
  { label: '4 AWG', ohmPer1000ft: 0.765 },
  { label: '2 AWG', ohmPer1000ft: 0.606 },
  { label: '1 AWG', ohmPer1000ft: 0.483 },
  { label: '0 AWG', ohmPer1000ft: 0.386 },
  { label: '2/0 AWG', ohmPer1000ft: 0.307 },
  { label: '3/0 AWG', ohmPer1000ft: 0.243 },
  { label: '4/0 AWG', ohmPer1000ft: 0.193 },
  { label: '250 kcmil', ohmPer1000ft: 0.155 },
  { label: '350 kcmil', ohmPer1000ft: 0.11 },
  { label: '500 kcmil', ohmPer1000ft: 0.078 }
]

export interface WireGaugeResult {
  gauge: string | null
  dropV: number
  dropPct: number
}

export function calculateWireGauge(
  currentA: number,
  oneWayFt: number,
  voltageV: number,
  maxDropPct = 3
): WireGaugeResult {
  let last: WireGaugeResult = { gauge: null, dropV: 0, dropPct: 0 }
  for (const g of WIRE_GAUGES) {
    const dropV = 2 * oneWayFt * (g.ohmPer1000ft / 1000) * currentA
    const dropPct = voltageV > 0 ? (dropV / voltageV) * 100 : Infinity
    last = { gauge: g.label, dropV, dropPct }
    if (dropPct <= maxDropPct) return last
  }
  return { gauge: null, dropV: last.dropV, dropPct: last.dropPct }
}

export const CELL_TEMP_DELTA_C = 30

export function cellTemp(ambientC: number): number {
  return ambientC + CELL_TEMP_DELTA_C
}

export function deratingFactor(tempCoeffV: number, cellTempC: number): number {
  return 1 + tempCoeffV * (cellTempC - STC_TEMP_C)
}

export interface ProductionEstimate {
  cellTempC: number
  derating: number
  deratedW: number
  dailyKwh: number
  monthlyKwh: number
  annualKwh: number
}

export function estimateProduction(
  devices: PlacedDevice[],
  catalog: Panel[],
  peakSunHours: number,
  ambientC: number
): ProductionEstimate {
  const tCell = cellTemp(ambientC)
  const byId = new Map(catalog.map((p) => [p.id, p]))
  let pmax = 0
  let weighted = 0
  for (const placed of devices) {
    if (placed.kind !== 'panel' || placed.refId === null) continue
    const p = byId.get(placed.refId)
    if (!p) continue
    pmax += p.pmax
    weighted += p.pmax * deratingFactor(p.temp_coeff_v, tCell)
  }
  const derating = pmax > 0 ? weighted / pmax : 0
  const deratedW = pmax * derating
  const dailyKwh = (deratedW * peakSunHours) / 1000
  return {
    cellTempC: tCell,
    derating,
    deratedW,
    dailyKwh,
    monthlyKwh: dailyKwh * 30.44,
    annualKwh: dailyKwh * 365
  }
}

export function validatePlacedInverter(
  inverter: Inverter,
  groupsByInput: Map<number, GroupInfo>,
  panels: Map<string, Panel>
): InverterValidation {
  const n = inverter.max_pv_inputs
  const checks: MpptCheck[] = []
  let totalW = 0

  for (let i = 0; i < n; i++) {
    const group = groupsByInput.get(i)
    if (!group) continue
    const e = computeGroupElectricals(group, panels)
    totalW += e.w
    const voc = upperLimitCheck(`Voc (cold ${COLD_TEMP_C}°C)`, e.vocCold, inverter.mppt_max_v, 'V')
    const vmp = lowerLimitCheck('Vmp', e.v, inverter.mppt_min_v, 'V')
    const amp = upperLimitCheck('Current', e.a, inverter.max_input_a, 'A')
    const statuses = [voc.status, vmp.status, amp.status]
    const inputStatus: CheckStatus = statuses.includes('fail')
      ? 'fail'
      : statuses.includes('warn')
        ? 'warn'
        : 'ok'
    checks.push({
      label: `MPPT ${i + 1}`,
      status: inputStatus,
      detail: `Voc ${e.vocCold.toFixed(1)}V · Vmp ${e.v.toFixed(1)}V · ${e.a.toFixed(1)}A`
    })
  }

  checks.push(upperLimitCheck('Power', totalW, inverter.max_power_w, 'W'))
  checks.push({
    label: 'PV inputs',
    status: 'ok',
    detail: `${groupsByInput.size} / ${n} in use`
  })

  const status: CheckStatus = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'ok'

  return { status, checks }
}
