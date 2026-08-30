import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { useBatteryStore } from '../../store/batteries'
import { bankElectricals, dodFor } from '../../lib/battery'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function BatteryBankPanel() {
  const {
    selectedBatteryId,
    selectBattery,
    batterySeries,
    batteryParallel,
    setBatteryWiring
  } = useCanvasStore()
  const { batteries } = useBatteryStore()

  const battery = batteries.find((b) => b.id === selectedBatteryId) ?? null
  const bank = useMemo(
    () => (battery ? bankElectricals(battery, batterySeries, batteryParallel) : null),
    [battery, batterySeries, batteryParallel]
  )

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Battery Bank</h2>

      <select
        value={selectedBatteryId ?? ''}
        onChange={(e) => selectBattery(e.target.value ? Number(e.target.value) : null)}
        className="w-full border rounded px-2 py-2 text-sm mb-3"
      >
        <option value="">No battery selected</option>
        {batteries.map((b) => (
          <option key={b.id} value={b.id}>
            {b.manufacturer} {b.model} ({b.nominal_v}V {b.capacity_ah}Ah)
          </option>
        ))}
      </select>

      {!battery ? (
        <p className="text-sm text-gray-400">Select a battery to configure the bank</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">In series (S)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={batterySeries}
                onChange={(e) => setBatteryWiring(parseFloat(e.target.value) || 1, batteryParallel)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">In parallel (P)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={batteryParallel}
                onChange={(e) => setBatteryWiring(batterySeries, parseFloat(e.target.value) || 1)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {bank && (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-1 text-gray-500">Cells</td>
                  <td className="py-1 text-right font-mono">{bank.cellCount}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1 text-gray-500">Bank voltage</td>
                  <td className="py-1 text-right font-mono">{fmt(bank.totalV)}V</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1 text-gray-500">Capacity</td>
                  <td className="py-1 text-right font-mono">{fmt(bank.totalAh)}Ah</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1 text-gray-500">Energy</td>
                  <td className="py-1 text-right font-mono">{fmt(bank.totalWh)}Wh</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-500">
                    Usable ({Math.round(dodFor(battery) * 100)}% DoD)
                  </td>
                  <td className="py-1 text-right font-mono">{fmt(bank.usableWh)}Wh</td>
                </tr>
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
