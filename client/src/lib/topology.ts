import { Connection, Panel, PlacedDevice } from '../types'
import { internalBonds, terminalCapacity, terminalPolarity } from './terminals'

export interface TerminalRef {
  deviceId: string
  terminal: string
}

export type Sink =
  | { kind: 'inverter-input'; deviceId: string; input: number }
  | { kind: 'combiner-slot'; deviceId: string; slot: number }
  | { kind: 'busbar-rail'; deviceId: string; rail: string }
  | { kind: 'device'; deviceId: string; terminal: string }
  | { kind: 'open'; deviceId: string; terminal: string }

export interface GroupInfo {
  panelIds: string[]
  seriesStrings: string[][]
  seriesCount: number
  parallelCount: number
  totalPanels: number
  destination: { deviceId: string; input: number } | null
  ends: Sink[] | null
}

export function terminalWireCount(
  deviceId: string,
  terminal: string,
  connections: Connection[]
): number {
  return connections.filter(
    (c) =>
      (c.fromDeviceId === deviceId && c.fromTerminal === terminal) ||
      (c.toDeviceId === deviceId && c.toTerminal === terminal)
  ).length
}

export function isTerminalWired(
  deviceId: string,
  terminal: string,
  connections: Connection[]
): boolean {
  return terminalWireCount(deviceId, terminal, connections) > 0
}

export function canConnect(
  from: TerminalRef,
  to: TerminalRef,
  devices: PlacedDevice[],
  connections: Connection[]
): boolean {
  if (from.deviceId === to.deviceId) return false
  const a = devices.find((d) => d.id === from.deviceId)
  const b = devices.find((d) => d.id === to.deviceId)
  if (!a || !b) return false
  const pa = terminalPolarity(a, from.terminal)
  const pb = terminalPolarity(b, to.terminal)
  if (pa !== 'any' && pb !== 'any' && pa !== pb) return false
  if (terminalWireCount(from.deviceId, from.terminal, connections) >= terminalCapacity(a, from.terminal)) {
    return false
  }
  if (terminalWireCount(to.deviceId, to.terminal, connections) >= terminalCapacity(b, to.terminal)) {
    return false
  }
  return true
}

interface Term {
  deviceId: string
  terminal: string
}

const tKey = (t: Term) => `${t.deviceId}::${t.terminal}`

interface Graph {
  wires: Map<string, Term[]>
  bonds: Map<string, Term>
  deviceById: Map<string, PlacedDevice>
}

function buildGraph(devices: PlacedDevice[], connections: Connection[]): Graph {
  const wires = new Map<string, Term[]>()
  for (const c of connections) {
    const a: Term = { deviceId: c.fromDeviceId, terminal: c.fromTerminal }
    const b: Term = { deviceId: c.toDeviceId, terminal: c.toTerminal }
    const ka = tKey(a)
    const kb = tKey(b)
    if (!wires.has(ka)) wires.set(ka, [])
    if (!wires.has(kb)) wires.set(kb, [])
    wires.get(ka)!.push(b)
    wires.get(kb)!.push(a)
  }
  const bonds = new Map<string, Term>()
  for (const d of devices) {
    for (const [t1, t2] of internalBonds(d)) {
      bonds.set(tKey({ deviceId: d.id, terminal: t1 }), { deviceId: d.id, terminal: t2 })
      bonds.set(tKey({ deviceId: d.id, terminal: t2 }), { deviceId: d.id, terminal: t1 })
    }
  }
  return { wires, bonds, deviceById: new Map(devices.map((d) => [d.id, d])) }
}

const PV_INPUT = /^pv(\d+)[+-]$/
const COMBINER_IN = /^in(\d+)[+-]$/

function classifySink(device: PlacedDevice, terminal: string): Sink {
  if (device.kind === 'inverter') {
    const m = PV_INPUT.exec(terminal)
    if (m) return { kind: 'inverter-input', deviceId: device.id, input: Number(m[1]) }
  } else if (device.kind === 'combiner') {
    const m = COMBINER_IN.exec(terminal)
    if (m) return { kind: 'combiner-slot', deviceId: device.id, slot: Number(m[1]) }
  } else if (device.kind === 'busbar') {
    return { kind: 'busbar-rail', deviceId: device.id, rail: terminal }
  }
  return { kind: 'device', deviceId: device.id, terminal }
}

type TraceResult = { edge: Term } | { sink: Sink }

