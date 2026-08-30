import { useState } from 'react'
import { useBatteryStore } from '../../store/batteries'
import { useCanvasStore } from '../../store/canvas'
import { BatteryEditor } from './BatteryEditor'
import { Battery } from '../../types'

export function BatteryCatalog() {
  const { batteries, loading, deleteBattery } = useBatteryStore()
  const { selectedBatteryId, selectBattery } = useCanvasStore()
  const [editing, setEditing] = useState<Battery | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleDelete = async (id: number) => {
    if (confirm('Delete this battery?')) {
      if (selectedBatteryId === id) selectBattery(null)
      await deleteBattery(id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Batteries ({batteries.length})</h3>
        <button
          onClick={() => { setEditing(null); setShowEditor(true) }}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {loading && <p className="text-xs text-gray-400">Loading...</p>}

      {!loading && batteries.length === 0 && (
        <p className="text-xs text-gray-400">No batteries yet — add one to get started</p>
      )}

      <ul className="space-y-1">
        {batteries.map((battery) => (
          <li
            key={battery.id}
            className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {battery.manufacturer} {battery.model}
              </p>
              <p className="text-xs text-gray-500">
                {battery.nominal_v}V &middot; {battery.capacity_ah}Ah &middot; {battery.chemistry}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => { setEditing(battery); setShowEditor(true) }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(battery.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Del
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showEditor && (
        <BatteryEditor
          battery={editing}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
