import { create } from 'zustand'
import { Connection, DeviceKind, Load, PlacedDevice, ProjectConfig } from '../types'
import { TerminalRef } from '../lib/topology'
import { combinerWidth } from '../lib/terminals'

export interface ActivePlacement {
  kind: DeviceKind
  refId: number | null
}

interface CanvasState {
  devices: PlacedDevice[]
  connections: Connection[]
  selectedDeviceId: string | null
  selectedConnectionId: string | null
  activePlacement: ActivePlacement | null
  pendingConnection: TerminalRef | null
  hoveredTerminal: TerminalRef | null
  loads: Load[]
  pxPerFt: number
  mousePos: { x: number; y: number } | null

  placeDevice: (kind: DeviceKind, refId: number | null, x: number, y: number, width: number, height: number) => void
  moveDevice: (id: string, x: number, y: number) => void
  resizeDevice: (id: string, width: number, height: number) => void
  removeDevice: (id: string) => void
  selectDevice: (id: string | null) => void
  setActivePlacement: (placement: ActivePlacement | null) => void
  updateDevice: (id: string, patch: Partial<Pick<PlacedDevice, 'batterySeries' | 'batteryParallel' | 'combinerInputs'>>) => void
  clearCanvas: () => void

  setPendingConnection: (ref: TerminalRef | null) => void
  setHoveredTerminal: (ref: TerminalRef | null) => void
  setMousePos: (pos: { x: number; y: number } | null) => void

  addConnection: (from: TerminalRef, to: TerminalRef) => void
  removeConnection: (id: string) => void
  selectConnection: (id: string | null) => void
  setConnectionLength: (id: string, lengthFt: number | null) => void

  addLoad: (name: string, dailyKwh: number) => void
  updateLoad: (id: string, name: string, dailyKwh: number) => void
  removeLoad: (id: string) => void

  setPxPerFt: (pxPerFt: number) => void

  restoreState: (state: ProjectConfig) => void
}

const idNum = (id: string, prefix: string) => Number(id.slice(prefix.length)) || 0

