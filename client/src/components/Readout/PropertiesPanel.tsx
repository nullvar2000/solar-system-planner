import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { SCALE } from '../Canvas/PanelNode'

export function PropertiesPanel() {
  const {
    selectedPanelId,
    selectedConnectionId,
    placedPanels,
    connections,
    removePanel,
    removeConnection,
    clearCanvas
  } = useCanvasStore()
  const { panels } = usePanelStore()

  const conn = connections.find((c) => c.id === selectedConnectionId)
  if (conn) {
    const nameOf = (placedId: string) => {
      const placed = placedPanels.find((p) => p.id === placedId)
      const panel = placed ? panels.find((p) => p.id === placed.panelId) : null
      return panel ? panel.model : placedId
    }
    const label = (t: string) => (t === 'positive' ? '+' : '−')
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Wire</h2>
        <div className="bg-gray-50 rounded p-3 mb-3 flex items-center gap-2 flex-wrap">
          <span
            className={`w-3 h-3 rounded-full shrink-0 ${
              conn.fromTerminal === 'positive' ? 'bg-red-500' : 'bg-blue-500'
            }`}
          />
          <p className="text-sm font-semibold text-gray-800">
            {nameOf(conn.fromPanelId)} {label(conn.fromTerminal)}
          </p>
          <span className="text-gray-400">—</span>
          <p className="text-sm font-semibold text-gray-800">
            {nameOf(conn.toPanelId)} {label(conn.toTerminal)}
          </p>
        </div>
        <button
          onClick={() => removeConnection(conn.id)}
          className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete Wire
        </button>
        <p className="mt-2 text-xs text-gray-400 text-center">or press Delete key</p>
      </div>
    )
  }

  const placed = placedPanels.find((p) => p.id === selectedPanelId)
  const panel = placed ? panels.find((p) => p.id === placed.panelId) : null

  if (!placed || !panel) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Properties</h2>
        <p className="text-sm text-gray-400">Select a panel on the canvas to view its properties</p>
        {placedPanels.length > 0 && (
          <button
            onClick={clearCanvas}
            className="mt-4 text-xs text-red-600 hover:text-red-800"
          >
            Clear Canvas ({placedPanels.length} panels)
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Properties</h2>
      <div className="bg-blue-50 rounded p-3 mb-3">
        <p className="font-semibold text-blue-900">{panel.manufacturer} {panel.model}</p>
        <p className="text-xs text-blue-700">{panel.pmax}W</p>
      </div>

      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Vmp</td>
            <td className="py-1 text-right font-mono">{panel.vmp}V</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Imp</td>
            <td className="py-1 text-right font-mono">{panel.imp}A</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Voc</td>
            <td className="py-1 text-right font-mono">{panel.voc}V</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Isc</td>
            <td className="py-1 text-right font-mono">{panel.isc}A</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Dimensions</td>
            <td className="py-1 text-right font-mono">{panel.width}" x {panel.height}"</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Price</td>
            <td className="py-1 text-right font-mono">${panel.price}</td>
          </tr>
          <tr className="border-b">
            <td className="py-1 text-gray-500">Canvas Size</td>
            <td className="py-1 text-right font-mono">
              {(placed.width / SCALE).toFixed(1)}" x {(placed.height / SCALE).toFixed(1)}"
            </td>
          </tr>
          <tr>
            <td className="py-1 text-gray-500">Position</td>
            <td className="py-1 text-right font-mono">{Math.round(placed.x)}, {Math.round(placed.y)}</td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={() => removePanel(placed.id)}
        className="mt-4 w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
      >
        Delete Panel
      </button>
      <p className="mt-2 text-xs text-gray-400 text-center">or press Delete key</p>
    </div>
  )
}
