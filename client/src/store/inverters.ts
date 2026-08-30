import { create } from 'zustand'
import { api } from '../lib/api'
import { Inverter } from '../types'

interface InverterStore {
  inverters: Inverter[]
  loading: boolean
  error: string | null
  fetchInverters: () => Promise<void>
  addInverter: (data: Omit<Inverter, 'id'>) => Promise<void>
  updateInverter: (id: number, data: Omit<Inverter, 'id'>) => Promise<void>
  deleteInverter: (id: number) => Promise<void>
}

export const useInverterStore = create<InverterStore>((set) => ({
  inverters: [],
  loading: false,
  error: null,

  fetchInverters: async () => {
    set({ loading: true, error: null })
    try {
      const inverters = await api.inverters.list()
      set({ inverters, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  addInverter: async (data) => {
    const inverter = await api.inverters.create(data)
    set((s) => ({ inverters: [...s.inverters, inverter] }))
  },

  updateInverter: async (id, data) => {
    const inverter = await api.inverters.update(id, data)
    set((s) => ({ inverters: s.inverters.map((i) => (i.id === id ? inverter : i)) }))
  },

  deleteInverter: async (id) => {
    await api.inverters.delete(id)
    set((s) => ({ inverters: s.inverters.filter((i) => i.id !== id) }))
  }
}))
