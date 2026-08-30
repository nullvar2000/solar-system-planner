import { create } from 'zustand'
import { api } from '../lib/api'
import { Panel } from '../types'

interface PanelStore {
  panels: Panel[]
  loading: boolean
  error: string | null
  fetchPanels: () => Promise<void>
  addPanel: (data: Omit<Panel, 'id'>) => Promise<void>
  updatePanel: (id: number, data: Omit<Panel, 'id'>) => Promise<void>
  deletePanel: (id: number) => Promise<void>
}

export const usePanelStore = create<PanelStore>((set) => ({
  panels: [],
  loading: false,
  error: null,

  fetchPanels: async () => {
    set({ loading: true, error: null })
    try {
      const panels = await api.panels.list()
      set({ panels, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  addPanel: async (data) => {
    const panel = await api.panels.create(data)
    set((s) => ({ panels: [...s.panels, panel] }))
  },

  updatePanel: async (id, data) => {
    const panel = await api.panels.update(id, data)
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? panel : p)) }))
  },

  deletePanel: async (id) => {
    await api.panels.delete(id)
    set((s) => ({ panels: s.panels.filter((p) => p.id !== id) }))
  }
}))
