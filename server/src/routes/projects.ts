import { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function projectRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC').all()
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
    if (!project) return { error: 'Project not found' }
    return project
  })

  app.post('/', async (req) => {
    const body = req.body as any
    const result = db.prepare(`
      INSERT INTO projects (name, config_json) VALUES (?, ?)
    `).run(body.name, JSON.stringify(body.config))
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const result = db.prepare(`
      UPDATE projects SET name=?, config_json=?, updated_at=datetime('now') WHERE id=?
    `).run(body.name, JSON.stringify(body.config), id)
    if (result.changes === 0) return { error: 'Project not found' }
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })

  app.delete('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    if (result.changes === 0) return { error: 'Project not found' }
    return { success: true }
  })
}
