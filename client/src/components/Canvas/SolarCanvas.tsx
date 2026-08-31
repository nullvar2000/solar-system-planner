import { Line, Layer, Stage } from 'react-konva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { useBatteryStore } from '../../store/batteries'
import { DeviceNode } from './DeviceNode'
import { ConnectionLine } from './ConnectionLine'
import {
  DEVICE_SIZES,
  GRID_PX,
  SCALE,
  combinerWidth,
  getTerminalPosition,
  terminalPolarity
} from '../../lib/terminals'

const MIN_SCALE = 0.25
const MAX_SCALE = 4

interface ViewState {
  x: number
  y: number
  scale: number
}

export function SolarCanvas() {
  const {
    devices,
    connections,
    selectedConnectionId,
    activePlacement,
    pendingConnection,
    selectDevice,
    selectConnection,
    setMousePos,
    mousePos
  } = useCanvasStore()
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()
  const { batteries } = useBatteryStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [view, setView] = useState<ViewState>({ x: 80, y: 60, scale: 1 })
  const panRef = useRef<{ startPointer: { x: number; y: number }; startView: ViewState; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }
    if (e.key === 'Escape') {
      const s = useCanvasStore.getState()
      if (s.pendingConnection) s.setPendingConnection(null)
      else if (s.activePlacement) s.setActivePlacement(null)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedDeviceId: selDev, selectedConnectionId: selConn, removeDevice, removeConnection } =
        useCanvasStore.getState()
      if (selConn) removeConnection(selConn)
      else if (selDev) removeDevice(selDev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const isBackground = (e: any) => {
    const stage = stageRef.current
    return !!stage && (e.target === stage || e.target.name() === 'background')
  }

  const toWorld = (pointer: { x: number; y: number }) => ({
    x: (pointer.x - view.x) / view.scale,
    y: (pointer.y - view.y) / view.scale
  })

  const handleWheel = (e: any) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) return
    setView((v) => {
      const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
      if (scale === v.scale) return v
      const wx = (pointer.x - v.x) / v.scale
      const wy = (pointer.y - v.y) / v.scale
      return { scale, x: pointer.x - wx * scale, y: pointer.y - wy * scale }
    })
  }

  const handleMouseDown = (e: any) => {
    if (!isBackground(e)) return
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    panRef.current = { startPointer: pointer, startView: { x: view.x, y: view.y, scale: view.scale }, moved: false }
  }

  const handleMouseMove = () => {
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    const pan = panRef.current
    if (pan) {
      const dx = pointer.x - pan.startPointer.x
      const dy = pointer.y - pan.startPointer.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pan.moved = true
      if (pan.moved) {
        setView((v) => ({ ...v, x: pan.startView.x + dx, y: pan.startView.y + dy }))
        return
      }
    }
    setMousePos(toWorld(pointer))
  }

  const handleMouseUp = () => {
    if (panRef.current?.moved) suppressClickRef.current = true
    panRef.current = null
  }

  const handleMouseLeave = () => {
    panRef.current = null
    setMousePos(null)
  }

  const placementSize = (kind: string, refId: number | null) => {
    switch (kind) {
      case 'panel': {
        const panel = refId !== null ? panels.find((p) => p.id === refId) : null
        if (!panel) return null
        return { width: panel.width * SCALE, height: panel.height * SCALE }
      }
      case 'combiner':
        return { width: combinerWidth(4), height: DEVICE_SIZES.combiner.height }
      default:
        return DEVICE_SIZES[kind as keyof typeof DEVICE_SIZES]
    }
  }

  const handleStageClick = (e: any) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!isBackground(e)) return
    const s = useCanvasStore.getState()
    if (s.pendingConnection) {
      s.setPendingConnection(null)
      return
    }
    if (!s.activePlacement) {
      s.selectDevice(null)
      s.selectConnection(null)
      return
    }
    const { activePlacement: placement } = s
    const sz = placementSize(placement.kind, placement.refId)
    if (!sz) {
      s.setActivePlacement(null)
      return
    }
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    const world = toWorld(pointer)
    const x = Math.round(world.x / GRID_PX) * GRID_PX
    const y = Math.round(world.y / GRID_PX) * GRID_PX
    s.placeDevice(placement.kind, placement.refId, x, y, sz.width, sz.height)
  }

  // Draw the grid in screen space (not inside the scaled layer) so lines
  // stay crisp, perfectly parallel, and aligned to whole pixels.
  const gridPoints = useMemo(() => {
    const base = GRID_PX * view.scale
    const step = base < 8 ? base * Math.ceil(8 / base) : base
    const points: number[] = []
    for (let x = ((view.x % step) + step) % step; x <= size.width; x += step) {
      const px = Math.round(x) + 0.5
      points.push(px, 0, px, size.height)
    }
    for (let y = ((view.y % step) + step) % step; y <= size.height; y += step) {
      const py = Math.round(y) + 0.5
      points.push(0, py, size.width, py)
    }
    return points
  }, [view, size])

  const preview = useMemo(() => {
    if (!pendingConnection || !mousePos) return null
    const device = devices.find((d) => d.id === pendingConnection.deviceId)
    if (!device) return null
    const inverter =
      device.kind === 'inverter' && device.refId !== null
        ? inverters.find((i) => i.id === device.refId) ?? null
        : null
    const from = getTerminalPosition(device, pendingConnection.terminal, inverter)
    if (!from) return null
    const color =
      terminalPolarity(device, pendingConnection.terminal) === 'neg' ? '#3b82f6' : '#ef4444'
    return { from, to: mousePos, color }
  }, [pendingConnection, mousePos, devices, inverters])

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-50 relative">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{
          background: '#fafaf9',
          cursor: activePlacement || pendingConnection ? 'crosshair' : 'default'
        }}
      >
        <Layer listening={false}>
          {gridPoints.length > 0 && <Line points={gridPoints} stroke="#e7e5e4" strokeWidth={1} />}
        </Layer>
        <Layer x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}>
          {connections.map((c) => (
            <ConnectionLine
              key={c.id}
              connection={c}
              devices={devices}
              isSelected={selectedConnectionId === c.id}
              onSelect={(id) => {
                selectDevice(null)
                selectConnection(id)
              }}
            />
          ))}
          {preview && (
            <Line
              points={[preview.from.x, preview.from.y, preview.to.x, preview.to.y]}
              stroke={preview.color}
              strokeWidth={2 / view.scale}
              dash={[6, 4]}
              listening={false}
            />
          )}
          {devices.map((d) => (
            <DeviceNode
              key={d.id}
              device={d}
              panel={
                d.kind === 'panel' && d.refId !== null
                  ? panels.find((p) => p.id === d.refId)
                  : undefined
              }
              inverter={
                d.kind === 'inverter' && d.refId !== null
                  ? inverters.find((i) => i.id === d.refId)
                  : undefined
              }
              battery={
                d.kind === 'battery' && d.refId !== null
                  ? batteries.find((b) => b.id === d.refId)
                  : undefined
              }
            />
          ))}
        </Layer>
      </Stage>
      {devices.length === 0 && !activePlacement && !pendingConnection && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm">
            Pick a device from the sidebar, then click here to place it
          </p>
        </div>
      )}
      {pendingConnection ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
          Click a free terminal to connect the wire — Esc to cancel
        </div>
      ) : activePlacement ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
          Click to place {activePlacement.kind} — Esc to cancel
        </div>
      ) : null}
    </div>
  )
}
