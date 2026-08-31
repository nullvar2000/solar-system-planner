import { DeviceKind, Inverter, PlacedDevice } from '../types'

export const SCALE = 1.5

export const GRID_PX = 20
export const SNAP_PX = 10

export const DEVICE_SIZES: Record<Exclude<DeviceKind, 'panel'>, { width: number; height: number }> = {
  inverter: { width: 140, height: 100 },
  battery: { width: 110, height: 80 },
  busbar: { width: 220, height: 48 },
  combiner: { width: 0, height: 90 },
  breaker: { width: 48, height: 64 }
}

export function combinerWidth(inputs: number): number {
  return 30 * Math.max(1, inputs) + 30
}

export type Polarity = 'pos' | 'neg' | 'ac' | 'any'

export const POLARITY_COLORS: Record<Polarity, string> = {
  pos: '#ef4444',
  neg: '#3b82f6',
  ac: '#22c55e',
  any: '#9ca3af'
}

export interface TerminalDef {
  id: string
  label: string
  polarity: Polarity
  dx: number
  dy: number
}

export function deviceSize(kind: DeviceKind, device: PlacedDevice): { width: number; height: number } {
  if (kind === 'panel') {
    return { width: device.width, height: device.height }
  }
  if (kind === 'combiner') {
    return { width: combinerWidth(device.combinerInputs ?? 4), height: DEVICE_SIZES.combiner.height }
  }
  return DEVICE_SIZES[kind]
}

export function getTerminals(device: PlacedDevice, inverter: Inverter | null): TerminalDef[] {
  const { width: w, height: h } = deviceSize(device.kind, device)

  switch (device.kind) {
    case 'panel':
      return [
        { id: '+', label: '+', polarity: 'pos', dx: w / 2 - 15, dy: h + 10 },
        { id: '-', label: '−', polarity: 'neg', dx: w / 2 + 15, dy: h + 10 }
      ]

    case 'inverter': {
      const n = inverter?.max_pv_inputs ?? 1
      const defs: TerminalDef[] = []
      for (let i = 0; i < n; i++) {
        const x = (w * (i + 1)) / (n + 1)
        defs.push({ id: `pv${i}+`, label: `${i + 1}+`, polarity: 'pos', dx: x - 8, dy: -10 })
        defs.push({ id: `pv${i}-`, label: `${i + 1}−`, polarity: 'neg', dx: x + 8, dy: -10 })
      }
      defs.push(
        { id: 'bat+', label: 'BAT+', polarity: 'pos', dx: w / 2 - 15, dy: h + 10 },
        { id: 'bat-', label: 'BAT−', polarity: 'neg', dx: w / 2 + 15, dy: h + 10 },
        { id: 'ac', label: 'AC', polarity: 'ac', dx: w + 10, dy: h / 2 }
      )
      return defs
    }

    case 'battery':
      return [
        { id: '+', label: '+', polarity: 'pos', dx: w / 2 - 15, dy: -10 },
        { id: '-', label: '−', polarity: 'neg', dx: w / 2 + 15, dy: -10 }
      ]

    case 'busbar':
      return [
        { id: 'bus+', label: 'BUS+', polarity: 'pos', dx: w / 2, dy: -10 },
        { id: 'bus-', label: 'BUS−', polarity: 'neg', dx: w / 2, dy: h + 10 }
      ]

    case 'combiner': {
      const n = device.combinerInputs ?? 4
      const defs: TerminalDef[] = []
      for (let i = 0; i < n; i++) {
        const cx = 30 + 30 * i
        defs.push({ id: `in${i}+`, label: `${i + 1}+`, polarity: 'pos', dx: cx - 8, dy: -10 })
        defs.push({ id: `in${i}-`, label: `${i + 1}−`, polarity: 'neg', dx: cx + 8, dy: -10 })
      }
      defs.push(
        { id: 'out+', label: 'OUT+', polarity: 'pos', dx: w / 2 - 15, dy: h + 10 },
        { id: 'out-', label: 'OUT−', polarity: 'neg', dx: w / 2 + 15, dy: h + 10 }
      )
      return defs
    }

    case 'breaker':
      return [
        { id: 'in', label: 'IN', polarity: 'any', dx: -10, dy: h / 2 },
        { id: 'out', label: 'OUT', polarity: 'any', dx: w + 10, dy: h / 2 }
      ]
  }
}

export function getTerminalPosition(
  device: PlacedDevice,
  terminal: string,
  inverter: Inverter | null
): { x: number; y: number } | null {
  const def = getTerminals(device, inverter).find((t) => t.id === terminal)
  if (!def) return null
  return { x: device.x + def.dx, y: device.y + def.dy }
}

export function terminalPolarity(device: PlacedDevice, terminal: string): Polarity {
  if (device.kind === 'breaker') return 'any'
  if (terminal === 'ac') return 'ac'
  return terminal.endsWith('+') ? 'pos' : 'neg'
}

export function terminalCapacity(device: PlacedDevice, _terminal: string): number {
  return device.kind === 'busbar' ? Infinity : 1
}

export function internalBonds(device: PlacedDevice): Array<[string, string]> {
  switch (device.kind) {
    case 'breaker':
      return [['in', 'out']]
    case 'combiner': {
      const n = device.combinerInputs ?? 4
      const bonds: Array<[string, string]> = []
      for (let i = 0; i < n; i++) {
        bonds.push([`in${i}+`, 'out+'], [`in${i}-`, 'out-'])
      }
      return bonds
    }
    default:
      return []
  }
}
