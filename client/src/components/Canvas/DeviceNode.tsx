import { Circle, Group, Line, Rect, Text } from 'react-konva'
import { useCallback } from 'react'
import { Battery, Inverter, Panel, PlacedDevice } from '../../types'
import { useCanvasStore } from '../../store/canvas'
import { canConnect } from '../../lib/topology'
import { deviceSize, getTerminals, POLARITY_COLORS, SNAP_PX, TerminalDef } from '../../lib/terminals'

const TERMINAL_RADIUS = 6
const HANDLE_SIZE = 10

interface Props {
  device: PlacedDevice
  panel?: Panel
  inverter?: Inverter
  battery?: Battery
}

export function DeviceNode({ device, panel, inverter, battery }: Props) {
  const {
    devices,
    connections,
    selectedDeviceId,
    selectDevice,
    moveDevice,
    resizeDevice,
    pendingConnection,
    hoveredTerminal
  } = useCanvasStore()
  const isSelected = selectedDeviceId === device.id
  const { width: w, height: h } = deviceSize(device.kind, device)
  const terminals = getTerminals(device, device.kind === 'inverter' ? inverter ?? null : null)

  const handleDragEnd = useCallback(
    (e: any) => {
      const pos = e.target.position()
      moveDevice(
        device.id,
        Math.round(pos.x / SNAP_PX) * SNAP_PX,
        Math.round(pos.y / SNAP_PX) * SNAP_PX
      )
    },
    [device.id, moveDevice]
  )

  const handleClick = useCallback(
    (e: any) => {
      e.cancelBubble = true
      selectDevice(device.id)
    },
    [device.id, selectDevice]
  )

  const handleResizeMove = useCallback(
    (e: any) => {
      e.cancelBubble = true
      resizeDevice(
        device.id,
        Math.max(40, Math.round(e.target.x() / SNAP_PX) * SNAP_PX),
        Math.max(30, Math.round(e.target.y() / SNAP_PX) * SNAP_PX)
      )
    },
    [device.id, resizeDevice]
  )

  const handleTerminalClick = useCallback(
    (terminalId: string) => (e: any) => {
      e.cancelBubble = true
      const {
        pendingConnection: pending,
        connections: conns,
        devices: allDevices,
        setPendingConnection,
        addConnection
      } = useCanvasStore.getState()
      const ref = { deviceId: device.id, terminal: terminalId }
      if (!pending) {
        setPendingConnection(ref)
        return
      }
      if (pending.deviceId === ref.deviceId && pending.terminal === ref.terminal) {
        setPendingConnection(null)
        return
      }
      if (canConnect(pending, ref, allDevices, conns)) {
        addConnection(pending, ref)
      } else {
        setPendingConnection(null)
      }
    },
    [device.id]
  )

  const body = (
    <>
      {device.kind === 'panel' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#3b82f6' : '#1e40af'}
            stroke={isSelected ? '#1d4ed8' : '#1e3a5f'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            opacity={0.9}
          />
          <Text
            x={0}
            y={h / 2 - 12}
            width={w}
            text={panel ? panel.model : 'Panel'}
            fontSize={12}
            fontFamily="Arial"
            fill="white"
            align="center"
          />
          <Text
            x={0}
            y={h / 2 + 6}
            width={w}
            text={panel ? `${panel.pmax}W` : ''}
            fontSize={10}
            fontFamily="Arial"
            fill="#93c5fd"
            align="center"
          />
        </>
      )}
      {device.kind === 'inverter' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#6b7280' : '#374151'}
            stroke={isSelected ? '#4b5563' : '#1f2937'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            opacity={0.95}
          />
          <Text
            x={0}
            y={h / 2 - 14}
            width={w}
            text={inverter ? inverter.model : 'Inverter'}
            fontSize={12}
            fontFamily="Arial"
            fill="white"
            align="center"
          />
          <Text
            x={0}
            y={h / 2 + 4}
            width={w}
            text={inverter ? `${inverter.max_pv_inputs} MPPT · ${inverter.max_power_w}W` : ''}
            fontSize={10}
            fontFamily="Arial"
            fill="#d1d5db"
            align="center"
          />
        </>
      )}
      {device.kind === 'battery' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#22c55e' : '#15803d'}
            stroke={isSelected ? '#16a34a' : '#14532d'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            opacity={0.9}
          />
          <Text
            x={0}
            y={h / 2 - 14}
            width={w}
            text={battery ? battery.model : 'Battery'}
            fontSize={12}
            fontFamily="Arial"
            fill="white"
            align="center"
          />
          <Text
            x={0}
            y={h / 2 + 4}
            width={w}
            text={`${device.batterySeries ?? 1}S × ${device.batteryParallel ?? 1}P`}
            fontSize={10}
            fontFamily="Arial"
            fill="#bbf7d0"
            align="center"
          />
        </>
      )}
      {device.kind === 'busbar' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#f5f5f4' : '#e7e5e4'}
            stroke={isSelected ? '#78716c' : '#a8a29e'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={3}
          />
          <Line
            points={[8, h / 2 - 8, w - 8, h / 2 - 8]}
            stroke="#ef4444"
            strokeWidth={6}
          />
          <Line
            points={[8, h / 2 + 8, w - 8, h / 2 + 8]}
            stroke="#3b82f6"
            strokeWidth={6}
          />
          <Text
            x={0}
            y={1}
            width={w}
            text="Busbar"
            fontSize={9}
            fontFamily="Arial"
            fill="#57534e"
            align="center"
          />
        </>
      )}
      {device.kind === 'combiner' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#f59e0b' : '#d97706'}
            stroke={isSelected ? '#b45309' : '#92400e'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            opacity={0.95}
          />
          <Text
            x={0}
            y={h / 2 - 12}
            width={w}
            text="Combiner"
            fontSize={12}
            fontFamily="Arial"
            fill="white"
            align="center"
          />
          <Text
            x={0}
            y={h / 2 + 6}
            width={w}
            text={`${device.combinerInputs ?? 4} inputs`}
            fontSize={10}
            fontFamily="Arial"
            fill="#fef3c7"
            align="center"
          />
        </>
      )}
      {device.kind === 'breaker' && (
        <>
          <Rect
            width={w}
            height={h}
            fill={isSelected ? '#f43f5e' : '#e11d48'}
            stroke={isSelected ? '#be123c' : '#9f1239'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            opacity={0.9}
          />
          <Line
            points={[w * 0.2, h * 0.65, w * 0.8, h * 0.35]}
            stroke="white"
            strokeWidth={2}
          />
          <Text
            x={0}
            y={h - 14}
            width={w}
            text="BRK"
            fontSize={9}
            fontFamily="Arial"
            fill="white"
            align="center"
          />
        </>
      )}
    </>
  )

  const renderTerminal = (def: TerminalDef) => {
    const isPending =
      pendingConnection?.deviceId === device.id && pendingConnection?.terminal === def.id
    const isTarget =
      !!hoveredTerminal &&
      !!pendingConnection &&
      hoveredTerminal.deviceId === device.id &&
      hoveredTerminal.terminal === def.id &&
      !isPending
    const validTarget = isTarget
      ? canConnect(pendingConnection!, hoveredTerminal!, devices, connections)
      : false
    const stroke = isPending
      ? '#ffffff'
      : isTarget
        ? validTarget
          ? '#22c55e'
          : '#facc15'
        : POLARITY_COLORS[def.polarity]
    const labelBelow = def.dy >= 0
    return (
      <Group key={def.id}>
        <Circle
          x={def.dx}
          y={def.dy}
          radius={TERMINAL_RADIUS + (isPending ? 2 : 0)}
          fill={POLARITY_COLORS[def.polarity]}
          stroke={stroke}
          strokeWidth={isPending || isTarget ? 3 : 1}
          cursor="pointer"
          onClick={handleTerminalClick(def.id)}
          onTap={handleTerminalClick(def.id)}
          onMouseEnter={() => {
            if (pendingConnection && !isPending) {
              useCanvasStore.getState().setHoveredTerminal({
                deviceId: device.id,
                terminal: def.id
              })
            }
          }}
          onMouseLeave={() => useCanvasStore.getState().setHoveredTerminal(null)}
        />
        <Text
          x={def.dx - 15}
          y={labelBelow ? def.dy + TERMINAL_RADIUS + 2 : def.dy - TERMINAL_RADIUS - 12}
          width={30}
          text={def.label}
          fontSize={9}
          fontFamily="Arial"
          fill={POLARITY_COLORS[def.polarity]}
          align="center"
          listening={false}
        />
      </Group>
    )
  }

  return (
    <Group
      x={device.x}
      y={device.y}
      draggable
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {body}
      {terminals.map(renderTerminal)}
      {isSelected && device.kind === 'panel' && (
        <Rect
          x={w - HANDLE_SIZE / 2}
          y={h - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth={1}
          cornerRadius={2}
          draggable
          onDragMove={handleResizeMove}
          onClick={(e) => {
            e.cancelBubble = true
            selectDevice(device.id)
          }}
          onTap={(e) => {
            e.cancelBubble = true
            selectDevice(device.id)
          }}
          onMouseEnter={() => {
            document.body.style.cursor = 'nwse-resize'
          }}
          onMouseLeave={() => {
            document.body.style.cursor = 'default'
          }}
        />
      )}
    </Group>
  )
}
