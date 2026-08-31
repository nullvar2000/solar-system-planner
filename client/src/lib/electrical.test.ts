import { describe, expect, it } from 'vitest'
import {
  calculateWireGauge,
  cellTemp,
  computeArrayElectricals,
  computeGroupElectricals,
  computeStringElectricals,
  deratingFactor,
  estimateProduction,
  panelMap,
  validatePlacedInverter
} from './electrical'
import type { GroupInfo } from './topology'
import type { Inverter, Panel, PlacedDevice } from '../types'

const makePanel = (id: number, over: Partial<Panel> = {}): Panel => ({
  id,
  manufacturer: 'M',
  model: `P${id}`,
  vmp: 37,
  imp: 5.4,
  voc: 44,
  isc: 5.8,
  pmax: 200,
  temp_coeff_v: -0.003,
  temp_coeff_i: 0.003,
  width: 40,
  height: 40,
  price: 200,
  ...over
})

const panelDevice = (id: string, refId: number): PlacedDevice => ({
  id,
  kind: 'panel',
  refId,
  x: 0,
  y: 0,
  width: 40,
  height: 40
})

const group = (runs: string[][], destination: GroupInfo['destination'] = null): GroupInfo => ({
  panelIds: runs.flat(),
  seriesStrings: runs,
  seriesCount: Math.max(...runs.map((r) => r.length)),
  parallelCount: runs.length,
  totalPanels: runs.flat().length,
  destination,
  ends: null
})

const inverter = (over: Partial<Inverter> = {}): Inverter => ({
  id: 1,
  manufacturer: 'M',
  model: 'I-1500',
  mppt_min_v: 20,
  mppt_max_v: 100,
  max_input_a: 25,
  max_power_w: 1500,
  max_pv_inputs: 2,
  price: 600,
  ...over
})

describe('panelMap', () => {
  it('maps placed panels to their catalog panel', () => {
    const catalog = [makePanel(1), makePanel(2)]
    const placed = [panelDevice('a', 1), panelDevice('b', 2)]
    const map = panelMap(placed, catalog)
    expect(map.get('a')).toBe(catalog[0])
    expect(map.get('b')).toBe(catalog[1])
  })

  it('skips non-panel devices and unmatched panels', () => {
    const inverterDevice: PlacedDevice = {
      id: 'inv-1',
      kind: 'inverter',
      refId: 1,
      x: 0,
      y: 0,
      width: 140,
      height: 100
    }
    const map = panelMap([panelDevice('a', 99), inverterDevice], [makePanel(1)])
    expect(map.has('a')).toBe(false)
    expect(map.has('inv-1')).toBe(false)
  })
})

describe('computeStringElectricals', () => {
  it('sums voltage and Voc, takes the lowest current', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      ['b', makePanel(2, { imp: 8.1 })]
    ])
    const e = computeStringElectricals(['a', 'b'], panels)
    expect(e.v).toBeCloseTo(74)
    expect(e.a).toBeCloseTo(5.4)
    expect(e.voc).toBeCloseTo(88)
    // Voc at -10C: factor 1 + (-0.003) * (-35) = 1.105
    expect(e.vocCold).toBeCloseTo(88 * 1.105)
    expect(e.w).toBeCloseTo(74 * 5.4)
  })

  it('returns zeros for an empty string', () => {
    expect(computeStringElectricals([], new Map())).toEqual({
      v: 0,
      a: 0,
      w: 0,
      voc: 0,
      vocCold: 0
    })
  })
})

describe('computeGroupElectricals', () => {
  it('takes the max voltage and sums current and power across parallel strings', () => {
    const panels = new Map<string, Panel>([['a', makePanel(1)], ['b', makePanel(2)]])
    const e = computeGroupElectricals(group([['a'], ['b']]), panels)
    expect(e.v).toBeCloseTo(37)
    expect(e.a).toBeCloseTo(10.8)
    expect(e.w).toBeCloseTo(399.6)
    expect(e.voc).toBeCloseTo(44)
    expect(e.vocCold).toBeCloseTo(44 * 1.105)
  })
})

describe('computeArrayElectricals', () => {
  it('combines groups: max voltage, summed current and power', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      ['b', makePanel(2)],
      ['c', makePanel(3, { vmp: 41, voc: 49, imp: 9.75 })]
    ])
    const e = computeArrayElectricals([group([['a'], ['b']]), group([['c']])], panels)
    expect(e.v).toBeCloseTo(41)
    expect(e.a).toBeCloseTo(5.4 + 5.4 + 9.75)
    expect(e.w).toBeCloseTo(399.6 + 41 * 9.75)
    expect(e.voc).toBeCloseTo(49)
  })

  it('returns zeros for no groups', () => {
    expect(computeArrayElectricals([], new Map())).toEqual({
      v: 0,
      a: 0,
      w: 0,
      voc: 0,
      vocCold: 0
    })
  })
})

