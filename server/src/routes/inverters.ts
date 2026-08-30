import { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function inverterRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.prepare('SELECT * FROM inverters ORDER BY max_power_w').all()
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const inverter = db.prepare('SELECT * FROM inverters WHERE id = ?').get(id)
    if (!inverter) return { error: 'Inverter not found' }
    return inverter
  })

  app.post('/', async (req) => {
    const body = req.body as any
    const result = db.prepare(`
      INSERT INTO inverters (manufacturer, model, mppt_min_v, mppt_max_v, max_input_a, max_power_w, max_pv_inputs, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.manufacturer, body.model, body.mppt_min_v, body.mppt_max_v,
      body.max_input_a, body.max_power_w, body.max_pv_inputs ?? 1, body.price ?? 0
    )
    return db.prepare('SELECT * FROM inverters WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const result = db.prepare(`
      UPDATE inverters SET manufacturer=?, model=?, mppt_min_v=?, mppt_max_v=?,
      max_input_a=?, max_power_w=?, max_pv_inputs=?, price=? WHERE id=?
    `).run(
      body.manufacturer, body.model, body.mppt_min_v, body.mppt_max_v,
      body.max_input_a, body.max_power_w, body.max_pv_inputs ?? 1, body.price ?? 0, id
    )
    if (result.changes === 0) return { error: 'Inverter not found' }
    return db.prepare('SELECT * FROM inverters WHERE id = ?').get(id)
  })

  app.delete('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM inverters WHERE id = ?').run(id)
    if (result.changes === 0) return { error: 'Inverter not found' }
    return { success: true }
  })
}
