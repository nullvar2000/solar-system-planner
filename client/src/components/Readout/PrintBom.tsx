import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { useBatteryStore } from '../../store/batteries'
import { useProjectStore } from '../../store/projects'
import { computeBom } from '../../lib/bom'

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export function PrintBom() {
  const {
    placedPanels,
    selectedInverterId,
    selectedBatteryId,
    batterySeries,
    batteryParallel
  } = useCanvasStore()
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()
  const { batteries } = useBatteryStore()
  const { projectName } = useProjectStore()

  const inverter = inverters.find((i) => i.id === selectedInverterId) ?? null
  const battery = batteries.find((b) => b.id === selectedBatteryId) ?? null

  const { rows, total } = useMemo(
    () => computeBom(placedPanels, panels, inverter, battery, batterySeries, batteryParallel),
    [placedPanels, panels, inverter, battery, batterySeries, batteryParallel]
  )

  return (
    <div className="hidden print:block p-8 text-black">
      <h1 className="text-xl font-bold">Bill of Materials</h1>
      <p className="text-sm mt-1">
        {projectName.trim() || 'Untitled design'} &middot; {new Date().toLocaleDateString()}
      </p>

      <table className="w-full text-sm mt-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2 text-right">Qty</th>
            <th className="py-1 pr-2 text-right">Unit Price</th>
            <th className="py-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-400">
              <td className="py-1 pr-2">{r.label}</td>
              <td className="py-1 pr-2 text-right">{r.qty}</td>
              <td className="py-1 pr-2 text-right">{money(r.unitPrice)}</td>
              <td className="py-1 text-right">{money(r.qty * r.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <div className="text-base font-bold">Total: {money(total)}</div>
      </div>
    </div>
  )
}
