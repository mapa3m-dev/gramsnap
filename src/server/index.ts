import fs from 'node:fs'
import path from 'node:path'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { authRoutes } from './routes/auth.js'
import { dialogsRoutes } from './routes/dialogs.js'
import { exportRoutes } from './routes/export.js'
import { initServer } from './telegram/client.js'

const PORT = Number(process.env.PORT ?? 3001)
const DIST_CLIENT = path.resolve(process.cwd(), 'dist/client')

await initServer()

const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})

app.route('/api/auth', authRoutes)
app.route('/api/dialogs', dialogsRoutes)
app.route('/api/export', exportRoutes)

app.get('/api/health', (c) => c.json({ ok: true }))

if (fs.existsSync(DIST_CLIENT)) {
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), DIST_CLIENT) }))
  app.get('*', serveStatic({ path: path.join(path.relative(process.cwd(), DIST_CLIENT), 'index.html') }))
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`tg-export server listening on http://localhost:${info.port}`)
})
