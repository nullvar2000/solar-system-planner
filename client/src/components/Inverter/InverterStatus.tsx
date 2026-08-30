import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { analyzeStrings } from '../../lib/topology'
import { panelMap, validateInverter, COLD_TEMP_C, type CheckStatus } from '../../lib/electrical'

const STATUS_STYLES: Record<CheckStatus, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-green-500', text: 'text-green-700', label: 'OK' },
  warn: { dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Warning' },
  fail: { dot: 'bg-red-500', text: 'text-red-700', label: 'Limit exceeded' }
}

export function InverterStatus() {
  const { placedPanels, connections, selectedInverterId, selectInverter } = useCanvasStore()
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()

  const groups = useMemo(
    () => analyzeStrings(placedPanels, connections),
    [placedPanels, connections]
  )
  const panelByPlacedId = useMemo(
    () => panelMap(placedPanels, panels),
    [placedPanels, panels]
  )

  const inverter = inverters.find((i) => i.id === selectedInverterId) ?? null
  const validation = useMemo(
    () => (inverter ? validateInverter(inverter, groups, panelByPlacedId) : null),
    [inverter, groups, panelByPlacedId]
  )

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Inverter</h2>

      <select
        value={selectedInverterId ?? ''}
        onChange={(e) => selectInverter(e.target.value ? Number(e.target.value) : null)}
        className="w-full border rounded px-2 py-2 text-sm mb-3"
      >
        <option value="">None assigned</option>
        {inverters.map((i) => (
          <option key={i.id} value={i.id}>
            {i.manufacturer} {i.model} ({i.max_power_w}W)
          </option>
        ))}
      </select>

      {!inverter ? (
        <p className="text-sm text-gray-400">Assign an inverter to validate MPPT limits</p>
      ) : placedPanels.length === 0 ? (
        <p className="text-sm text-gray-400">Place panels to validate against this inverter</p>
      ) : validation ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full shrink-0 ${STATUS_STYLES[validation.status].dot}`} />
            <p className={`text-sm font-semibold ${STATUS_STYLES[validation.status].text}`}>
              {STATUS_STYLES[validation.status].label}
            </p>
          </div>
          <ul className="space-y-1">
            {validation.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLES[c.status].dot}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700">{c.label}</p>
                  <p className="text-xs font-mono text-gray-500">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Voc checked at {COLD_TEMP_C}&deg;C cold condition
          </p>
        </>
      ) : null}
    </div>
  )
}