// Follow a terminal through breaker pass-throughs until it reaches another
// panel (a chain edge) or a terminal/sink. `viaBond` tracks whether we reached
// the current breaker terminal through its internal bond (exit via wire) or
// through a wire (cross to the other side).
function traceTerminal(start: Term, graph: Graph): TraceResult {
  let cur = start
  let viaBond = false
  for (let depth = 0; depth < 32; depth++) {
    const device = graph.deviceById.get(cur.deviceId)
    if (!device) {
      return { sink: { kind: 'device', deviceId: cur.deviceId, terminal: cur.terminal } }
    }
    if (device.kind === 'breaker' && !viaBond) {
      const other = graph.bonds.get(tKey(cur))
      if (!other) break
      cur = other
      viaBond = true
      continue
    }
    const partners = graph.wires.get(tKey(cur)) ?? []
    if (partners.length === 0) {
      return { sink: { kind: 'open', deviceId: cur.deviceId, terminal: cur.terminal } }
    }
    const p = partners[0]
    const pDevice = graph.deviceById.get(p.deviceId)
    if (!pDevice) {
      return { sink: { kind: 'device', deviceId: p.deviceId, terminal: p.terminal } }
    }
    if (pDevice.kind === 'breaker') {
      cur = p
      viaBond = false
      continue
    }
    if (pDevice.kind === 'panel') return { edge: p }
    return { sink: classifySink(pDevice, p.terminal) }
  }
  return { sink: { kind: 'device', deviceId: cur.deviceId, terminal: cur.terminal } }
}

interface ChainEdge {
  id: number
  a: string
  b: string
  aTerminal: string
  bTerminal: string
}

function collectChainEdges(panels: PlacedDevice[], graph: Graph): ChainEdge[] {
  const seen = new Set<string>()
  const edges: ChainEdge[] = []
  let nextId = 0
  for (const p of panels) {
    for (const terminal of ['+', '-']) {
      const result = traceTerminal({ deviceId: p.id, terminal }, graph)
      if ('sink' in result) continue
      const other = result.edge
      const lo = p.id <= other.deviceId ? p.id : other.deviceId
      const hi = p.id <= other.deviceId ? other.deviceId : p.id
      const loTerminal = p.id === lo ? terminal : other.terminal
      const hiTerminal = p.id === lo ? other.terminal : terminal
      const dedup = `${lo}::${hi}::${loTerminal}::${hiTerminal}`
      if (seen.has(dedup)) continue
      seen.add(dedup)
      edges.push({ id: nextId++, a: lo, b: hi, aTerminal: loTerminal, bTerminal: hiTerminal })
    }
  }
  return edges
}

const junctionOf = (aTerminal: string, bTerminal: string): 'series' | 'parallel' =>
  (aTerminal === '+' ? 'pos' : 'neg') === (bTerminal === '+' ? 'pos' : 'neg') ? 'parallel' : 'series'

const destKey = (d: { deviceId: string; input: number }) => `${d.deviceId}:${d.input}`

function distinctDests(dests: Array<{ deviceId: string; input: number }>) {
  const m = new Map<string, { deviceId: string; input: number }>()
  for (const d of dests) m.set(destKey(d), d)
  return [...m.values()]
}

// Follow wires from a terminal through breakers, combiner outputs and busbar
// rails, collecting every inverter PV input reachable.
function resolveInverterDestinations(
  start: Term,
  graph: Graph,
  seen: Set<string>,
  depth: number
): Array<{ deviceId: string; input: number }> {
  if (depth > 16) return []
  const k = tKey(start)
  if (seen.has(k)) return []
  seen.add(k)
  const device = graph.deviceById.get(start.deviceId)
  if (!device) return []
  const out: Array<{ deviceId: string; input: number }> = []
  for (const p of graph.wires.get(k) ?? []) {
    const pDevice = graph.deviceById.get(p.deviceId)
    if (!pDevice) continue
    if (pDevice.kind === 'breaker') {
      // cross the breaker internally, then explore the far side
      const other = graph.bonds.get(tKey(p))
      if (other) out.push(...resolveInverterDestinations(other, graph, seen, depth + 1))
    } else if (pDevice.kind === 'busbar') {
      out.push(...resolveInverterDestinations(p, graph, seen, depth + 1))
    } else if (pDevice.kind === 'combiner' && (p.terminal === 'out+' || p.terminal === 'out-')) {
      out.push(...resolveInverterDestinations(p, graph, seen, depth + 1))
    } else if (pDevice.kind === 'inverter') {
      const m = PV_INPUT.exec(p.terminal)
      if (m) out.push({ deviceId: p.deviceId, input: Number(m[1]) })
    }
  }
  return out
}

