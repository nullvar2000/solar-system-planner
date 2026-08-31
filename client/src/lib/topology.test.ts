import { describe, expect, it } from 'vitest'
import {
  canConnect,
  findStrings,
  findTopologyWarnings,
  isTerminalWired,
  terminalWireCount
} from './topology'
import { panelMap } from './electrical'
import type { Connection, Panel, PlacedDevice } from '../types'

let connSeq = 0
const conn = (
  fromDeviceId: string,
  fromTerminal: string,
  toDeviceId: string,
  toTerminal: string
): Connection => ({ id: `c${connSeq++}`, fromDeviceId, fromTerminal, toDeviceId, toTerminal })

const panel = (id: string, refId = 1): PlacedDevice => ({
  id,
  kind: 'panel',
  refId,
  x: 0,
  y: 0,
  width: 40,
  height: 40
})
const inverter = (id: string, refId = 1): PlacedDevice => ({
  id,
  kind: 'inverter',
  refId,
  x: 0,
  y: 0,
  width: 140,
  height: 100
})
const breaker = (id: string): PlacedDevice => ({
  id,
  kind: 'breaker',
  refId: null,
  x: 0,
  y: 0,
  width: 48,
  height: 64
})
const busbar = (id: string): PlacedDevice => ({
  id,
  kind: 'busbar',
  refId: null,
  x: 0,
  y: 0,
  width: 220,
  height: 48
})
const combiner = (id: string, inputs = 4): PlacedDevice => ({
  id,
  kind: 'combiner',
  refId: null,
  x: 0,
  y: 0,
  width: 30 * inputs + 30,
  height: 90,
  combinerInputs: inputs
})

