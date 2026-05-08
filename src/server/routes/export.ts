import { Hono } from 'hono'
import { stream, streamSSE } from 'hono/streaming'
import { randomUUID } from 'node:crypto'
import { getClientForSession } from '../telegram/client.js'
import { runExport, type ExportFile } from '../telegram/exporter.js'
import { makeZip } from '../telegram/zip.js'
import type { ExportConfig, ExportFormat, ProgressEvent } from '../types.js'

const RESULT_TTL_MS = 30 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000

interface PendingExport {
  config: ExportConfig
  events: ProgressEvent[]
  finished: boolean
  subscribers: Set<(e: ProgressEvent) => void>
  files: ExportFile[]
  totalMessages: number
  finishedAt: number | null
}

const pending = new Map<string, PendingExport>()

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of pending) {
    if (job.finishedAt && now - job.finishedAt > RESULT_TTL_MS) {
      pending.delete(id)
    }
  }
}, SWEEP_INTERVAL_MS).unref()

function broadcast(job: PendingExport, event: ProgressEvent): void {
  job.events.push(event)
  for (const sub of job.subscribers) sub(event)
}

function getSession(headers: Headers): string | null {
  return headers.get('x-tg-session') ?? null
}

function startJob(exportId: string, sessionString: string, config: ExportConfig): void {
  const job: PendingExport = {
    config,
    events: [],
    finished: false,
    subscribers: new Set(),
    files: [],
    totalMessages: 0,
    finishedAt: null,
  }
  pending.set(exportId, job)

  void (async () => {
    try {
      const client = await getClientForSession(sessionString)
      const result = await runExport(client, config, (e) => broadcast(job, e))
      job.files = result.files
      job.totalMessages = result.totalMessages
    } catch (err) {
      const message = err instanceof Error ? err.message : 'export_failed'
      broadcast(job, { type: 'error', message })
    } finally {
      job.finished = true
      job.finishedAt = Date.now()
    }
  })()
}

export const exportRoutes = new Hono()

exportRoutes.post('/start', async (c) => {
  const sessionString = getSession(c.req.raw.headers)
  if (!sessionString) return c.json({ error: 'not authenticated' }, 401)

  const body = await c.req.json<Partial<ExportConfig>>()
  if (!Array.isArray(body.dialogIds) || body.dialogIds.length === 0) {
    return c.json({ error: 'dialogIds required' }, 400)
  }
  if (!body.dateFrom || !body.dateTo) {
    return c.json({ error: 'dateFrom and dateTo required' }, 400)
  }

  const format: ExportFormat =
    body.format === 'json-combined' ? 'json-combined' : 'jsonl-per-dialog'
  const config: ExportConfig = {
    dialogIds: body.dialogIds.map(String),
    dateFrom: body.dateFrom,
    dateTo: body.dateTo,
    includeForwarded: body.includeForwarded ?? true,
    includeReplies: body.includeReplies ?? true,
    format,
  }

  const exportId = randomUUID()
  startJob(exportId, sessionString, config)
  return c.json({ exportId })
})

exportRoutes.get('/progress/:id', (c) => {
  const id = c.req.param('id')
  const job = pending.get(id)
  if (!job) return c.json({ error: 'unknown export id' }, 404)

  return streamSSE(c, async (s) => {
    let seq = 0
    const send = async (event: ProgressEvent) => {
      await s.writeSSE({
        data: JSON.stringify(event),
        event: event.type,
        id: String(seq++),
      })
    }

    for (const e of job.events) await send(e)

    if (job.finished) {
      await s.close()
      return
    }

    let resolveDone: (() => void) | null = null
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
    })

    const sub = (event: ProgressEvent) => {
      void send(event).then(() => {
        if (event.type === 'done' || event.type === 'error') {
          if (resolveDone) resolveDone()
        }
      })
    }
    job.subscribers.add(sub)
    s.onAbort(() => {
      job.subscribers.delete(sub)
      if (resolveDone) resolveDone()
    })

    await done
    job.subscribers.delete(sub)
  })
})

function safeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '_')
}

exportRoutes.get('/download/:id', (c) => {
  const id = c.req.param('id')
  const job = pending.get(id)
  if (!job || !job.finished) return c.json({ error: 'not ready' }, 404)
  if (job.files.length === 0) return c.json({ error: 'no files' }, 404)

  if (job.files.length === 1) {
    const f = job.files[0]
    c.header('Content-Type', 'application/octet-stream')
    c.header('Content-Disposition', `attachment; filename="${safeFilename(f.name)}"`)
    c.header('Content-Length', String(f.size))
    return stream(c, async (s) => {
      await s.write(f.content)
    })
  }

  const zipName = `tg-export_${id.slice(0, 8)}.zip`
  const zipBuf = makeZip(job.files.map((f) => ({ name: f.name, data: f.content })))
  c.header('Content-Type', 'application/zip')
  c.header('Content-Disposition', `attachment; filename="${zipName}"`)
  c.header('Content-Length', String(zipBuf.length))
  return stream(c, async (s) => {
    await s.write(zipBuf)
  })
})
