import { Line } from 'react-konva'
import { Connection, PlacedPanel } from '../../types'
import { getTerminalPosition } from './PanelNode'

interface Props {
  connection: Connection
  placedPanels: PlacedPanel[]
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ConnectionLine({ connection, placedPanels, isSelected, onSelect }: Props) {
  const fromPanel = placedPanels.find((p) => p.id === connection.fromPanelId)
  const toPanel = placedPanels.find((p) => p.id === connection.toPanelId)
  if (!fromPanel || !toPanel) return null

  const from = getTerminalPosition(fromPanel, connection.fromTerminal)
  const to = getTerminalPosition(toPanel, connection.toTerminal)
  const color = connection.fromTerminal === 'positive' ? '#ef4444' : '#3b82f6'

  const sag = Math.max(from.y, to.y) + 25 + Math.abs(to.x - from.x) * 0.08
  const cx = (from.x + to.x) / 2

  const points: number[] = []
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    points.push(mt * mt * from.x + 2 * mt * t * cx + t * t * to.x)
    points.push(mt * mt * from.y + 2 * mt * t * sag + t * t * to.y)
  }

  const handleClick = (e: any) => {
    e.cancelBubble = true
    onSelect(connection.id)
  }

  return (
    <Line
      points={points}
      stroke={color}
      strokeWidth={isSelected ? 5 : 3}
      hitStrokeWidth={14}
      shadowColor={isSelected ? '#000000' : 'transparent'}
      shadowOpacity={isSelected ? 0.4 : 0}
      shadowBlur={isSelected ? 6 : 0}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={() => {
        document.body.style.cursor = 'pointer'
      }}
      onMouseLeave={() => {
        document.body.style.cursor = 'default'
      }}
    />
  )
}