function groupDestination(ends: Sink[], graph: Graph): { deviceId: string; input: number } | null {
  const dests = new Map<string, { deviceId: string; input: number }>()
  for (const end of ends) {
    let found: Array<{ deviceId: string; input: number }> = []
    if (end.kind === 'inverter-input') {
      found = [{ deviceId: end.deviceId, input: end.input }]
    } else if (end.kind === 'combiner-slot') {
      found = distinctDests(resolveInverterDestinations({ deviceId: end.deviceId, terminal: 'out+' }, graph, new Set(), 0))
    } else if (end.kind === 'busbar-rail') {
      found = distinctDests(resolveInverterDestinations({ deviceId: end.deviceId, terminal: end.rail }, graph, new Set(), 0))
    }
    if (found.length === 1) dests.set(destKey(found[0]), found[0])
  }
  return dests.size === 1 ? [...dests.values()][0] : null
}

function terminalTraceSink(deviceId: string, terminal: string, graph: Graph): Sink {
  const result = traceTerminal({ deviceId, terminal }, graph)
  return 'sink' in result ? result.sink : { kind: 'device', deviceId, terminal }
}

function computeEnds(seq: string[], edges: ChainEdge[], graph: Graph): Sink[] {
  const first = seq[0]
  const last = seq[seq.length - 1]
  if (first === last) {
    return [
      terminalTraceSink(first, '+', graph),
      terminalTraceSink(first, '-', graph)
    ]
  }
  const freeTerminal = (panelId: string): string => {
    const used = edges
      .filter((e) => e.a === panelId || e.b === panelId)
      .map((e) => (e.a === panelId ? e.aTerminal : e.bTerminal))
    return used.includes('+') ? '-' : '+'
  }
  return [terminalTraceSink(first, freeTerminal(first), graph), terminalTraceSink(last, freeTerminal(last), graph)]
}

