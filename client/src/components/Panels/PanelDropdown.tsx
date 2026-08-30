import { usePanelStore } from '../../store/panels'
import { useCanvasStore } from '../../store/canvas'

export function PanelDropdown() {
  const { panels } = usePanelStore()
  const { activePanelTypeId, setActivePanelType } = useCanvasStore()

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Place Panel</h3>
      <select
        value={activePanelTypeId ?? ''}
        onChange={(e) => {
          const val = e.target.value
          setActivePanelType(val ? Number(val) : null)
        }}
        className="w-full border rounded px-3 py-2 text-sm bg-white"
      >
        <option value="">Select a panel...</option>
        {panels.map((p) => (
          <option key={p.id} value={p.id}>
            {p.manufacturer} {p.model} ({p.pmax}W)
          </option>
        ))}
      </select>
      {activePanelTypeId && (
        <p className="text-xs text-green-600">
          Click on the canvas to place
        </p>
      )}
    </div>
  )
}
