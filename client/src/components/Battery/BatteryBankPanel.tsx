import { useCanvasStore } from '../../store/canvas'
import { useBatteryStore } from '../../store/batteries'
import { bankElectricals, dodFor } from '../../lib/battery'
import { deviceShortLabel } from '../../lib/topology'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function BatteryBankPanel() {
  const { devices, updateDevice, selectDevice } = useCanvasStore()
  const { batteries } = useBatteryStore()

  const placedBatteries = devices.filter((d) => d.kind === 'battery')

  if (placedBatteries.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Batteries</h2>
        <p className="text-sm text-gray-400">Place batteries on the canvas to configure banks</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Batteries</h2>
      <div className="space-y-3">
        {placedBatteries.map((placed) => {
          const battery =
            placed.refId !== null ? batteries.find((b) => b.id === placed.refId) ?? null : null
          if (!battery) {
            return (
              <div key={placed.id} className="bg-gray-50 rounded p-2">
                <p className="text-sm text-gray-400">
                  {deviceShortLabel(placed)} — model not found in catalog
                </p>
              </div>
            )
          }
          const series = placed.batterySeries ?? 1
          const parallel = placed.batteryParallel ?? 1
          const bank = bankElectricals(battery, series, parallel)
          return (
            <div key={placed.id} className="bg-gray-50 rounded p-2">
              <div
                className="flex items-center gap-2 mb-2 cursor-pointer"
                onClick={() => selectDevice(placed.id)}
              >
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {battery.manufacturer} {battery.model}
                </p>
                <span className="text-xs text-gray-400 shrink-0">{deviceShortLabel(placed)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">In series (S)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={series}
                    onChange={(e) =>
                      updateDevice(placed.id, {
                        batterySeries: Math.max(1, Math.floor(Number(e.target.value) || 1))
                      })
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">In parallel (P)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={parallel}
                    onChange={(e) =>
                      updateDevice(placed.id, {
                        batteryParallel: Math.max(1, Math.floor(Number(e.target.value) || 1))
                      })
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-0.5 text-gray-500">Cells</td>
                    <td className="py-0.5 text-right font-mono">{bank.cellCount}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-0.5 text-gray-500">Bank voltage</td>
                    <td className="py-0.5 text-right font-mono">{fmt(bank.totalV)}V</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-0.5 text-gray-500">Capacity</td>
                    <td className="py-0.5 text-right font-mono">{fmt(bank.totalAh)}Ah</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-0.5 text-gray-500">Energy</td>
                    <td className="py-0.5 text-right font-mono">{fmt(bank.totalWh)}Wh</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-gray-500">
                      Usable ({Math.round(dodFor(battery) * 100)}% DoD)
                    </td>
                    <td className="py-0.5 text-right font-mono">{fmt(bank.usableWh)}Wh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
