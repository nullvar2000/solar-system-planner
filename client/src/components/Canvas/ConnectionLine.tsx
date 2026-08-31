import { Line } from 'react-konva'
import { Connection, PlacedDevice } from '../../types'
import { useInverterStore } from '../../store/inverters'
import { POLARITY_COLORS, getTerminalPosition, terminalPolarity } from '../../lib/terminals'

interface Props {
  connection: Connection
  devices: PlacedDevice[]
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ConnectionLine({ connection, devices, isSelected, onSelect }: Props) {
  const { inverters } = useInverterStore()
  const fromDevice = devices.find((d) => d.id === connection.fromDeviceId)
  const toDevice = devices.find((d) => d.id === connection.toDeviceId)
  if (!fromDevice || !toDevice) return null

  const inverterFor = (d: PlacedDevice) =>
    d.kind === 'inverter' && d.refId !== null
      ? inverters.find((i) => i.id === d.refId) ?? null
      : null

  const from = getTerminalPosition(fromDevice, connection.fromTerminal, inverterFor(fromDevice))
  const to = getTerminalPosition(toDevice, connection.toTerminal, inverterFor(toDevice))
  if (!from || !to) return null

  let polarity = terminalPolarity(fromDevice, connection.fromTerminal)
  if (polarity === 'any') polarity = terminalPolarity(toDevice, connection.toTerminal)
  const color = POLARITY_COLORS[polarity]

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
