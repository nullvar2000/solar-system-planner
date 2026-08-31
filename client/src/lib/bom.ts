import { Battery, Inverter, Panel, PlacedDevice } from '../types'

export const BUSBAR_PRICE = 75
export const BREAKER_PRICE = 40
export const COMBINER_PRICE = 120

export interface BomRow {
  label: string
  qty: number
  unitPrice: number
}

export function computeBom(
  devices: PlacedDevice[],
  panels: Panel[],
  inverters: Inverter[],
  batteries: Battery[]
): { rows: BomRow[]; total: number } {
  const rows: BomRow[] = []
  const panelById = new Map(panels.map((p) => [p.id, p]))
  const inverterById = new Map(inverters.map((i) => [i.id, i]))
  const batteryById = new Map(batteries.map((b) => [b.id, b]))

  const panelCounts = new Map<number, number>()
  const inverterCounts = new Map<number, number>()
  const batteryCounts = new Map<number, number>()
  let combinerCount = 0
  let breakerCount = 0
  let busbarCount = 0

  for (const d of devices) {
    if (d.kind === 'panel' && d.refId !== null) {
      panelCounts.set(d.refId, (panelCounts.get(d.refId) ?? 0) + 1)
    } else if (d.kind === 'inverter' && d.refId !== null) {
      inverterCounts.set(d.refId, (inverterCounts.get(d.refId) ?? 0) + 1)
    } else if (d.kind === 'battery' && d.refId !== null) {
      const cells = (d.batterySeries ?? 1) * (d.batteryParallel ?? 1)
      batteryCounts.set(d.refId, (batteryCounts.get(d.refId) ?? 0) + cells)
    } else if (d.kind === 'combiner') {
      combinerCount++
    } else if (d.kind === 'breaker') {
      breakerCount++
    } else if (d.kind === 'busbar') {
      busbarCount++
    }
  }

  for (const [id, qty] of panelCounts) {
    const p = panelById.get(id)
    if (!p) continue
    rows.push({ label: `${p.manufacturer} ${p.model}`, qty, unitPrice: p.price })
  }
  for (const [id, qty] of inverterCounts) {
    const i = inverterById.get(id)
    if (!i) continue
    rows.push({ label: `${i.manufacturer} ${i.model}`, qty, unitPrice: i.price })
  }
  for (const [id, qty] of batteryCounts) {
    const b = batteryById.get(id)
    if (!b) continue
    rows.push({ label: `${b.manufacturer} ${b.model}`, qty, unitPrice: b.price })
  }
  if (combinerCount > 0) {
    rows.push({ label: 'Combiner box', qty: combinerCount, unitPrice: COMBINER_PRICE })
  }
  if (breakerCount > 0) {
    rows.push({ label: 'DC breaker / disconnect', qty: breakerCount, unitPrice: BREAKER_PRICE })
  }
  if (busbarCount > 0) {
    rows.push({ label: 'DC busbar', qty: busbarCount, unitPrice: BUSBAR_PRICE })
  }

  const total = rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0)
  return { rows, total }
}
