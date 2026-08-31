import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { findStrings, deviceShortLabel } from '../../lib/topology'
import { panelMap, validatePlacedInverter, COLD_TEMP_C, type CheckStatus } from '../../lib/electrical'

const STATUS_STYLES: Record<CheckStatus, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-green-500', text: 'text-green-700', label: 'OK' },
  warn: { dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Warning' },
  fail: { dot: 'bg-red-500', text: 'text-red-700', label: 'Limit exceeded' }
}

export function InverterStatus() {
  const { devices, connections, selectDevice } = useCanvasStore()
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()

  const placedInverters = devices.filter((d) => d.kind === 'inverter')
  const groups = useMemo(
    () => findStrings(devices, connections),
    [devices, connections]
  )
  const panelByPlacedId = useMemo(
    () => panelMap(devices, panels),
    [devices, panels]
  )

  if (placedInverters.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Inverters</h2>
        <p className="text-sm text-gray-400">Place an inverter on the canvas to validate MPPT limits</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Inverters</h2>
      <div className="space-y-3">
        {placedInverters.map((placed) => {
          const inverter =
            placed.refId !== null ? inverters.find((i) => i.id === placed.refId) ?? null : null
          if (!inverter) {
            return (
              <div key={placed.id} className="bg-gray-50 rounded p-2">
                <p className="text-sm text-gray-400">
                  {deviceShortLabel(placed)} — model not found in catalog
                </p>
              </div>
            )
          }
          const groupsByInput = new Map<number, (typeof groups)[number]>()
          for (const g of groups) {
            if (g.destination?.deviceId === placed.id) {
              groupsByInput.set(g.destination.input, g)
            }
          }
          const validation = validatePlacedInverter(inverter, groupsByInput, panelByPlacedId)
          return (
            <div key={placed.id} className="bg-gray-50 rounded p-2">
              <div
                className="flex items-center gap-2 mb-1 cursor-pointer"
                onClick={() => selectDevice(placed.id)}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_STYLES[validation.status].dot}`} />
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {inverter.manufacturer} {inverter.model}
                </p>
                <span className="text-xs text-gray-400 shrink-0">{deviceShortLabel(placed)}</span>
              </div>
              <ul className="space-y-1">
                {validation.checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 bg-white rounded px-2 py-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLES[c.status].dot}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">{c.label}</p>
                      <p className="text-xs font-mono text-gray-500">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">Voc checked at {COLD_TEMP_C}&deg;C cold condition</p>
    </div>
  )
}