export function findStrings(devices: PlacedDevice[], connections: Connection[]): GroupInfo[] {
  const panels = devices.filter((d) => d.kind === 'panel')
  if (panels.length === 0) return []

  const graph = buildGraph(devices, connections)
  const edges = collectChainEdges(panels, graph)

  const adj = new Map<string, Array<{ edgeId: number; other: string; junction: 'series' | 'parallel' }>>()
  for (const e of edges) {
    const j = junctionOf(e.aTerminal, e.bTerminal)
    if (!adj.has(e.a)) adj.set(e.a, [])
    if (!adj.has(e.b)) adj.set(e.b, [])
    adj.get(e.a)!.push({ edgeId: e.id, other: e.b, junction: j })
    adj.get(e.b)!.push({ edgeId: e.id, other: e.a, junction: j })
  }
  const degree = (id: string) => (adj.get(id) ?? []).length

  const visited = new Set<string>()
  const raw: GroupInfo[] = []

  for (const p of panels) {
    if (visited.has(p.id)) continue

    const component: string[] = [p.id]
    const inComponent = new Set([p.id])
    const stack = [p.id]
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const { other } of adj.get(cur) ?? []) {
        if (!inComponent.has(other)) {
          inComponent.add(other)
          component.push(other)
          stack.push(other)
        }
      }
    }

    const startNode = component.find((id) => degree(id) <= 1) ?? component[0]

    const seq: string[] = []
    const junctions: ('series' | 'parallel')[] = []
    let isCycle = false
    let cur = startNode
    let prevEdge = -1
    while (true) {
      if (visited.has(cur)) {
        if (seq.length > 0) isCycle = true
        break
      }
      visited.add(cur)
      seq.push(cur)
      const options = (adj.get(cur) ?? []).filter((o) => o.edgeId !== prevEdge)
      if (options.length === 0) break
      const next = options[0]
      junctions.push(next.junction)
      prevEdge = next.edgeId
      cur = next.other
    }

    let runs: string[][]
    if (isCycle) {
      const n = seq.length
      const cuts = junctions
        .map((j, i) => (j === 'parallel' ? i : -1))
        .filter((i) => i >= 0)
      if (cuts.length === 0) {
        runs = [seq]
      } else {
        const s0 = (cuts[0] + 1) % n
        const rotated = [...seq.slice(s0), ...seq.slice(0, s0)]
        const rcuts = cuts.map((ci) => (ci - s0 + n) % n).sort((a, b) => a - b)
        runs = []
        let prev = -1
        for (const rc of rcuts) {
          runs.push(rotated.slice(prev + 1, rc + 1))
          prev = rc
        }
      }
    } else {
      runs = [seq]
    }

    const ends = isCycle ? null : computeEnds(seq, edges, graph)

    raw.push({
      panelIds: seq,
      seriesStrings: runs,
      seriesCount: Math.max(...runs.map((r) => r.length)),
      parallelCount: runs.length,
      totalPanels: seq.length,
      destination: ends ? groupDestination(ends, graph) : null,
      ends
    })
  }

  const byKey = new Map<string, GroupInfo[]>()
  for (const g of raw) {
    const key = g.destination ? `inv:${destKey(g.destination)}` : `chain:${g.panelIds[0]}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(g)
  }

  const groups: GroupInfo[] = []
  for (const list of byKey.values()) {
    if (list.length === 1) {
      groups.push(list[0])
      continue
    }
    const seriesStrings = list.flatMap((g) => g.seriesStrings)
    groups.push({
      panelIds: list.flatMap((g) => g.panelIds),
      seriesStrings,
      seriesCount: Math.max(...seriesStrings.map((r) => r.length)),
      parallelCount: seriesStrings.length,
      totalPanels: list.reduce((sum, g) => sum + g.totalPanels, 0),
      destination: list[0].destination,
      ends: null
    })
  }
  return groups
}

export function deviceLabel(device: PlacedDevice, terminal?: string): string {
  const names: Record<PlacedDevice['kind'], string> = {
    panel: 'panel',
    inverter: 'inverter',
    battery: 'battery',
    busbar: 'busbar',
    combiner: 'combiner box',
    breaker: 'DC breaker'
  }
  return terminal ? `${names[device.kind]} ${terminal}` : names[device.kind]
}

export function deviceShortLabel(device: PlacedDevice): string {
  const num = device.id.replace(/^[^0-9]*/, '') || '?'
  const prefix: Record<PlacedDevice['kind'], string> = {
    panel: 'P',
    inverter: 'INV',
    battery: 'BAT',
    busbar: 'BUS',
    combiner: 'CB',
    breaker: 'BRK'
  }
  return `${prefix[device.kind]}-${num}`
}

export function findTopologyWarnings(
  devices: PlacedDevice[],
  connections: Connection[],
  panelByPlacedId: Map<string, Panel>
): string[] {
  const warnings: string[] = []
  const groups = findStrings(devices, connections)
  const deviceById = new Map(devices.map((d) => [d.id, d]))

  const pos = (id: string) => {
    const d = deviceById.get(id)
    return d ? `(${Math.round(d.x)}, ${Math.round(d.y)})` : ''
  }

  groups.forEach((g, gi) => {
    const label = `Group ${gi + 1}`

    for (const run of g.seriesStrings) {
      if (run.length > 1) {
        const models = new Set(run.map((id) => panelByPlacedId.get(id)?.model).filter(Boolean))
        if (models.size > 1) {
          warnings.push(`${label}: different panel models in one series string`)
        }
      }
    }
    if (g.seriesStrings.length > 1) {
      const voltages = g.seriesStrings.map((run) =>
        run.reduce((sum, id) => sum + (panelByPlacedId.get(id)?.vmp ?? 0), 0)
      )
      if (Math.max(...voltages) - Math.min(...voltages) > 0.05) {
        warnings.push(`${label}: parallel strings have mismatched voltages`)
      }
    }

    for (const end of g.ends ?? []) {
      const device = deviceById.get(end.deviceId)
      if (!device) continue
      if (end.kind === 'open') {
        if (device.kind === 'panel') {
          const model = panelByPlacedId.get(device.id)?.model ?? 'panel'
          warnings.push(`${model} at ${pos(device.id)} has an open terminal`)
        } else if (device.kind === 'breaker') {
          warnings.push(`Breaker at ${pos(device.id)} has a dangling side`)
        }
      } else if (end.kind === 'device') {
        warnings.push(`${label}: connected to a non-PV terminal (${deviceLabel(device, end.terminal)})`)
      }
    }

    if (!g.destination && g.ends?.some((e) => e.kind === 'combiner-slot' || e.kind === 'busbar-rail')) {
      warnings.push(`${label}: not connected to an inverter`)
    }
  })

  return warnings
}