const catalogPanel = (id: number, over: Partial<Panel> = {}): Panel => ({
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

const sortedIds = (ids: string[]) => [...ids].sort()

describe('findStrings', () => {
  it('returns a single-panel group for a standalone panel', () => {
    const groups = findStrings([panel('p1')], [])
    expect(groups).toHaveLength(1)
    expect(groups[0].seriesCount).toBe(1)
    expect(groups[0].parallelCount).toBe(1)
    expect(groups[0].totalPanels).toBe(1)
    expect(groups[0].destination).toBeNull()
    expect(groups[0].ends?.map((e) => e.kind)).toEqual(['open', 'open'])
  })

  it('detects a series pair', () => {
    const devices = [panel('p1'), panel('p2')]
    const connections = [conn('p1', '-', 'p2', '+')]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(sortedIds(groups[0].panelIds)).toEqual(['p1', 'p2'])
    expect(groups[0].seriesCount).toBe(2)
    expect(groups[0].parallelCount).toBe(1)
  })

  it('detects a parallel pair (ring of two)', () => {
    const devices = [panel('p1'), panel('p2')]
    const connections = [conn('p1', '+', 'p2', '+'), conn('p1', '-', 'p2', '-')]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(sortedIds(groups[0].panelIds)).toEqual(['p1', 'p2'])
    expect(groups[0].seriesCount).toBe(1)
    expect(groups[0].parallelCount).toBe(2)
    expect(groups[0].ends).toBeNull()
  })

  it('detects a 2S x 2P ring', () => {
    const devices = [panel('a1'), panel('a2'), panel('b1'), panel('b2')]
    const connections = [
      conn('a1', '-', 'a2', '+'),
      conn('b1', '-', 'b2', '+'),
      conn('a1', '+', 'b1', '+'),
      conn('a2', '-', 'b2', '-')
    ]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(groups[0].totalPanels).toBe(4)
    expect(groups[0].seriesCount).toBe(2)
    expect(groups[0].parallelCount).toBe(2)
  })

  it('is independent of device placement order', () => {
    const devicesA = [panel('a1'), panel('a2'), panel('b1'), panel('b2')]
    const devicesB = [panel('b2'), panel('a1'), panel('b1'), panel('a2')]
    const connections = [
      conn('a1', '-', 'a2', '+'),
      conn('b1', '-', 'b2', '+'),
      conn('a1', '+', 'b1', '+'),
      conn('a2', '-', 'b2', '-')
    ]
    const ga = findStrings(devicesA, connections)
    const gb = findStrings(devicesB, connections)
    expect(ga).toHaveLength(gb.length)
    expect(sortedIds(ga[0].panelIds)).toEqual(sortedIds(gb[0].panelIds))
    expect(ga[0].seriesCount).toBe(gb[0].seriesCount)
    expect(ga[0].parallelCount).toBe(gb[0].parallelCount)
    expect(sortedIds(ga[0].seriesStrings.flat())).toEqual(sortedIds(gb[0].seriesStrings.flat()))
  })

  it('follows breaker pass-throughs in a series string', () => {
    const devices = [panel('p1'), breaker('brk'), panel('p2')]
    const connections = [conn('p1', '-', 'brk', 'in'), conn('brk', 'out', 'p2', '+')]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(sortedIds(groups[0].panelIds)).toEqual(['p1', 'p2'])
    expect(groups[0].seriesCount).toBe(2)
  })

  it('resolves the inverter destination of a directly wired string', () => {
    const devices = [panel('p1'), inverter('inv1')]
    const connections = [conn('p1', '+', 'inv1', 'pv0+'), conn('p1', '-', 'inv1', 'pv0-')]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(groups[0].destination).toEqual({ deviceId: 'inv1', input: 0 })
  })

  it('merges combiner-fed strings into one group with the inverter destination', () => {
    const devices = [panel('p1'), panel('p2'), combiner('cb', 2), inverter('inv1')]
    const connections = [
      conn('p1', '+', 'cb', 'in0+'),
      conn('p2', '+', 'cb', 'in1+'),
      conn('cb', 'out+', 'inv1', 'pv0+'),
      conn('cb', 'out-', 'inv1', 'pv0-')
    ]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(sortedIds(groups[0].panelIds)).toEqual(['p1', 'p2'])
    expect(groups[0].seriesCount).toBe(1)
    expect(groups[0].parallelCount).toBe(2)
    expect(groups[0].destination).toEqual({ deviceId: 'inv1', input: 0 })
  })

  it('merges busbar-fed strings into one group with the inverter destination', () => {
    const devices = [panel('p1'), panel('p2'), busbar('bus'), inverter('inv1')]
    const connections = [
      conn('p1', '+', 'bus', 'bus+'),
      conn('p2', '+', 'bus', 'bus+'),
      conn('bus', 'bus+', 'inv1', 'pv0+'),
      conn('bus', 'bus-', 'inv1', 'pv0-')
    ]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(sortedIds(groups[0].panelIds)).toEqual(['p1', 'p2'])
    expect(groups[0].parallelCount).toBe(2)
    expect(groups[0].destination).toEqual({ deviceId: 'inv1', input: 0 })
  })

  it('resolves the destination through a breaker between busbar and inverter', () => {
    const devices = [panel('p1'), busbar('bus'), breaker('brk'), inverter('inv1')]
    const connections = [
      conn('p1', '+', 'bus', 'bus+'),
      conn('bus', 'bus+', 'brk', 'in'),
      conn('brk', 'out', 'inv1', 'pv0+'),
      conn('bus', 'bus-', 'inv1', 'pv0-')
    ]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(1)
    expect(groups[0].destination).toEqual({ deviceId: 'inv1', input: 0 })
  })

  it('keeps two strings on the same inverter but different inputs separate', () => {
    const devices = [panel('p1'), panel('p2'), inverter('inv1')]
    const connections = [
      conn('p1', '+', 'inv1', 'pv0+'),
      conn('p1', '-', 'inv1', 'pv0-'),
      conn('p2', '+', 'inv1', 'pv1+'),
      conn('p2', '-', 'inv1', 'pv1-')
    ]
    const groups = findStrings(devices, connections)
    expect(groups).toHaveLength(2)
    const dests = groups
      .map((g) => g.destination)
      .sort((a, b) => (a?.input ?? 0) - (b?.input ?? 0))
    expect(dests).toEqual([
      { deviceId: 'inv1', input: 0 },
      { deviceId: 'inv1', input: 1 }
    ])
  })
})

describe('canConnect', () => {
  const devices = [panel('p1'), panel('p2'), inverter('inv1'), breaker('brk'), busbar('bus')]

  it('connects matching polarities', () => {
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'p2', terminal: '+' }, devices, [])).toBe(true)
    expect(canConnect({ deviceId: 'p1', terminal: '-' }, { deviceId: 'p2', terminal: '-' }, devices, [])).toBe(true)
  })

  it('rejects mismatched polarities', () => {
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'p2', terminal: '-' }, devices, [])).toBe(false)
  })

  it('rejects a terminal wired to its own device', () => {
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'p1', terminal: '-' }, devices, [])).toBe(false)
  })

  it('enforces single-wire capacity on normal terminals', () => {
    const existing = [conn('p1', '+', 'p2', '+')]
    expect(
      canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'brk', terminal: 'in' }, devices, existing)
    ).toBe(false)
    expect(
      canConnect({ deviceId: 'p1', terminal: '-' }, { deviceId: 'brk', terminal: 'out' }, devices, existing)
    ).toBe(true)
  })

  it('allows multiple wires on busbar rails', () => {
    const existing = [conn('p1', '+', 'bus', 'bus+')]
    expect(canConnect({ deviceId: 'p2', terminal: '+' }, { deviceId: 'bus', terminal: 'bus+' }, devices, existing)).toBe(true)
  })

  it('treats breaker terminals as polarity-agnostic', () => {
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'brk', terminal: 'in' }, devices, [])).toBe(true)
    expect(canConnect({ deviceId: 'p1', terminal: '-' }, { deviceId: 'brk', terminal: 'in' }, devices, [])).toBe(true)
  })

  it('rejects PV wires to AC terminals', () => {
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'inv1', terminal: 'ac' }, devices, [])).toBe(false)
    expect(canConnect({ deviceId: 'p1', terminal: '+' }, { deviceId: 'inv1', terminal: 'pv0+' }, devices, [])).toBe(true)
  })
})

