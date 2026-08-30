import Fastify from 'fastify'
import cors from '@fastify/cors'
import { initSchema } from './db.js'
import { panelRoutes } from './routes/panels.js'
import { inverterRoutes } from './routes/inverters.js'
import { batteryRoutes } from './routes/batteries.js'
import { projectRoutes } from './routes/projects.js'

export const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

await app.register(cors, { origin: true })

initSchema()

app.register(panelRoutes, { prefix: '/api/panels' })
app.register(inverterRoutes, { prefix: '/api/inverters' })
app.register(batteryRoutes, { prefix: '/api/batteries' })
app.register(projectRoutes, { prefix: '/api/projects' })

app.get('/api/health', async () => ({ status: 'ok' }))
