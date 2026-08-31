import { useState } from 'react'
import { useInverterStore } from '../../store/inverters'
import { InverterEditor } from './InverterEditor'
import { Inverter } from '../../types'

export function InverterCatalog() {
  const { inverters, loading, deleteInverter } = useInverterStore()
  const [editing, setEditing] = useState<Inverter | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleDelete = async (id: number) => {
    if (confirm('Delete this inverter?')) {
      await deleteInverter(id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Inverters ({inverters.length})</h3>
        <button
          onClick={() => { setEditing(null); setShowEditor(true) }}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {loading && <p className="text-xs text-gray-400">Loading...</p>}

      {!loading && inverters.length === 0 && (
        <p className="text-xs text-gray-400">No inverters yet — add one to get started</p>
      )}

      <ul className="space-y-1">
        {inverters.map((inverter) => (
          <li
            key={inverter.id}
            className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {inverter.manufacturer} {inverter.model}
              </p>
              <p className="text-xs text-gray-500">
                {inverter.max_power_w}W &middot; {inverter.mppt_min_v}&ndash;{inverter.mppt_max_v}V MPPT
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => { setEditing(inverter); setShowEditor(true) }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(inverter.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Del
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showEditor && (
        <InverterEditor
          inverter={editing}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
