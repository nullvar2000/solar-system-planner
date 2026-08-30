import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { analyzeStrings } from '../../lib/topology'
import {
  computeArrayElectricals,
  computeGroupElectricals,
  panelMap
} from '../../lib/electrical'

const fmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function ElectricalReadout() {
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
  const totals = useMemo(
    () => computeArrayElectricals(groups, panelByPlacedId),
    [groups, panelByPlacedId]
  )

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Electrical</h2>
      {placedPanels.length === 0 ? (
        <p className="text-sm text-gray-400">Place panels to see electrical readout</p>
      ) : (
        <>
          <ul className="space-y-2">
            {groups.map((g, i) => {
              const e = computeGroupElectricals(g, panelByPlacedId)
              return (
                <li key={i} className="bg-gray-50 rounded p-2">
                  <p className="text-sm font-semibold text-gray-800">Group {i + 1}</p>
                  <p className="text-xs font-mono text-gray-600">
                    {fmt(e.v)}V · {fmt(e.a)}A · {fmt(e.w)}W
                  </p>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 bg-amber-50 rounded p-3">
            <p className="text-xs font-semibold text-amber-800 uppercase">Total Array</p>
            <p className="text-sm font-mono text-amber-900">
              {fmt(totals.v)}V · {fmt(totals.a)}A · {fmt(totals.w)}W
            </p>
          </div>
        </>
      )}
    </div>
  )
}
