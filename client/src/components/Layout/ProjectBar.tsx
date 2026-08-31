import { useState } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { useProjectStore } from '../../store/projects'
import { ProjectConfig } from '../../types'

export function ProjectBar() {
  const { devices, connections, loads, pxPerFt, restoreState } = useCanvasStore()
  const {
    projects,
    currentProjectId,
    projectName,
    setProjectName,
    saveProject,
    loadProject,
    deleteProject,
    saving,
    error
  } = useProjectStore()
  const [loadId, setLoadId] = useState('')

  const config: ProjectConfig = {
    version: 2,
    devices,
    connections,
    loads,
    pxPerFt
  }

  const handleSave = async () => {
    if (!projectName.trim()) return
    await saveProject(config)
  }

  const handleLoad = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value)
    setLoadId('')
    if (!id) return
    const cfg = await loadProject(id)
    if (cfg) restoreState(cfg)
  }

  const handleDelete = async () => {
    if (!currentProjectId) return
    if (!confirm('Delete this project?')) return
    await deleteProject(currentProjectId)
  }

  const handleExport = () => {
    const name = projectName.trim() || 'solar-design'
    const payload = {
      app: 'solar-system-planner',
      version: 2,
      name,
      exportedAt: new Date().toISOString(),
      config
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^\w-]+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      {error && <span className="text-xs text-red-400 truncate">{error}</span>}
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder={currentProjectId ? '' : 'Project name…'}
        className="w-36 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={saving || !projectName.trim()}
        className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : currentProjectId ? 'Update' : 'Save'}
      </button>
      <button
        onClick={handleExport}
        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
        title="Download design as JSON file"
      >
        Export
      </button>
      <select
        value={loadId}
        onChange={handleLoad}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs max-w-36"
      >
        <option value="">Load…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleDelete}
        disabled={!currentProjectId}
        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-red-600 disabled:opacity-40"
      >
        Delete
      </button>
      {currentProjectId && (
        <span className="text-xs text-gray-500 hidden xl:inline">
          #{currentProjectId}
        </span>
      )}
    </div>
  )
}
