import { describe, expect, it } from 'vitest'
import { computeBom } from './bom'
import type { Battery, Inverter, Panel, PlacedPanel } from '../types'

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

const placed = (id: string, panelId: number): PlacedPanel => ({
  id,
  panelId,
  x: 0,
  y: 0,
  width: 40,
  height: 40
})

describe('computeBom', () => {
  it('counts placed panels per model and prices the full system', () => {
    const { rows, total } = computeBom(
      [placed('a', 1), placed('b', 1), placed('c', 2)],
      [panel(1, 'ST-200', 200), panel(2, 'ST-300', 300)],
      inverter,
      battery,
      2,
      2
    )
    expect(rows).toEqual([
      { label: 'SunTech ST-200 panel', qty: 2, unitPrice: 200 },
      { label: 'SunTech ST-300 panel', qty: 1, unitPrice: 300 },
      { label: 'PowMax PM-1500 inverter', qty: 1, unitPrice: 600 },
      { label: 'VoltCore VC-100 battery', qty: 4, unitPrice: 800 }
    ])
    expect(total).toBeCloseTo(2 * 200 + 300 + 600 + 4 * 800)
  })

  it('omits inverter and battery rows when unconfigured', () => {
    const { rows, total } = computeBom(
      [placed('a', 1)],
      [panel(1, 'ST-200', 200)],
      null,
      null,
      0,
      0
    )
    expect(rows).toEqual([{ label: 'SunTech ST-200 panel', qty: 1, unitPrice: 200 }])
    expect(total).toBeCloseTo(200)
  })

  it('handles placed panels missing from the catalog', () => {
    const { rows, total } = computeBom([placed('a', 99)], [], null, null, 0, 0)
    expect(rows).toHaveLength(1)
    expect(rows[0].qty).toBe(1)
    expect(rows[0].unitPrice).toBe(0)
    expect(rows[0].label).toContain('Unknown')
    expect(total).toBe(0)
  })
})
