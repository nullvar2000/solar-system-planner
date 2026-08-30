import { describe, expect, it } from 'vitest'
import { analyzeStrings, canConnect, findTopologyWarnings, isTerminalWired } from './topology'
import type { Connection, Panel, PlacedPanel, Terminal } from '../types'

let connSeq = 0
const wire = (
  fromPanelId: string,
  fromTerminal: Terminal,
  toPanelId: string,
  toTerminal: Terminal
): Connection => ({
  id: `c${connSeq++}`,
  fromPanelId,
  fromTerminal,
  toPanelId,
  toTerminal
})

const placed = (id: string, panelId = 1): PlacedPanel => ({
  id,
  panelId,
  x: 0,
  y: 0,
  width: 100,
  height: 50
})

const makePanel = (id: number, model: string, vmp: number): Panel => ({
  id,
  manufacturer: 'M',
  model,
  vmp,
  imp: 5,
  voc: 22,
  isc: 5.5,
  pmax: 100,
  temp_coeff_v: -0.003,
  temp_coeff_i: 0.003,
  width: 1,
  height: 1,
  price: 100
})

const sortedRuns = (runs: string[][]) =>
  runs.map((r) => [...r].sort()).sort((a, b) => a.join().localeCompare(b.join()))

describe('analyzeStrings', () => {
  it('returns empty for no panels', () => {
    expect(analyzeStrings([], [])).toEqual([])
  })

  it('reports a single unwired panel as a 1x1 group', () => {
    const [group] = analyzeStrings([placed('a')], [])
    expect(group).toEqual({
      panelIds: ['a'],
      seriesStrings: [['a']],
      seriesCount: 1,
      parallelCount: 1,
      totalPanels: 1
    })
  })

  it('detects a 3-panel series string', () => {
    const placedPanels = [placed('a'), placed('b'), placed('c')]
    const connections = [wire('a', 'positive', 'b', 'negative'), wire('b', 'positive', 'c', 'negative')]
    const [group] = analyzeStrings(placedPanels, connections)
    expect([...group.panelIds].sort()).toEqual(['a', 'b', 'c'])
    expect(sortedRuns(group.seriesStrings)).toEqual([['a', 'b', 'c']])
    expect(group.seriesCount).toBe(3)
    expect(group.parallelCount).toBe(1)
    expect(group.totalPanels).toBe(3)
  })

  it('detects two panels in parallel as two single-panel strings', () => {
    const placedPanels = [placed('a'), placed('b')]
    const connections = [wire('a', 'positive', 'b', 'positive'), wire('a', 'negative', 'b', 'negative')]
    const [group] = analyzeStrings(placedPanels, connections)
    expect(group.totalPanels).toBe(2)
    expect(group.seriesCount).toBe(1)
    expect(group.parallelCount).toBe(2)
    expect(sortedRuns(group.seriesStrings)).toEqual([['a'], ['b']])
  })

  it('splits a 2S x 2P ring into two 2-panel series strings', () => {
    const placedPanels = [placed('a'), placed('b'), placed('c'), placed('d')]
    const connections = [
      wire('a', 'positive', 'b', 'negative'),
      wire('b', 'positive', 'c', 'positive'),
      wire('c', 'negative', 'd', 'positive'),
      wire('d', 'negative', 'a', 'negative')
    ]
    const [group] = analyzeStrings(placedPanels, connections)
    expect(group.totalPanels).toBe(4)
    expect(group.seriesCount).toBe(2)
    expect(group.parallelCount).toBe(2)
    expect(sortedRuns(group.seriesStrings)).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ])
  })

  it('keeps independent groups separate', () => {
    const placedPanels = [placed('a'), placed('b'), placed('c')]
    const connections = [wire('a', 'positive', 'b', 'negative')]
    const groups = analyzeStrings(placedPanels, connections)
    expect(groups).toHaveLength(2)
    const sizes = groups.map((g) => g.totalPanels).sort()
    expect(sizes).toEqual([1, 2])
  })
})

