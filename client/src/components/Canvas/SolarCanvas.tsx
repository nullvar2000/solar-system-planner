import { Stage, Layer, Line } from 'react-konva'
import { useCallback, useState, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { PanelNode, SCALE, getTerminalPosition } from './PanelNode'
import { ConnectionLine } from './ConnectionLine'
import { canConnect } from '../../lib/topology'

export function SolarCanvas() {
  const {
    placedPanels,
    placePanel,
    activePanelTypeId,
    selectPanel,
    connections,
    pendingConnection,
    hoveredTerminal,
    selectedConnectionId,
    mousePos,
    setMousePos,
    selectConnection
  } = useCanvasStore()
  const { panels } = usePanelStore()
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      const sidebar = 288
      const rightPanel = 256
      const header = 48
      setSize({
        width: window.innerWidth - sidebar - rightPanel,
        height: window.innerHeight - header
      })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const handleStageClick = useCallback(
    (e: any) => {
      const stage = e.target.getStage()
      if (e.target === stage || e.target.name() === 'background') {
        selectPanel(null)
        selectConnection(null)
        if (activePanelTypeId) {
          const panel = panels.find((p) => p.id === activePanelTypeId)
          const pos = stage.getPointerPosition()
          if (panel && pos) {
            placePanel(activePanelTypeId, pos.x, pos.y, panel.width * SCALE, panel.height * SCALE)
          }
        }
      }
    },
    [activePanelTypeId, placePanel, selectPanel, selectConnection, panels]
  )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (e.key === 'Escape') {
      useCanvasStore.getState().setPendingConnection(null)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedPanelId, selectedConnectionId, removePanel, removeConnection } =
        useCanvasStore.getState()
      if (selectedConnectionId) {
        removeConnection(selectedConnectionId)
      } else if (selectedPanelId) {
        removePanel(selectedPanelId)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleMouseMove = useCallback(
    (e: any) => {
      const pos = e.target.getStage().getPointerPosition()
      if (pos) setMousePos(pos)
    },
    [setMousePos]
  )

  let preview: { x: number; y: number } | null = null
  let previewColor: string | null = null
  if (pendingConnection) {
    const fromPlaced = placedPanels.find((p) => p.id === pendingConnection.panelId)
    if (fromPlaced) {
      preview = getTerminalPosition(fromPlaced, pendingConnection.terminal)
      previewColor = pendingConnection.terminal === 'positive' ? '#ef4444' : '#3b82f6'
      if (hoveredTerminal) {
        previewColor = canConnect(pendingConnection, hoveredTerminal, connections)
          ? '#22c55e'
          : '#facc15'
      }
    }
  }

  return (
    <div className="w-full h-full bg-gray-50 relative">
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
      >
        <Layer>
          <rect
            name="background"
            width={size.width}
            height={size.height}
            fill="transparent"
          />
          {placedPanels.map((placed) => (
            <PanelNode
              key={placed.id}
              placed={placed}
              panel={panels.find((p) => p.id === placed.panelId)}
            />
          ))}
          {connections.map((c) => (
            <ConnectionLine
              key={c.id}
              connection={c}
              placedPanels={placedPanels}
              isSelected={selectedConnectionId === c.id}
              onSelect={(id) => {
                selectPanel(null)
                selectConnection(id)
              }}
            />
          ))}
          {pendingConnection && preview && mousePos && previewColor && (
            <Line
              points={[preview.x, preview.y, mousePos.x, mousePos.y]}
              stroke={previewColor}
              strokeWidth={2}
              dash={[6, 4]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      {activePanelTypeId && placedPanels.length === 0 && !pendingConnection && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm">Click anywhere on the canvas to place a panel</p>
        </div>
      )}
      {pendingConnection && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
          Click a free terminal to connect the wire — Esc to cancel
        </div>
      )}
    </div>
  )
}
