import { create } from 'zustand'
import { api } from '../lib/api'
import { ProjectConfig } from '../types'

export interface ProjectMeta {
  id: number
  name: string
  updated_at: string
}

interface ProjectStore {
  projects: ProjectMeta[]
  currentProjectId: number | null
  projectName: string
  saving: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  setProjectName: (name: string) => void
  saveProject: (config: ProjectConfig) => Promise<void>
  loadProject: (id: number) => Promise<ProjectConfig | null>
  deleteProject: (id: number) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  projectName: '',
  saving: false,
  error: null,

  fetchProjects: async () => {
    try {
      const projects = await api.projects.list()
      set({ projects })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  saveProject: async (config) => {
    set({ saving: true, error: null })
    try {
      const s = get()
      if (s.currentProjectId) {
        await api.projects.update(s.currentProjectId, { name: s.projectName, config })
      } else {
        const created = await api.projects.create({ name: s.projectName, config })
        set({ currentProjectId: created.id })
      }
      await get().fetchProjects()
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ saving: false })
    }
  },

  loadProject: async (id) => {
    const project = await api.projects.get(id)
    if (!project || !project.config_json) return null
    const config = JSON.parse(project.config_json) as ProjectConfig
    set({ currentProjectId: project.id, projectName: project.name, error: null })
    return config
  },

  deleteProject: async (id) => {
    await api.projects.delete(id)
    set((s) => ({
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
      error: null
    }))
    await get().fetchProjects()
  }
}))
