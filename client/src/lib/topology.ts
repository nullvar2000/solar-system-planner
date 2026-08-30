import { Connection, Panel, PlacedPanel, Terminal } from '../types'

export interface TerminalRef {
  panelId: string
  terminal: Terminal
}

export interface StringInfo {
  panelIds: string[]
  seriesStrings: string[][]
  seriesCount: number
  parallelCount: number
  totalPanels: number
}

const tKey = (panelId: string, t: Terminal) => `${panelId}:${t}`
const panelOf = (k: string) => k.slice(0, k.lastIndexOf(':'))
const polarityOf = (k: string): Terminal => (k.endsWith('positive') ? 'positive' : 'negative')

export function isTerminalWired(
  panelId: string,
  terminal: Terminal,
  connections: Connection[]
): boolean {
  return connections.some(
    (c) =>
      (c.fromPanelId === panelId && c.fromTerminal === terminal) ||
      (c.toPanelId === panelId && c.toTerminal === terminal)
  )
}

export function canConnect(from: TerminalRef, to: TerminalRef, connections: Connection[]): boolean {
  if (from.panelId === to.panelId) return false
  return !isTerminalWired(from.panelId, from.terminal, connections) && !isTerminalWired(to.panelId, to.terminal, connections)
}

// Each terminal carries at most one wire, so the wiring graph is always a
// set of paths or rings of panels. Walk each component, then split rings at
// same-polarity (parallel) junctions to isolate individual series strings.
export function analyzeStrings(placed: PlacedPanel[], connections: Connection[]): StringInfo[] {
  if (placed.length === 0) return []

  const wire = new Map<string, string>()
  for (const c of connections) {
    const a = tKey(c.fromPanelId, c.fromTerminal)
    const b = tKey(c.toPanelId, c.toTerminal)
    wire.set(a, b)
    wire.set(b, a)
  }

  const visited = new Set<string>()
  const results: StringInfo[] = []

  for (const p of placed) {
    if (visited.has(p.id)) continue

    const posKey = tKey(p.id, 'positive')
    const startKey = wire.has(posKey) ? tKey(p.id, 'negative') : posKey

    const seq: string[] = []
    const junctions: ('series' | 'parallel')[] = []
    let isCycle = false
    let cur = startKey

    while (true) {
      const pid = panelOf(cur)
      if (visited.has(pid) && seq.length > 0) {
        isCycle = true
        break
      }
      visited.add(pid)
      seq.push(pid)
      const other = polarityOf(cur) === 'positive' ? `${pid}:negative` : `${pid}:positive`
      const partner = wire.get(other)
      if (!partner) break
      junctions.push(polarityOf(other) === polarityOf(partner) ? 'parallel' : 'series')
      cur = partner
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
        const rcuts = cuts
          .map((ci) => (ci - s0 + n) % n)
          .sort((a, b) => a - b)
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

    results.push({
      panelIds: seq,
      seriesStrings: runs,
      seriesCount: Math.max(...runs.map((r) => r.length)),
      parallelCount: runs.length,
      totalPanels: seq.length
    })
  }

  return results
}

export function findTopologyWarnings(
  placed: PlacedPanel[],
  connections: Connection[],
  panelByPlacedId: Map<string, Panel>
): string[] {
  const warnings: string[] = []
  const groups = analyzeStrings(placed, connections)

  groups.forEach((group, gi) => {
    const label = `Group ${gi + 1}`
    for (const run of group.seriesStrings) {
      if (run.length > 1) {
        const models = new Set(run.map((id) => panelByPlacedId.get(id)?.model).filter(Boolean))
        if (models.size > 1) {
          warnings.push(`${label}: different panel models in one series string`)
        }
      }
    }
    if (group.seriesStrings.length > 1) {
      const voltages = group.seriesStrings.map((run) =>
        run.reduce((sum, id) => sum + (panelByPlacedId.get(id)?.vmp ?? 0), 0)
      )
      if (Math.max(...voltages) - Math.min(...voltages) > 0.05) {
        warnings.push(`${label}: parallel strings have mismatched voltages`)
      }
    }
  })

  for (const p of placed) {
    const wireCount = connections.filter(
      (c) => c.fromPanelId === p.id || c.toPanelId === p.id
    ).length
    if (wireCount === 1) {
      const model = panelByPlacedId.get(p.id)?.model ?? 'panel'
      warnings.push(`${model} at (${Math.round(p.x)}, ${Math.round(p.y)}) has an open terminal`)
    }
  }

  return warnings
}