describe('terminal helpers', () => {
  const connections = [conn('p1', '+', 'p2', '+'), conn('p1', '+', 'p3', '+')]

  it('counts wires per terminal', () => {
    expect(terminalWireCount('p1', '+', connections)).toBe(2)
    expect(terminalWireCount('p1', '-', connections)).toBe(0)
  })

  it('reports whether a terminal is wired', () => {
    expect(isTerminalWired('p1', '+', connections)).toBe(true)
    expect(isTerminalWired('p1', '-', connections)).toBe(false)
  })
})

describe('findTopologyWarnings', () => {
  const catalog = [catalogPanel(1), catalogPanel(2, { model: 'Q2', vmp: 41 })]

  it('warns about open panel terminals', () => {
    const devices = [panel('p1')]
    const warnings = findTopologyWarnings(devices, [], panelMap(devices, catalog))
    expect(warnings.filter((w) => w.includes('open terminal')).length).toBeGreaterThanOrEqual(1)
  })

  it('warns about a breaker with a dangling side', () => {
    const devices = [panel('p1'), breaker('brk')]
    const connections = [conn('p1', '-', 'brk', 'in')]
    const warnings = findTopologyWarnings(devices, connections, panelMap(devices, catalog))
    expect(warnings.some((w) => w.includes('dangling side'))).toBe(true)
  })

  it('warns about different panel models in one series string', () => {
    const devices = [panel('p1', 1), panel('p2', 2)]
    const connections = [conn('p1', '-', 'p2', '+')]
    const warnings = findTopologyWarnings(devices, connections, panelMap(devices, catalog))
    expect(warnings.some((w) => w.includes('different panel models'))).toBe(true)
  })

  it('warns about mismatched parallel string voltages', () => {
    const devices = [panel('a1', 1), panel('b1', 2)]
    const connections = [conn('a1', '+', 'b1', '+'), conn('a1', '-', 'b1', '-')]
    const warnings = findTopologyWarnings(devices, connections, panelMap(devices, catalog))
    expect(warnings.some((w) => w.includes('mismatched voltages'))).toBe(true)
  })

  it('warns when a combiner is not connected to an inverter', () => {
    const devices = [panel('p1'), combiner('cb', 2)]
    const connections = [conn('p1', '+', 'cb', 'in0+')]
    const warnings = findTopologyWarnings(devices, connections, panelMap(devices, catalog))
    expect(warnings.some((w) => w.includes('not connected to an inverter'))).toBe(true)
  })

  it('is quiet for a clean two-panel series string into an inverter', () => {
    const devices = [panel('p1'), panel('p2'), inverter('inv1')]
    const connections = [
      conn('p1', '-', 'p2', '+'),
      conn('p2', '-', 'inv1', 'pv0-'),
      conn('p1', '+', 'inv1', 'pv0+')
    ]
    const warnings = findTopologyWarnings(devices, connections, panelMap(devices, catalog))
    expect(warnings).toEqual([])
  })
})
