import { describe, expect, it } from 'vitest'
import { bankElectricals, dodFor } from './battery'
import type { Battery } from '../types'

const makeBattery = (chemistry: string, over: Partial<Battery> = {}): Battery => ({
  id: 1,
  manufacturer: 'M',
  model: 'B-100',
  chemistry,
  nominal_v: 12.8,
  capacity_ah: 100,
  price: 800,
  ...over
})

describe('dodFor', () => {
  it('uses the chemistry depth of discharge', () => {
    expect(dodFor(makeBattery('LiFePO4'))).toBe(0.8)
    expect(dodFor(makeBattery('NMC'))).toBe(0.8)
    expect(dodFor(makeBattery('AGM'))).toBe(0.5)
    expect(dodFor(makeBattery('Gel'))).toBe(0.5)
  })

  it('falls back to 0.5 for unknown chemistries', () => {
    expect(dodFor(makeBattery('Sodium-ion'))).toBe(0.5)
  })
})

describe('bankElectricals', () => {
  it('computes a 2S3P LiFePO4 bank', () => {
    const e = bankElectricals(makeBattery('LiFePO4'), 2, 3)
    expect(e.cellCount).toBe(6)
    expect(e.totalV).toBeCloseTo(25.6)
    expect(e.totalAh).toBeCloseTo(300)
    expect(e.totalWh).toBeCloseTo(7680)
    expect(e.usableWh).toBeCloseTo(6144)
  })

  it('computes a single AGM cell at 50% DoD', () => {
    const e = bankElectricals(makeBattery('AGM', { nominal_v: 12, capacity_ah: 200 }), 1, 1)
    expect(e.totalV).toBeCloseTo(12)
    expect(e.totalWh).toBeCloseTo(2400)
    expect(e.usableWh).toBeCloseTo(1200)
  })
})