export const useCanvasStore = create<CanvasState>((set) => ({
  devices: [],
  connections: [],
  selectedDeviceId: null,
  selectedConnectionId: null,
  activePlacement: null,
  pendingConnection: null,
  hoveredTerminal: null,
  loads: [],
  pxPerFt: 10,
  mousePos: null,

  placeDevice: (kind, refId, x, y, width, height) =>
    set((s) => {
      const id = `dev-${Math.max(0, ...s.devices.map((d) => idNum(d.id, 'dev-')), 0) + 1}`
      const device: PlacedDevice = { id, kind, refId, x, y, width, height }
      if (kind === 'battery') {
        device.batterySeries = 1
        device.batteryParallel = 1
      }
      if (kind === 'combiner') {
        device.combinerInputs = 4
        device.width = combinerWidth(device.combinerInputs)
      }
      return {
        devices: [...s.devices, device],
        selectedDeviceId: id,
        selectedConnectionId: null
      }
    }),

  moveDevice: (id, x, y) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, x, y } : d))
    })),

  resizeDevice: (id, width, height) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, width, height } : d))
    })),

  removeDevice: (id) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.id !== id),
      connections: s.connections.filter((c) => c.fromDeviceId !== id && c.toDeviceId !== id),
      selectedDeviceId: s.selectedDeviceId === id ? null : s.selectedDeviceId,
      pendingConnection: s.pendingConnection?.deviceId === id ? null : s.pendingConnection,
      hoveredTerminal: s.hoveredTerminal?.deviceId === id ? null : s.hoveredTerminal,
      selectedConnectionId:
        s.selectedConnectionId &&
        (s.connections.find((c) => c.id === s.selectedConnectionId)?.fromDeviceId === id ||
          s.connections.find((c) => c.id === s.selectedConnectionId)?.toDeviceId === id)
          ? null
          : s.selectedConnectionId
    })),

  selectDevice: (id) => set({ selectedDeviceId: id, selectedConnectionId: null }),
  setActivePlacement: (placement) => set({ activePlacement: placement }),

  updateDevice: (id, patch) =>
    set((s) => ({
      devices: s.devices.map((d) => {
        if (d.id !== id) return d
        const next = { ...d, ...patch }
        if (next.kind === 'combiner' && patch.combinerInputs !== undefined) {
          next.width = combinerWidth(patch.combinerInputs)
        }
        return next
      })
    })),

  clearCanvas: () =>
    set({
      devices: [],
      connections: [],
      selectedDeviceId: null,
      selectedConnectionId: null,
      pendingConnection: null,
      hoveredTerminal: null
    }),

  setPendingConnection: (ref) =>
    set((s) => ({
      pendingConnection: ref,
      hoveredTerminal:
        s.hoveredTerminal &&
        ref &&
        s.hoveredTerminal.deviceId === ref.deviceId &&
        s.hoveredTerminal.terminal === ref.terminal
          ? null
          : s.hoveredTerminal
    })),

  setHoveredTerminal: (ref) => set({ hoveredTerminal: ref }),
  setMousePos: (pos) => set({ mousePos: pos }),

  addConnection: (from, to) =>
    set((s) => ({
      connections: [
        ...s.connections,
        {
          id: `conn-${Math.max(0, ...s.connections.map((c) => idNum(c.id, 'conn-')), 0) + 1}`,
          fromDeviceId: from.deviceId,
          fromTerminal: from.terminal,
          toDeviceId: to.deviceId,
          toTerminal: to.terminal
        }
      ],
      pendingConnection: null,
      hoveredTerminal: null
    })),

  removeConnection: (id) =>
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
      selectedConnectionId: s.selectedConnectionId === id ? null : s.selectedConnectionId
    })),

  selectConnection: (id) => set({ selectedConnectionId: id, selectedDeviceId: null }),

  setConnectionLength: (id, lengthFt) =>
    set((s) => ({
      connections: s.connections.map((c) => (c.id === id ? { ...c, lengthFt } : c))
    })),

  addLoad: (name, dailyKwh) =>
    set((s) => ({
      loads: [
        ...s.loads,
        {
          id: `load-${Math.max(0, ...s.loads.map((l) => idNum(l.id, 'load-')), 0) + 1}`,
          name,
          dailyKwh
        }
      ]
    })),

  updateLoad: (id, name, dailyKwh) =>
    set((s) => ({
      loads: s.loads.map((l) => (l.id === id ? { ...l, name, dailyKwh } : l))
    })),

  removeLoad: (id) => set((s) => ({ loads: s.loads.filter((l) => l.id !== id) })),

  setPxPerFt: (pxPerFt) => set({ pxPerFt }),

  restoreState: (state) => {
    if (!state || state.version !== 2 || !Array.isArray(state.devices)) {
      throw new Error('Unsupported project format: this project was created with an older version')
    }
    set((s) => {
      let nextId = Math.max(0, ...s.devices.map((d) => idNum(d.id, 'dev-')), 0) + 1
      for (const d of state.devices) nextId = Math.max(nextId, idNum(d.id, 'dev-') + 1)
      const devices = state.devices.map((d) => ({ ...d, id: `dev-${nextId++}` }))
      const oldToNew = new Map(state.devices.map((d, i) => [d.id, devices[i].id]))

      let nextConn = Math.max(0, ...s.connections.map((c) => idNum(c.id, 'conn-')), 0) + 1
      const connections = state.connections.map((c) => ({
        id: `conn-${nextConn++}`,
        fromDeviceId: oldToNew.get(c.fromDeviceId) ?? c.fromDeviceId,
        fromTerminal: c.fromTerminal,
        toDeviceId: oldToNew.get(c.toDeviceId) ?? c.toDeviceId,
        toTerminal: c.toTerminal,
        lengthFt: c.lengthFt ?? null
      }))

      let nextLoad = Math.max(0, ...s.loads.map((l) => idNum(l.id, 'load-')), 0) + 1
      const loads = state.loads.map((l) => ({ ...l, id: `load-${nextLoad++}` }))

      return {
        devices,
        connections,
        loads,
        pxPerFt: state.pxPerFt > 0 ? state.pxPerFt : 10,
        selectedDeviceId: null,
        selectedConnectionId: null,
        activePlacement: null,
        pendingConnection: null,
        hoveredTerminal: null
      }
    })
  }
}))
