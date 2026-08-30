import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { useBatteryStore } from '../../store/batteries'
import { computeBom } from '../../lib/bom'

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export function BomPanel() {
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

  const inverter = inverters.find((i) => i.id === selectedInverterId) ?? null
  const battery = batteries.find((b) => b.id === selectedBatteryId) ?? null

  const { rows, total } = useMemo(
    () => computeBom(placedPanels, panels, inverter, battery, batterySeries, batteryParallel),
    [placedPanels, panels, inverter, battery, batterySeries, batteryParallel]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">Bill of Materials</h2>
        {rows.length > 0 && (
          <button
            onClick={() => window.print()}
            className="text-xs text-blue-600 hover:text-blue-800 print:hidden"
          >
            Print
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">
          Place panels and assign equipment to generate a BOM
        </p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-left font-medium py-1">Item</th>
                <th className="text-right font-medium py-1">Qty</th>
                <th className="text-right font-medium py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="py-1.5 text-gray-700 pr-2">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{r.qty}</td>
                  <td className="py-1.5 text-right font-mono">{money(r.qty * r.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 bg-gray-100 rounded p-2 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-sm font-mono font-semibold text-gray-900">{money(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
