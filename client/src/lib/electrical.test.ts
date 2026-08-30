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
  validateInverter
} from './electrical'
import type { StringInfo } from './topology'
import type { Inverter, Panel, PlacedPanel } from '../types'

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

const placedPanel = (id: string, panelId: number): PlacedPanel => ({
  id,
  panelId,
  x: 0,
  y: 0,
  width: 40,
  height: 40
})

const group = (runs: string[][]): StringInfo => ({
  panelIds: runs.flat(),
  seriesStrings: runs,
  seriesCount: Math.max(...runs.map((r) => r.length)),
  parallelCount: runs.length,
  totalPanels: runs.flat().length
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
    const placed = [placedPanel('a', 1), placedPanel('b', 2)]
    const map = panelMap(placed, catalog)
    expect(map.get('a')).toBe(catalog[0])
    expect(map.get('b')).toBe(catalog[1])
  })

  it('skips placed panels with no catalog match', () => {
    const map = panelMap([placedPanel('a', 99)], [makePanel(1)])
    expect(map.has('a')).toBe(false)
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
    const placed = [placedPanel('a', 1), placedPanel('b', 1)]
    const est = estimateProduction(placed, catalog, 5, 25)
    expect(est.cellTempC).toBe(55)
    expect(est.derating).toBeCloseTo(0.91)
    expect(est.deratedW).toBeCloseTo(728)
    expect(est.dailyKwh).toBeCloseTo(3.64)
    expect(est.monthlyKwh).toBeCloseTo(3.64 * 30.44)
    expect(est.annualKwh).toBeCloseTo(3.64 * 365)
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

describe('validateInverter', () => {
  const singlePanelMap = () => new Map<string, Panel>([['a', makePanel(1)]])

  it('passes a well-matched string', () => {
    const v = validateInverter(inverter(), [group([['a']])], singlePanelMap())
    expect(v.status).toBe('ok')
    expect(v.checks.every((c) => c.status === 'ok')).toBe(true)
  })

  it('fails when cold Voc exceeds the MPPT max', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      ['b', makePanel(2)],
      ['c', makePanel(3)]
    ])
    const v = validateInverter(inverter(), [group([['a', 'b', 'c']])], panels)
    expect(v.status).toBe('fail')
    const vocCheck = v.checks.find((c) => c.label.startsWith('Voc'))
    expect(vocCheck?.status).toBe('fail')
  })

  it('warns when power is within 10% of the rating', () => {
    const panels = new Map<string, Panel>([['a', makePanel(1, { vmp: 200, voc: 80, imp: 7 })]])
    const v = validateInverter(inverter(), [group([['a']])], panels)
    expect(v.status).toBe('warn')
    const powerCheck = v.checks.find((c) => c.label === 'Power')
    expect(powerCheck?.status).toBe('warn')
  })

  it('fails when the group count exceeds PV inputs', () => {
    const panels = new Map<string, Panel>([
      ['a', makePanel(1)],
      ['b', makePanel(2)],
      ['c', makePanel(3)]
    ])
    const v = validateInverter(
      inverter(),
      [group([['a']]), group([['b']]), group([['c']])],
      panels
    )
    expect(v.status).toBe('fail')
    expect(v.checks.find((c) => c.label === 'PV inputs')?.status).toBe('fail')
  })

  it('passes with no groups', () => {
    expect(validateInverter(inverter(), [], new Map())).toEqual({ status: 'ok', checks: [] })
  })
})
