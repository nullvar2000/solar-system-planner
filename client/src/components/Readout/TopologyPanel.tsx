import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { findStrings, findTopologyWarnings, deviceShortLabel } from '../../lib/topology'
import { panelMap } from '../../lib/electrical'

export function TopologyPanel() {
  const { devices, connections } = useCanvasStore()
  const { panels } = usePanelStore()

  const panelDevices = devices.filter((d) => d.kind === 'panel')
  const groups = useMemo(
    () => findStrings(devices, connections),
    [devices, connections]
  )
  const warnings = useMemo(() => {
    if (panelDevices.length === 0) return []
    return findTopologyWarnings(devices, connections, panelMap(devices, panels))
  }, [devices, connections, panels, panelDevices.length])

  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices])

  const destLabel = (g: (typeof groups)[number]) => {
    if (!g.destination) return null
    const inv = deviceById.get(g.destination.deviceId)
    if (!inv) return null
    return `${deviceShortLabel(inv)} · MPPT ${g.destination.input + 1}`
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Strings</h2>
      {panelDevices.length === 0 ? (
        <p className="text-sm text-gray-400">
          Place panels and connect their terminals to build strings
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {groups.map((g, i) => {
              const dest = destLabel(g)
              return (
                <li key={i} className="bg-gray-50 rounded p-2">
                  <p className="text-sm font-semibold text-gray-800">
                    Group {i + 1}
                    {dest && (
                      <span className="ml-1 text-xs font-normal text-blue-600">→ {dest}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {g.seriesCount === 1 && g.parallelCount === 1
                      ? '1 panel (standalone)'
                      : g.parallelCount === 1
                        ? `${g.seriesCount} in series`
                        : `${g.seriesCount} in series × ${g.parallelCount} in parallel (${g.totalPanels} panels)`}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            {panelDevices.length} panel{panelDevices.length === 1 ? '' : 's'} ·{' '}
            {connections.length} wire{connections.length === 1 ? '' : 's'}
          </p>
        </>
      )}

      {warnings.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-amber-700 uppercase mb-1">Warnings</h3>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
