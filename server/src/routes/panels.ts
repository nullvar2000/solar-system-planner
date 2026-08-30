import { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function panelRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.prepare('SELECT * FROM panels ORDER BY pmax').all()
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const panel = db.prepare('SELECT * FROM panels WHERE id = ?').get(id)
    if (!panel) return { error: 'Panel not found' }
    return panel
  })

  app.post('/', async (req) => {
    const body = req.body as any
    const result = db.prepare(`
      INSERT INTO panels (manufacturer, model, vmp, imp, voc, isc, pmax, temp_coeff_v, temp_coeff_i, width, height, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.manufacturer, body.model, body.vmp, body.imp,
      body.voc, body.isc, body.pmax,
      body.temp_coeff_v ?? -0.003, body.temp_coeff_i ?? 0.003,
      body.width, body.height, body.price ?? 0
    )
    return db.prepare('SELECT * FROM panels WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const result = db.prepare(`
      UPDATE panels SET manufacturer=?, model=?, vmp=?, imp=?, voc=?, isc=?, pmax=?,
      temp_coeff_v=?, temp_coeff_i=?, width=?, height=?, price=? WHERE id=?
    `).run(
      body.manufacturer, body.model, body.vmp, body.imp,
      body.voc, body.isc, body.pmax,
      body.temp_coeff_v ?? -0.003, body.temp_coeff_i ?? 0.003,
      body.width, body.height, body.price ?? 0, id
    )
    if (result.changes === 0) return { error: 'Panel not found' }
    return db.prepare('SELECT * FROM panels WHERE id = ?').get(id)
  })

  app.delete('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM panels WHERE id = ?').run(id)
    if (result.changes === 0) return { error: 'Panel not found' }
    return { success: true }
  })
}
