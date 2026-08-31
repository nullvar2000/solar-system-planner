import { describe, expect, it } from 'vitest'
import { computeBom } from './bom'
import type { Battery, Inverter, Panel, PlacedDevice } from '../types'

const panel = (id: number, model: string, price: number): Panel => ({
  id,
  manufacturer: 'SunTech',
  model,
  vmp: 37,
  imp: 5.4,
  voc: 44,
  isc: 5.8,
  pmax: 200,
  temp_coeff_v: -0.003,
  temp_coeff_i: 0.003,
  width: 40,
  height: 40,
  price
})

const inverter: Inverter = {
  id: 1,
  manufacturer: 'PowMax',
  model: 'PM-1500',
  mppt_min_v: 20,
  mppt_max_v: 100,
  max_input_a: 25,
  max_power_w: 1500,
  max_pv_inputs: 2,
  price: 600
}

const battery: Battery = {
  id: 1,
  manufacturer: 'VoltCore',
  model: 'VC-100',
  chemistry: 'LiFePO4',
  nominal_v: 12.8,
  capacity_ah: 100,
  price: 800
}

const placedPanel = (id: string, refId: number): PlacedDevice => ({
  id,
  kind: 'panel',
  refId,
  x: 0,
  y: 0,
  width: 40,
  height: 40
})

const placedInverter = (id: string, refId: number): PlacedDevice => ({
  id,
  kind: 'inverter',
  refId,
  x: 0,
  y: 0,
  width: 140,
  height: 100
})

const placedBattery = (
  id: string,
  refId: number,
  series = 1,
  parallel = 1
): PlacedDevice => ({
  id,
  kind: 'battery',
  refId,
  x: 0,
  y: 0,
  width: 110,
  height: 80,
  batterySeries: series,
  batteryParallel: parallel
})

const placedCombiner = (id: string): PlacedDevice => ({
  id,
  kind: 'combiner',
  refId: null,
  x: 0,
  y: 0,
  width: 150,
  height: 90,
  combinerInputs: 4
})

const placedBreaker = (id: string): PlacedDevice => ({
  id,
  kind: 'breaker',
  refId: null,
  x: 0,
  y: 0,
  width: 48,
  height: 64
})

const placedBusbar = (id: string): PlacedDevice => ({
  id,
  kind: 'busbar',
  refId: null,
  x: 0,
  y: 0,
  width: 220,
  height: 48
})

describe('computeBom', () => {
  it('counts placed panels per model and prices the full system', () => {
    const { rows, total } = computeBom(
      [
        placedPanel('a', 1),
        placedPanel('b', 1),
        placedPanel('c', 2),
        placedInverter('inv', 1),
        placedBattery('bat', 1, 2, 2)
      ],
      [panel(1, 'ST-200', 200), panel(2, 'ST-300', 300)],
      [inverter],
      [battery]
    )
    expect(rows).toEqual([
      { label: 'SunTech ST-200', qty: 2, unitPrice: 200 },
      { label: 'SunTech ST-300', qty: 1, unitPrice: 300 },
      { label: 'PowMax PM-1500', qty: 1, unitPrice: 600 },
      { label: 'VoltCore VC-100', qty: 4, unitPrice: 800 }
    ])
    expect(total).toBeCloseTo(2 * 200 + 300 + 600 + 4 * 800)
  })

  it('sums battery cells across multiple placed banks of the same model', () => {
    const { rows } = computeBom(
      [placedBattery('bat1', 1, 1, 1), placedBattery('bat2', 1, 2, 1)],
      [],
      [],
      [battery]
    )
    expect(rows).toEqual([{ label: 'VoltCore VC-100', qty: 3, unitPrice: 800 }])
  })

  it('lists combiners, breakers and busbars at fixed prices', () => {
    const { rows, total } = computeBom(
      [placedCombiner('cb'), placedBreaker('brk'), placedBusbar('bus')],
      [],
      [],
      []
    )
    expect(rows).toEqual([
      { label: 'Combiner box', qty: 1, unitPrice: 120 },
      { label: 'DC breaker / disconnect', qty: 1, unitPrice: 40 },
      { label: 'DC busbar', qty: 1, unitPrice: 75 }
    ])
    expect(total).toBeCloseTo(120 + 40 + 75)
  })

  it('omits rows for unplaced equipment', () => {
    const { rows, total } = computeBom([placedPanel('a', 1)], [panel(1, 'ST-200', 200)], [inverter], [battery])
    expect(rows).toEqual([{ label: 'SunTech ST-200', qty: 1, unitPrice: 200 }])
    expect(total).toBeCloseTo(200)
  })

  it('skips placed panels missing from the catalog', () => {
    const { rows, total } = computeBom([placedPanel('a', 99)], [], [inverter], [battery])
    expect(rows).toHaveLength(0)
    expect(total).toBe(0)
  })
})
