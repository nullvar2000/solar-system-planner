import { create } from 'zustand'
import { api } from '../lib/api'
import { Battery } from '../types'

interface BatteryStore {
  batteries: Battery[]
  loading: boolean
  error: string | null
  fetchBatteries: () => Promise<void>
  addBattery: (data: Omit<Battery, 'id'>) => Promise<void>
  updateBattery: (id: number, data: Omit<Battery, 'id'>) => Promise<void>
  deleteBattery: (id: number) => Promise<void>
}

export const useBatteryStore = create<BatteryStore>((set) => ({
  batteries: [],
  loading: false,
  error: null,

  fetchBatteries: async () => {
    set({ loading: true, error: null })
    try {
      const batteries = await api.batteries.list()
      set({ batteries, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  addBattery: async (data) => {
    const battery = await api.batteries.create(data)
    set((s) => ({ batteries: [...s.batteries, battery] }))
  },

  updateBattery: async (id, data) => {
    const battery = await api.batteries.update(id, data)
    set((s) => ({ batteries: s.batteries.map((b) => (b.id === id ? battery : b)) }))
  },

  deleteBattery: async (id) => {
    await api.batteries.delete(id)
    set((s) => ({ batteries: s.batteries.filter((b) => b.id !== id) }))
  }
}))
