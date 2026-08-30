import { useState, useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { estimateProduction } from '../../lib/electrical'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function ProductionPanel() {
  const { placedPanels } = useCanvasStore()
  const { panels } = usePanelStore()

  const [peakSunHours, setPeakSunHours] = useState('5')
  const [ambient, setAmbient] = useState('25')

  const est = useMemo(() => {
    const psh = parseFloat(peakSunHours)
    const amb = parseFloat(ambient)
    if (!Number.isFinite(psh) || !Number.isFinite(amb) || psh <= 0) return null
    return estimateProduction(placedPanels, panels, psh, amb)
  }, [placedPanels, panels, peakSunHours, ambient])

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Production</h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Peak sun hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={peakSunHours}
            onChange={(e) => setPeakSunHours(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ambient temp (&deg;C)</label>
          <input
            type="number"
            step="1"
            value={ambient}
            onChange={(e) => setAmbient(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {placedPanels.length === 0 ? (
        <p className="text-sm text-gray-400">Place panels to estimate production</p>
      ) : est ? (
        <div className="space-y-2">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">
              Cell temp {fmt(est.cellTempC)}&deg;C &middot; derating{' '}
              {(est.derating * 100).toFixed(1)}%
            </p>
            <p className="text-xs font-mono text-gray-600">
              {fmt(est.deratedW)}W derated array
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-1 text-gray-500">Daily</td>
                <td className="py-1 text-right font-mono">{fmt(est.dailyKwh)} kWh</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 text-gray-500">Monthly</td>
                <td className="py-1 text-right font-mono">{fmt(est.monthlyKwh)} kWh</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500">Annual</td>
                <td className="py-1 text-right font-mono">{fmt(est.annualKwh)} kWh</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Enter peak sun hours to estimate</p>
      )}
    </div>
  )
}
