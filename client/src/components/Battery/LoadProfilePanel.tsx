import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { useBatteryStore } from '../../store/batteries'
import { bankElectricals } from '../../lib/battery'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function LoadProfilePanel() {
  const { loads, addLoad, updateLoad, removeLoad, selectedBatteryId, batterySeries, batteryParallel } =
    useCanvasStore()
  const { batteries } = useBatteryStore()

  const dailyKwh = useMemo(
    () => loads.reduce((sum, l) => sum + l.dailyKwh, 0),
    [loads]
  )

  const battery = batteries.find((b) => b.id === selectedBatteryId) ?? null
  const autonomyDays = useMemo(() => {
    if (!battery || dailyKwh <= 0) return null
    const bank = bankElectricals(battery, batterySeries, batteryParallel)
    return bank.usableWh / (dailyKwh * 1000)
  }, [battery, dailyKwh, batterySeries, batteryParallel])

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Load Profile</h2>

      {loads.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No loads defined</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {loads.map((load) => (
            <li key={load.id} className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1.5">
              <input
                type="text"
                value={load.name}
                onChange={(e) => updateLoad(load.id, e.target.value, load.dailyKwh)}
                className="flex-1 min-w-0 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                value={load.dailyKwh}
                onChange={(e) => updateLoad(load.id, load.name, parseFloat(e.target.value) || 0)}
                className="w-16 border rounded px-1 py-0.5 text-sm text-right font-mono"
              />
              <span className="text-xs text-gray-400">kWh</span>
              <button
                onClick={() => removeLoad(load.id)}
                className="text-xs text-red-600 hover:text-red-800 ml-1"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => addLoad(`Load ${loads.length + 1}`, 1)}
        className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 mb-3"
      >
        + Add Load
      </button>

      <div className="bg-gray-50 rounded p-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Daily total</span>
          <span className="font-mono">{fmt(dailyKwh)} kWh</span>
        </div>
        {battery && dailyKwh > 0 && autonomyDays !== null && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Autonomy</span>
            <span
              className={`font-mono font-semibold ${
                autonomyDays < 1 ? 'text-red-600' : autonomyDays < 2 ? 'text-amber-600' : 'text-green-700'
              }`}
            >
              {autonomyDays >= 10 ? autonomyDays.toFixed(0) : fmt(autonomyDays)} days
            </span>
          </div>
        )}
        {battery && dailyKwh > 0 && autonomyDays !== null && autonomyDays < 1 && (
          <p className="text-xs text-red-600 mt-1">
            Less than one day of autonomy — add batteries or reduce loads
          </p>
        )}
        {!battery && dailyKwh > 0 && (
          <p className="text-xs text-gray-400 mt-1">Select a battery bank to calculate autonomy</p>
        )}
      </div>
    </div>
  )
}
