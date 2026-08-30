import { Battery, Inverter, Panel, PlacedPanel } from '../types'

export interface BomRow {
  label: string
  qty: number
  unitPrice: number
}

export function computeBom(
  placedPanels: PlacedPanel[],
  panels: Panel[],
  inverter: Inverter | null,
  battery: Battery | null,
  batterySeries: number,
  batteryParallel: number
): { rows: BomRow[]; total: number } {
  const counts = new Map<number, number>()
  for (const p of placedPanels) {
    counts.set(p.panelId, (counts.get(p.panelId) ?? 0) + 1)
  }

  const rows: BomRow[] = []
  for (const [panelId, qty] of counts) {
    const panel = panels.find((p) => p.id === panelId)
    rows.push({
      label: `${panel?.manufacturer ?? 'Unknown'} ${panel?.model ?? ''} panel`,
      qty,
      unitPrice: panel?.price ?? 0
    })
  }
  if (inverter) {
    rows.push({
      label: `${inverter.manufacturer} ${inverter.model} inverter`,
      qty: 1,
      unitPrice: inverter.price
    })
  }
  if (battery) {
    rows.push({
      label: `${battery.manufacturer} ${battery.model} battery`,
      qty: batterySeries * batteryParallel,
      unitPrice: battery.price
    })
  }

  const total = rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0)
  return { rows, total }
}
