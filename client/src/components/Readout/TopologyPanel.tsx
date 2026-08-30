import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { analyzeStrings, findTopologyWarnings } from '../../lib/topology'
import { panelMap } from '../../lib/electrical'

export function TopologyPanel() {
  const { placedPanels, connections } = useCanvasStore()
  const { panels } = usePanelStore()

  const strings = useMemo(
    () => analyzeStrings(placedPanels, connections),
    [placedPanels, connections]
  )
  const warnings = useMemo(() => {
    if (placedPanels.length === 0) return []
    return findTopologyWarnings(placedPanels, connections, panelMap(placedPanels, panels))
  }, [placedPanels, connections, panels])

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Strings</h2>
      {placedPanels.length === 0 ? (
        <p className="text-sm text-gray-400">
          Place panels and connect their terminals to build strings
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {strings.map((s, i) => (
              <li key={i} className="bg-gray-50 rounded p-2">
                <p className="text-sm font-semibold text-gray-800">Group {i + 1}</p>
                <p className="text-xs text-gray-500">
                  {s.seriesCount === 1 && s.parallelCount === 1
                    ? '1 panel (standalone)'
                    : s.parallelCount === 1
                      ? `${s.seriesCount} in series`
                      : `${s.seriesCount} in series × ${s.parallelCount} in parallel (${s.totalPanels} panels)`}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            {placedPanels.length} panel{placedPanels.length === 1 ? '' : 's'} ·{' '}
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
