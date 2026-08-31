import { describe, expect, it } from 'vitest'
import {
  DEVICE_SIZES,
  SCALE,
  combinerWidth,
  deviceSize,
  getTerminalPosition,
  getTerminals,
  internalBonds,
  terminalCapacity,
  terminalPolarity
} from './terminals'
import type { Inverter, PlacedDevice } from '../types'

const device = (over: Partial<PlacedDevice> & { id: string }): PlacedDevice => ({
  kind: 'panel',
  refId: null,
  x: 100,
  y: 50,
  width: 40,
  height: 30,
  ...over
})

const inverter = (max_pv_inputs = 2): Inverter => ({
  id: 1,
  manufacturer: 'M',
  model: 'I',
  mppt_min_v: 20,
  mppt_max_v: 100,
  max_input_a: 25,
  max_power_w: 1500,
  max_pv_inputs,
  price: 600
})

describe('deviceSize', () => {
  it('uses catalog dimensions for panels (scaled) and defaults for equipment', () => {
    const panel = device({ id: 'p1', kind: 'panel', width: 40 * SCALE, height: 30 * SCALE })
    expect(deviceSize('panel', panel)).toEqual({ width: 40 * SCALE, height: 30 * SCALE })
    const inv = device({ id: 'inv1', kind: 'inverter' })
    expect(deviceSize('inverter', inv)).toEqual(DEVICE_SIZES.inverter)
  })

  it('sizes combiners from their input count', () => {
    expect(combinerWidth(4)).toBe(150)
    expect(combinerWidth(1)).toBe(60)
    const cb = device({ id: 'cb', kind: 'combiner', combinerInputs: 6 })
    expect(deviceSize('combiner', cb)).toEqual({ width: 210, height: DEVICE_SIZES.combiner.height })
  })
})

describe('getTerminals', () => {
  it('gives panels a positive and negative terminal', () => {
    const t = getTerminals(device({ id: 'p1' }), null)
    expect(t.map((x) => x.id)).toEqual(['+', '-'])
    expect(t[0].polarity).toBe('pos')
    expect(t[1].polarity).toBe('neg')
  })

  it('gives inverters one PV pair per MPPT plus battery and AC terminals', () => {
    const t = getTerminals(device({ id: 'inv1', kind: 'inverter' }), inverter(3))
    const ids = t.map((x) => x.id)
    expect(ids).toEqual(['pv0+', 'pv0-', 'pv1+', 'pv1-', 'pv2+', 'pv2-', 'bat+', 'bat-', 'ac'])
    expect(t.find((x) => x.id === 'ac')?.polarity).toBe('ac')
    expect(t.find((x) => x.id === 'bat+')?.polarity).toBe('pos')
  })

  it('gives breakers polarity-agnostic terminals and busbars two rails', () => {
    expect(getTerminals(device({ id: 'brk', kind: 'breaker' }), null).map((x) => x.polarity)).toEqual([
      'any',
      'any'
    ])
    const bus = getTerminals(device({ id: 'bus', kind: 'busbar' }), null)
    expect(bus.map((x) => x.id)).toEqual(['bus+', 'bus-'])
  })

  it('gives combiners one input pair per slot plus an output pair', () => {
    const t = getTerminals(device({ id: 'cb', kind: 'combiner', combinerInputs: 2 }), null)
    expect(t.map((x) => x.id)).toEqual(['in0+', 'in0-', 'in1+', 'in1-', 'out+', 'out-'])
  })
})

describe('getTerminalPosition', () => {
  it('returns absolute canvas coordinates', () => {
    const p = device({ id: 'p1', x: 100, y: 50, width: 40, height: 30 })
    const pos = getTerminalPosition(p, '+', null)
    expect(pos).not.toBeNull()
    expect(pos!.x).toBeGreaterThan(100)
    expect(pos!.y).toBe(50 + 30 + 10)
  })

  it('returns null for unknown terminals', () => {
    expect(getTerminalPosition(device({ id: 'p1' }), 'nope', null)).toBeNull()
  })
})

describe('terminalPolarity', () => {
  it('derives polarity from the terminal id', () => {
    expect(terminalPolarity(device({ id: 'p1' }), '+')).toBe('pos')
    expect(terminalPolarity(device({ id: 'p1' }), '-')).toBe('neg')
    expect(terminalPolarity(device({ id: 'inv1', kind: 'inverter' }), 'ac')).toBe('ac')
    expect(terminalPolarity(device({ id: 'brk', kind: 'breaker' }), 'in')).toBe('any')
  })
})

describe('terminalCapacity', () => {
  it('is one everywhere except busbar rails', () => {
    expect(terminalCapacity(device({ id: 'p1' }), '+')).toBe(1)
    expect(terminalCapacity(device({ id: 'bus', kind: 'busbar' }), 'bus+')).toBe(Infinity)
  })
})

describe('internalBonds', () => {
  it('bonds breaker in to out and each combiner slot to its output pair', () => {
    expect(internalBonds(device({ id: 'brk', kind: 'breaker' }))).toEqual([['in', 'out']])
    const bonds = internalBonds(device({ id: 'cb', kind: 'combiner', combinerInputs: 2 }))
    expect(bonds).toEqual([
      ['in0+', 'out+'],
      ['in0-', 'out-'],
      ['in1+', 'out+'],
      ['in1-', 'out-']
    ])
  })

  it('has no bonds for panels, batteries, inverters or busbars', () => {
    expect(internalBonds(device({ id: 'p1' }))).toEqual([])
    expect(internalBonds(device({ id: 'bat', kind: 'battery' }))).toEqual([])
    expect(internalBonds(device({ id: 'inv', kind: 'inverter' }))).toEqual([])
    expect(internalBonds(device({ id: 'bus', kind: 'busbar' }))).toEqual([])
  })
})