describe('temperature derating', () => {
  it('offsets ambient by the cell temperature delta', () => {
    expect(cellTemp(25)).toBe(55)
  })

  it('applies the voltage temperature coefficient', () => {
    expect(deratingFactor(-0.003, 55)).toBeCloseTo(0.91)
  })
})

describe('estimateProduction', () => {
  it('estimates daily, monthly and annual energy with derating', () => {
    const catalog = [makePanel(1, { pmax: 400 })]
    const placed = [panelDevice('a', 1), panelDevice('b', 1)]
    const est = estimateProduction(placed, catalog, 5, 25)
    expect(est.cellTempC).toBe(55)
    expect(est.derating).toBeCloseTo(0.91)
    expect(est.deratedW).toBeCloseTo(728)
    expect(est.dailyKwh).toBeCloseTo(3.64)
    expect(est.monthlyKwh).toBeCloseTo(3.64 * 30.44)
    expect(est.annualKwh).toBeCloseTo(3.64 * 365)
  })

  it('ignores non-panel devices', () => {
    const catalog = [makePanel(1, { pmax: 400 })]
    const battery: PlacedDevice = {
      id: 'bat-1',
      kind: 'battery',
      refId: 1,
      x: 0,
      y: 0,
      width: 110,
      height: 80,
      batterySeries: 1,
      batteryParallel: 1
    }
    const est = estimateProduction([panelDevice('a', 1), battery], catalog, 5, 25)
    expect(est.deratedW).toBeCloseTo(364)
  })

  it('returns zeros with no panels', () => {
    const est = estimateProduction([], [makePanel(1)], 5, 25)
    expect(est.derating).toBe(0)
    expect(est.dailyKwh).toBe(0)
  })
})

describe('calculateWireGauge', () => {
  it('picks the thinnest gauge within the voltage drop budget', () => {
    const r = calculateWireGauge(5, 50, 48)
    expect(r.gauge).toBe('14 AWG')
    expect(r.dropPct).toBeCloseTo(2.625)
  })

  it('steps down to larger wire as current and distance grow', () => {
    expect(calculateWireGauge(20, 100, 48).gauge).toBe('2/0 AWG')
  })

  it('returns null when no gauge meets the budget', () => {
    const r = calculateWireGauge(1000, 1000, 12)
    expect(r.gauge).toBeNull()
    expect(r.dropPct).toBeGreaterThan(3)
  })
})

describe('validatePlacedInverter', () => {
  const singlePanelMap = () => new Map<string, Panel>([['a', makePanel(1)]])

  it('passes a well-matched string', () => {
    const v = validatePlacedInverter(inverter(), new Map([[0, group([['a']])]]), singlePanelMap())
    expect(v.status).toBe('ok')
    expect(v.checks.find((c) => c.label === 'MPPT 1')?.status).toBe('ok')
    expect(v.checks.find((c) => c.label === 'PV inputs')?.detail).toBe('1 / 2 in use')
  })

  it('validates each input against its own group', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      // 23A > 0.9 * 25A trips the current warn band
      ['b', makePanel(2, { vmp: 10, voc: 12, imp: 23 })]
    ])
    const v = validatePlacedInverter(
      inverter({ mppt_min_v: 5 }),
      new Map<number, GroupInfo>([
        [0, group([['a']])],
        [1, group([['b']])]
      ]),
      panels
    )
    expect(v.checks.find((c) => c.label === 'MPPT 1')?.status).toBe('ok')
    expect(v.checks.find((c) => c.label === 'MPPT 2')?.status).toBe('warn')
    expect(v.status).toBe('warn')
  })

  it('fails when cold Voc exceeds the MPPT max', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      ['b', makePanel(2)],
      ['c', makePanel(3)]
    ])
    const v = validatePlacedInverter(
      inverter(),
      new Map([[0, group([['a', 'b', 'c']])]]),
      panels
    )
    expect(v.status).toBe('fail')
    expect(v.checks.find((c) => c.label === 'MPPT 1')?.status).toBe('fail')
  })

  it('warns when power is within 10% of the rating', () => {
    const panels = new Map<string, Panel>([['a', makePanel(1, { vmp: 200, voc: 80, imp: 7 })]])
    const v = validatePlacedInverter(inverter(), new Map([[0, group([['a']])]]), panels)
    expect(v.status).toBe('warn')
    expect(v.checks.find((c) => c.label === 'Power')?.status).toBe('warn')
  })

  it('passes with no groups', () => {
    const v = validatePlacedInverter(inverter(), new Map(), new Map())
    expect(v.status).toBe('ok')
    expect(v.checks.find((c) => c.label === 'PV inputs')?.detail).toBe('0 / 2 in use')
  })
})
