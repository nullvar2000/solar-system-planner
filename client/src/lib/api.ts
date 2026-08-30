const BASE_URL = 'http://localhost:3001/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  panels: {
    list: () => request<any[]>('/panels'),
    get: (id: number) => request<any>(`/panels/${id}`),
    create: (data: any) => request<any>('/panels', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/panels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/panels/${id}`, { method: 'DELETE' })
  },
  inverters: {
    list: () => request<any[]>('/inverters'),
    get: (id: number) => request<any>(`/inverters/${id}`),
    create: (data: any) => request<any>('/inverters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/inverters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/inverters/${id}`, { method: 'DELETE' })
  },
  batteries: {
    list: () => request<any[]>('/batteries'),
    get: (id: number) => request<any>(`/batteries/${id}`),
    create: (data: any) => request<any>('/batteries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/batteries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/batteries/${id}`, { method: 'DELETE' })
  },
  projects: {
    list: () => request<any[]>('/projects'),
    get: (id: number) => request<any>(`/projects/${id}`),
    create: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/projects/${id}`, { method: 'DELETE' })
  }
}
