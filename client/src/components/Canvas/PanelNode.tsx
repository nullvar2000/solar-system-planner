import { Group, Rect, Text, Circle } from 'react-konva'
import { useCallback } from 'react'
import { PlacedPanel, Panel, Terminal } from '../../types'
import { useCanvasStore } from '../../store/canvas'
import { canConnect } from '../../lib/topology'

export const SCALE = 1.5
const TERMINAL_RADIUS = 6
const TERMINAL_OFFSET_Y = 10
const TERMINAL_OFFSET_X = 15
const HANDLE_SIZE = 10

interface Props {
  placed: PlacedPanel
  panel: Panel | undefined
}

export function getTerminalPosition(placed: PlacedPanel, terminal: Terminal) {
  return {
    x: placed.x + placed.width / 2 + (terminal === 'positive' ? -TERMINAL_OFFSET_X : TERMINAL_OFFSET_X),
    y: placed.y + placed.height + TERMINAL_OFFSET_Y
  }
}

export function PanelNode({ placed, panel }: Props) {
  const {
    movePanel,
    resizePanel,
    selectPanel,
    selectedPanelId,
    connections,
    pendingConnection,
    hoveredTerminal
  } = useCanvasStore()
  const isSelected = selectedPanelId === placed.id

  if (!panel) return null

  const width = placed.width
  const height = placed.height

  const handleDragEnd = useCallback(
    (e: any) => {
      movePanel(placed.id, e.target.x(), e.target.y())
    },
    [placed.id, movePanel]
  )

  const handleClick = useCallback(
    (e: any) => {
      e.cancelBubble = true
      selectPanel(placed.id)
    },
    [placed.id, selectPanel]
  )

  const handleResizeMove = useCallback(
    (e: any) => {
      e.cancelBubble = true
      resizePanel(placed.id, e.target.x(), e.target.y())
    },
    [placed.id, resizePanel]
  )

  const handleTerminalClick = useCallback(
    (terminal: Terminal) => {
      const { pendingConnection: pending, connections: conns, setPendingConnection, addConnection } =
        useCanvasStore.getState()
      const ref = { panelId: placed.id, terminal }
      if (!pending) {
        setPendingConnection(ref)
        return
      }
      if (pending.panelId === ref.panelId && pending.terminal === ref.terminal) {
        setPendingConnection(null)
        return
      }
      if (canConnect(pending, ref, conns)) {
        addConnection(pending, ref)
      } else {
        setPendingConnection(null)
      }
    },
    [placed.id]
  )

  return (
    <Group
      x={placed.x}
      y={placed.y}
      draggable
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Rect
        width={width}
        height={height}
        fill={isSelected ? '#3b82f6' : '#1e40af'}
        stroke={isSelected ? '#1d4ed8' : '#1e3a5f'}
        strokeWidth={isSelected ? 3 : 1}
        cornerRadius={4}
        opacity={0.9}
      />
      <Text
        x={width / 2}
        y={height / 2 - 10}
        text={panel.model}
        fontSize={12}
        fontFamily="Arial"
        fill="white"
        align="center"
      />
      <Text
        x={width / 2}
        y={height / 2 + 8}
        text={`${panel.pmax}W`}
        fontSize={10}
        fontFamily="Arial"
        fill="#93c5fd"
        align="center"
      />
      {(['positive', 'negative'] as Terminal[]).map((terminal) => {
        const offsetX = terminal === 'positive' ? -TERMINAL_OFFSET_X : TERMINAL_OFFSET_X
        const isPending =
          pendingConnection?.panelId === placed.id && pendingConnection?.terminal === terminal
        const isTarget =
          !!hoveredTerminal &&
          !!pendingConnection &&
          hoveredTerminal.panelId === placed.id &&
          hoveredTerminal.terminal === terminal &&
          !isPending
        const validTarget = isTarget ? canConnect(pendingConnection!, hoveredTerminal!, connections) : false
        const stroke = isPending
          ? '#ffffff'
          : isTarget
            ? validTarget
              ? '#22c55e'
              : '#facc15'
            : terminal === 'positive'
              ? '#991b1b'
              : '#1e40af'
        return (
          <Group key={terminal}>
            <Circle
              x={width / 2 + offsetX}
              y={height + TERMINAL_OFFSET_Y}
              radius={TERMINAL_RADIUS + (isPending ? 2 : 0)}
              fill={terminal === 'positive' ? '#ef4444' : '#3b82f6'}
              stroke={stroke}
              strokeWidth={isPending || isTarget ? 3 : 1}
              cursor="pointer"
              onClick={(e) => {
                e.cancelBubble = true
                handleTerminalClick(terminal)
              }}
              onTap={(e) => {
                e.cancelBubble = true
                handleTerminalClick(terminal)
              }}
              onMouseEnter={() => {
                if (pendingConnection && !isPending) {
                  useCanvasStore.getState().setHoveredTerminal({ panelId: placed.id, terminal })
                }
              }}
              onMouseLeave={() => useCanvasStore.getState().setHoveredTerminal(null)}
            />
            <Text
              x={width / 2 + offsetX}
              y={height + TERMINAL_OFFSET_Y + TERMINAL_RADIUS + 4}
              text={terminal === 'positive' ? '+' : '-'}
              fontSize={9}
              fontFamily="Arial"
              fill={terminal === 'positive' ? '#991b1b' : '#1e40af'}
              align="center"
            />
          </Group>
        )
      })}
      {isSelected && (
        <Rect
          x={width - HANDLE_SIZE / 2}
          y={height - HANDLE_SIZE / 2}
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
            selectPanel(placed.id)
          }}
          onTap={(e) => {
            e.cancelBubble = true
            selectPanel(placed.id)
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
