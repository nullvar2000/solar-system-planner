import { create } from 'zustand'
import { Connection, Load, PlacedPanel, ProjectConfig } from '../types'
import { TerminalRef } from '../lib/topology'

export const MIN_PANEL_W = 40
export const MIN_PANEL_H = 30

interface CanvasStore {
  placedPanels: PlacedPanel[]
  selectedPanelId: string | null
  activePanelTypeId: number | null
  connections: Connection[]
  pendingConnection: TerminalRef | null
  hoveredTerminal: TerminalRef | null
  selectedConnectionId: string | null
  selectedInverterId: number | null
  selectedBatteryId: number | null
  batterySeries: number
  batteryParallel: number
  loads: Load[]
  mousePos: { x: number; y: number } | null
  placePanel: (panelTypeId: number, x: number, y: number, width: number, height: number) => void
  movePanel: (id: string, x: number, y: number) => void
  resizePanel: (id: string, width: number, height: number) => void
  removePanel: (id: string) => void
  selectPanel: (id: string | null) => void
  setActivePanelType: (id: number | null) => void
  clearCanvas: () => void
  setPendingConnection: (ref: TerminalRef | null) => void
  setHoveredTerminal: (ref: TerminalRef | null) => void
  setMousePos: (pos: { x: number; y: number } | null) => void
  addConnection: (from: TerminalRef, to: TerminalRef) => void
  removeConnection: (id: string) => void
  selectConnection: (id: string | null) => void
  selectInverter: (id: number | null) => void
  selectBattery: (id: number | null) => void
  setBatteryWiring: (series: number, parallel: number) => void
  addLoad: (name: string, dailyKwh: number) => void
  updateLoad: (id: string, name: string, dailyKwh: number) => void
  removeLoad: (id: string) => void
  restoreState: (state: ProjectConfig) => void
}

let nextId = 1
let nextConnId = 1
let nextLoadId = 1

export const useCanvasStore = create<CanvasStore>((set) => ({
  placedPanels: [],
  selectedPanelId: null,
  activePanelTypeId: null,
  connections: [],
  pendingConnection: null,
  hoveredTerminal: null,
  selectedConnectionId: null,
  selectedInverterId: null,
  selectedBatteryId: null,
  batterySeries: 1,
  batteryParallel: 1,
  loads: [],
  mousePos: null,

  placePanel: (panelTypeId, x, y, width, height) => {
    const id = `panel-${nextId++}`
    set((s) => ({
      placedPanels: [...s.placedPanels, { id, panelId: panelTypeId, x, y, width, height }],
      selectedPanelId: id
    }))
  },

  movePanel: (id, x, y) => {
    set((s) => ({
      placedPanels: s.placedPanels.map((p) => (p.id === id ? { ...p, x, y } : p))
    }))
  },

  resizePanel: (id, width, height) => {
    set((s) => ({
      placedPanels: s.placedPanels.map((p) =>
        p.id === id
          ? {
              ...p,
              width: Math.max(MIN_PANEL_W, width),
              height: Math.max(MIN_PANEL_H, height)
            }
          : p
      )
    }))
  },

  removePanel: (id) => {
    set((s) => ({
      placedPanels: s.placedPanels.filter((p) => p.id !== id),
      connections: s.connections.filter((c) => c.fromPanelId !== id && c.toPanelId !== id),
      selectedPanelId: s.selectedPanelId === id ? null : s.selectedPanelId,
      pendingConnection: s.pendingConnection?.panelId === id ? null : s.pendingConnection,
      hoveredTerminal: s.hoveredTerminal?.panelId === id ? null : s.hoveredTerminal,
      selectedConnectionId: s.selectedConnectionId &&
        (s.connections.find((c) => c.id === s.selectedConnectionId)?.fromPanelId === id ||
          s.connections.find((c) => c.id === s.selectedConnectionId)?.toPanelId === id)
        ? null
        : s.selectedConnectionId
    }))
  },

  selectPanel: (id) => set({ selectedPanelId: id }),

  setActivePanelType: (id) => set({ activePanelTypeId: id }),

  clearCanvas: () =>
    set({
      placedPanels: [],
      selectedPanelId: null,
      connections: [],
      pendingConnection: null,
      hoveredTerminal: null,
      selectedConnectionId: null
    }),

  setPendingConnection: (ref) =>
    set((s) => ({
      pendingConnection: ref,
      hoveredTerminal: s.hoveredTerminal && ref && s.hoveredTerminal.panelId === ref.panelId && s.hoveredTerminal.terminal === ref.terminal ? null : s.hoveredTerminal
    })),

  setHoveredTerminal: (ref) => set({ hoveredTerminal: ref }),

  setMousePos: (pos) => set({ mousePos: pos }),

  addConnection: (from, to) => {
    const id = `conn-${nextConnId++}`
    set((s) => ({
      connections: [
        ...s.connections,
        {
          id,
          fromPanelId: from.panelId,
          fromTerminal: from.terminal,
          toPanelId: to.panelId,
          toTerminal: to.terminal
        }
      ],
      pendingConnection: null,
      hoveredTerminal: null
    }))
  },

  removeConnection: (id) => {
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
      selectedConnectionId: s.selectedConnectionId === id ? null : s.selectedConnectionId
    }))
  },

  selectConnection: (id) => set({ selectedConnectionId: id }),

  selectInverter: (id) => set({ selectedInverterId: id }),

  selectBattery: (id) => set({ selectedBatteryId: id }),

  setBatteryWiring: (series, parallel) =>
    set({
      batterySeries: Math.max(1, Math.floor(series)),
      batteryParallel: Math.max(1, Math.floor(parallel))
    }),

  addLoad: (name, dailyKwh) => {
    const id = `load-${nextLoadId++}`
    set((s) => ({ loads: [...s.loads, { id, name, dailyKwh }] }))
  },

  updateLoad: (id, name, dailyKwh) =>
    set((s) => ({
      loads: s.loads.map((l) => (l.id === id ? { ...l, name, dailyKwh } : l))
    })),

  removeLoad: (id) =>
    set((s) => ({ loads: s.loads.filter((l) => l.id !== id) })),

  restoreState: (state) => {
    const idNum = (id: string, prefix: string) => {
      const n = parseInt(id.slice(prefix.length), 10)
      return Number.isFinite(n) ? n : 0
    }
    nextId = Math.max(nextId, ...state.placedPanels.map((p) => idNum(p.id, 'panel-')), 1)
    nextConnId = Math.max(nextConnId, ...state.connections.map((c) => idNum(c.id, 'conn-')), 1)
    nextLoadId = Math.max(nextLoadId, ...state.loads.map((l) => idNum(l.id, 'load-')), 1)
    set({
      placedPanels: state.placedPanels,
      connections: state.connections,
      loads: state.loads,
      selectedInverterId: state.inverterId,
      selectedBatteryId: state.batteryId,
      batterySeries: state.batterySeries,
      batteryParallel: state.batteryParallel,
      selectedPanelId: null,
      selectedConnectionId: null,
      pendingConnection: null,
      hoveredTerminal: null,
      mousePos: null
    })
  }
}))
