import Fastify from 'fastify'
import cors from '@fastify/cors'
import { initSchema } from './db.js'
import { panelRoutes } from './routes/panels.js'
import { inverterRoutes } from './routes/inverters.js'
import { batteryRoutes } from './routes/batteries.js'
import { projectRoutes } from './routes/projects.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

initSchema()

app.register(panelRoutes, { prefix: '/api/panels' })
app.register(inverterRoutes, { prefix: '/api/inverters' })
app.register(batteryRoutes, { prefix: '/api/batteries' })
app.register(projectRoutes, { prefix: '/api/projects' })

app.get('/api/health', async () => ({ status: 'ok' }))

const port = 3001
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