describe('isTerminalWired', () => {
  const connections = [wire('a', 'positive', 'b', 'positive')]

  it('is true for terminals carrying a wire', () => {
    expect(isTerminalWired('a', 'positive', connections)).toBe(true)
    expect(isTerminalWired('b', 'positive', connections)).toBe(true)
  })

  it('is false for free terminals', () => {
    expect(isTerminalWired('a', 'negative', connections)).toBe(false)
    expect(isTerminalWired('b', 'negative', connections)).toBe(false)
  })
})

describe('canConnect', () => {
  it('refuses terminals on the same panel', () => {
    expect(canConnect({ panelId: 'a', terminal: 'positive' }, { panelId: 'a', terminal: 'negative' }, [])).toBe(false)
  })

  it('allows connecting two free terminals', () => {
    expect(canConnect({ panelId: 'a', terminal: 'positive' }, { panelId: 'b', terminal: 'positive' }, [])).toBe(true)
  })

  it('refuses if either terminal is already wired', () => {
    const connections = [wire('a', 'positive', 'c', 'positive')]
    expect(canConnect({ panelId: 'a', terminal: 'positive' }, { panelId: 'b', terminal: 'positive' }, connections)).toBe(false)
    expect(canConnect({ panelId: 'a', terminal: 'negative' }, { panelId: 'c', terminal: 'positive' }, connections)).toBe(false)
    expect(canConnect({ panelId: 'a', terminal: 'negative' }, { panelId: 'b', terminal: 'negative' }, connections)).toBe(true)
  })
})

describe('findTopologyWarnings', () => {
  it('warns on different panel models in one series string', () => {
    const placedPanels = [placed('a', 1), placed('b', 2)]
    const connections = [wire('a', 'positive', 'b', 'negative')]
    const byPlacedId = new Map([
      ['a', makePanel(1, 'A-200', 37)],
      ['b', makePanel(2, 'B-300', 37)]
    ])
    const warnings = findTopologyWarnings(placedPanels, connections, byPlacedId)
    expect(warnings.some((w) => w.includes('different panel models'))).toBe(true)
  })

  it('warns on mismatched voltages between parallel strings', () => {
    const placedPanels = [placed('a', 1), placed('b', 2)]
    const connections = [wire('a', 'positive', 'b', 'positive'), wire('a', 'negative', 'b', 'negative')]
    const byPlacedId = new Map([
      ['a', makePanel(1, 'A-200', 37)],
      ['b', makePanel(2, 'B-100', 18.5)]
    ])
    const warnings = findTopologyWarnings(placedPanels, connections, byPlacedId)
    expect(warnings.some((w) => w.includes('mismatched voltages'))).toBe(true)
  })

  it('warns on panels with a single open terminal', () => {
    const placedPanels = [placed('a'), placed('b')]
    const connections = [wire('a', 'positive', 'b', 'positive')]
    const byPlacedId = new Map([
      ['a', makePanel(1, 'A-200', 37)],
      ['b', makePanel(1, 'A-200', 37)]
    ])
    const warnings = findTopologyWarnings(placedPanels, connections, byPlacedId)
    expect(warnings.filter((w) => w.includes('open terminal'))).toHaveLength(2)
  })

  it('reports nothing for a clean matching 2S x 2P ring', () => {
    const placedPanels = [placed('a', 1), placed('b', 1), placed('c', 1), placed('d', 1)]
    const connections = [
      wire('a', 'positive', 'b', 'negative'),
      wire('b', 'positive', 'c', 'positive'),
      wire('c', 'negative', 'd', 'positive'),
      wire('d', 'negative', 'a', 'negative')
    ]
    const p = makePanel(1, 'A-200', 37)
    const byPlacedId = new Map([
      ['a', p],
      ['b', p],
      ['c', p],
      ['d', p]
    ])
    expect(findTopologyWarnings(placedPanels, connections, byPlacedId)).toEqual([])
  })
})
