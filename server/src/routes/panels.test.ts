import { afterAll, describe, expect, it } from 'vitest'
import { app } from '../app.js'

const panelBody = {
  manufacturer: 'SunTech',
  model: 'ST-400',
  vmp: 41,
  imp: 9.75,
  voc: 49,
  isc: 10.3,
  pmax: 400,
  width: 54.9,
  height: 41.3,
  price: 425
}

let createdId: number

afterAll(async () => {
  await app.close()
})

describe('panels API', () => {
  it('reports health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('creates a panel and applies defaults', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/panels', payload: panelBody })
    expect(res.statusCode).toBe(200)
    const panel = res.json()
    expect(panel.id).toBeTypeOf('number')
    expect(panel.manufacturer).toBe('SunTech')
    expect(panel.model).toBe('ST-400')
    expect(panel.pmax).toBe(400)
    expect(panel.temp_coeff_v).toBe(-0.003)
    expect(panel.temp_coeff_i).toBe(0.003)
    createdId = panel.id
  })

  it('lists panels sorted by pmax', async () => {
    const small = await app.inject({
      method: 'POST',
      url: '/api/panels',
      payload: { ...panelBody, model: 'ST-100', pmax: 100, price: 150 }
    })
    const smallId = small.json().id

    const res = await app.inject({ method: 'GET', url: '/api/panels' })
    expect(res.statusCode).toBe(200)
    const panels = res.json()
    expect(panels.map((p: { id: number }) => p.id)).toContain(createdId)
    expect(panels.map((p: { id: number }) => p.id)).toContain(smallId)
    const pmaxes = panels.map((p: { pmax: number }) => p.pmax)
    expect(pmaxes).toEqual([...pmaxes].sort((a, b) => a - b))
  })

  it('gets a panel by id', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/panels/${createdId}` })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(createdId)
  })

  it('returns an error object for a missing panel', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/panels/999999' })
    expect(res.json()).toEqual({ error: 'Panel not found' })
  })

  it('updates a panel', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/panels/${createdId}`,
      payload: { ...panelBody, model: 'ST-400B', price: 450 }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().model).toBe('ST-400B')
    expect(res.json().price).toBe(450)
  })

  it('returns an error object when updating a missing panel', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/panels/999999',
      payload: panelBody
    })
    expect(res.json()).toEqual({ error: 'Panel not found' })
  })

  it('deletes a panel', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/panels/${createdId}` })
    expect(res.json()).toEqual({ success: true })

    const gone = await app.inject({ method: 'GET', url: `/api/panels/${createdId}` })
    expect(gone.json()).toEqual({ error: 'Panel not found' })
  })

  it('returns an error object when deleting a missing panel', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/panels/999999' })
    expect(res.json()).toEqual({ error: 'Panel not found' })
  })
})
