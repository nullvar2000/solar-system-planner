import { useState, useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { analyzeStrings } from '../../lib/topology'
import {
  calculateWireGauge,
  computeArrayElectricals,
  panelMap
} from '../../lib/electrical'

export function WireGaugePanel() {
  const { placedPanels, connections } = useCanvasStore()
  const { panels } = usePanelStore()

  const groups = useMemo(
    () => analyzeStrings(placedPanels, connections),
    [placedPanels, connections]
  )
  const panelByPlacedId = useMemo(
    () => panelMap(placedPanels, panels),
    [placedPanels, panels]
  )
  const array = useMemo(
    () => computeArrayElectricals(groups, panelByPlacedId),
    [groups, panelByPlacedId]
  )

  const [current, setCurrent] = useState('')
  const [distance, setDistance] = useState('50')
  const [voltage, setVoltage] = useState('')
  const [maxDrop, setMaxDrop] = useState('3')

  const effCurrent = current === '' ? array.a : parseFloat(current)
  const effVoltage = voltage === '' ? array.v : parseFloat(voltage)
  const effDistance = parseFloat(distance)
  const effMaxDrop = parseFloat(maxDrop)

  const valid =
    effCurrent > 0 && effVoltage > 0 && effDistance > 0 && effMaxDrop > 0

  const result = valid
    ? calculateWireGauge(effCurrent, effDistance, effVoltage, effMaxDrop)
    : null

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Wire Gauge</h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Current (A)</label>
          <input
            type="number"
            step="0.1"
            value={current}
            placeholder={array.a > 0 ? array.a.toFixed(1) : '0'}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Voltage (V)</label>
          <input
            type="number"
            step="0.1"
            value={voltage}
            placeholder={array.v > 0 ? array.v.toFixed(1) : '0'}
            onChange={(e) => setVoltage(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Distance (ft, one way)</label>
          <input
            type="number"
            step="1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max drop (%)</label>
          <input
            type="number"
            step="0.5"
            value={maxDrop}
            onChange={(e) => setMaxDrop(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Blank current/voltage uses array values
      </p>

      {result ? (
        <div className={`rounded p-3 ${result.gauge ? 'bg-green-50' : 'bg-red-50'}`}>
          {result.gauge ? (
            <>
              <p className="text-sm font-semibold text-green-800">{result.gauge}</p>
              <p className="text-xs font-mono text-green-700">
                {result.dropV.toFixed(2)}V drop ({result.dropPct.toFixed(1)}%)
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-red-700">
              Exceeds 500 kcmil: {result.dropV.toFixed(1)}V drop ({result.dropPct.toFixed(0)}%)
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Enter valid values to calculate</p>
      )}
    </div>
  )
}
