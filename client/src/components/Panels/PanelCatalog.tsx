import { useState } from 'react'
import { usePanelStore } from '../../store/panels'
import { PanelEditor } from './PanelEditor'
import { Panel } from '../../types'

export function PanelCatalog() {
  const { panels, loading, deletePanel } = usePanelStore()
  const [editing, setEditing] = useState<Panel | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleDelete = async (id: number) => {
    if (confirm('Delete this panel?')) {
      await deletePanel(id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Panels ({panels.length})</h3>
        <button
          onClick={() => { setEditing(null); setShowEditor(true) }}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {loading && <p className="text-xs text-gray-400">Loading...</p>}

      {!loading && panels.length === 0 && (
        <p className="text-xs text-gray-400">No panels yet — add one to get started</p>
      )}

      <ul className="space-y-1">
        {panels.map((panel) => (
          <li
            key={panel.id}
            className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {panel.manufacturer} {panel.model}
              </p>
              <p className="text-xs text-gray-500">
                {panel.pmax}W &middot; {panel.vmp}V &middot; {panel.imp}A
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => { setEditing(panel); setShowEditor(true) }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(panel.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Del
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showEditor && (
        <PanelEditor
          panel={editing}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
