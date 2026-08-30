import { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function batteryRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.prepare('SELECT * FROM batteries ORDER BY capacity_ah').all()
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(id)
    if (!battery) return { error: 'Battery not found' }
    return battery
  })

  app.post('/', async (req) => {
    const body = req.body as any
    const result = db.prepare(`
      INSERT INTO batteries (manufacturer, model, chemistry, nominal_v, capacity_ah, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      body.manufacturer, body.model, body.chemistry,
      body.nominal_v, body.capacity_ah, body.price ?? 0
    )
    return db.prepare('SELECT * FROM batteries WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const result = db.prepare(`
      UPDATE batteries SET manufacturer=?, model=?, chemistry=?, nominal_v=?, capacity_ah=?, price=? WHERE id=?
    `).run(
      body.manufacturer, body.model, body.chemistry,
      body.nominal_v, body.capacity_ah, body.price ?? 0, id
    )
    if (result.changes === 0) return { error: 'Battery not found' }
    return db.prepare('SELECT * FROM batteries WHERE id = ?').get(id)
  })

  app.delete('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM batteries WHERE id = ?').run(id)
    if (result.changes === 0) return { error: 'Battery not found' }
    return { success: true }
  })
}
