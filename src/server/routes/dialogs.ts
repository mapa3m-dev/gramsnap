import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import {
  getClientForSession,
  setDialogsCache,
  getCachedDialog,
  getCachedAvatar,
  setCachedAvatar,
} from '../telegram/client.js'
import type { Dialog, DialogType } from '../types.js'

function classify(d: { isUser: boolean; isGroup: boolean; isChannel: boolean }): DialogType {
  if (d.isUser) return 'user'
  if (d.isGroup) return 'group'
  return 'channel'
}

function entityUsername(entity: unknown): string | null {
  if (!entity || typeof entity !== 'object') return null
  const e = entity as { username?: string | null }
  return e.username ?? null
}

function messageText(msg: unknown): string | null {
  if (!msg || typeof msg !== 'object') return null
  const m = msg as { message?: string | null }
  return m.message ?? null
}

function messageDate(msg: unknown): string | null {
  if (!msg || typeof msg !== 'object') return null
  const m = msg as { date?: number | null }
  if (typeof m.date !== 'number') return null
  return new Date(m.date * 1000).toISOString()
}

function getSession(headers: Headers): string | null {
  return headers.get('x-tg-session') ?? null
}

function entityHasPhoto(entity: unknown): boolean {
  if (!entity || typeof entity !== 'object') return false
  const e = entity as { photo?: unknown }
  if (!e.photo || typeof e.photo !== 'object') return false
  const p = e.photo as { className?: string }
  return p.className !== 'UserProfilePhotoEmpty' && p.className !== 'ChatPhotoEmpty'
}

export const dialogsRoutes = new Hono()

dialogsRoutes.get('/', async (c) => {
  const sessionString = getSession(c.req.raw.headers)
  if (!sessionString) return c.json({ error: 'not authenticated' }, 401)

  let client
  try {
    client = await getClientForSession(sessionString)
    if (!(await client.isUserAuthorized())) {
      return c.json({ error: 'not authenticated' }, 401)
    }
  } catch {
    return c.json({ error: 'not authenticated' }, 401)
  }

  const search = (c.req.query('search') ?? '').trim().toLowerCase()
  const limitParam = Number(c.req.query('limit') ?? '100')
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100

  const raw = await client.getDialogs({ limit })
  setDialogsCache(sessionString, raw)

  const dialogs: Dialog[] = raw.map((d) => {
    const id = d.id ? d.id.toString() : ''
    const name = d.name ?? d.title ?? ''
    const username = entityUsername(d.entity)
    return {
      id,
      type: classify(d),
      name,
      username,
      unreadCount: d.unreadCount ?? 0,
      lastMessage: messageText(d.message),
      lastDate: messageDate(d.message),
      hasPhoto: entityHasPhoto(d.entity),
      photo: null,
    } satisfies Dialog
  })

  const filtered = search
    ? dialogs.filter((d) => {
        const name = d.name.toLowerCase()
        const u = (d.username ?? '').toLowerCase()
        return name.includes(search) || u.includes(search)
      })
    : dialogs

  return c.json({ dialogs: filtered })
})

interface DialogLike {
  entity?: unknown
}

dialogsRoutes.get('/avatar/:id', async (c) => {
  const sessionString = getSession(c.req.raw.headers)
  if (!sessionString) return c.json({ error: 'not authenticated' }, 401)

  const dialogId = c.req.param('id')

  const cached = getCachedAvatar(sessionString, dialogId)
  if (cached === null) return c.body(null, 204)
  if (cached) {
    c.header('Content-Type', 'image/jpeg')
    c.header('Cache-Control', 'private, max-age=3600')
    return stream(c, async (s) => {
      await s.write(cached)
    })
  }

  const dialog = getCachedDialog(sessionString, dialogId) as DialogLike | null
  if (!dialog || !dialog.entity) {
    return c.json({ error: 'dialog not loaded — fetch /api/dialogs first' }, 404)
  }

  if (!entityHasPhoto(dialog.entity)) {
    setCachedAvatar(sessionString, dialogId, null)
    return c.body(null, 204)
  }

  let client
  try {
    client = await getClientForSession(sessionString)
  } catch {
    return c.json({ error: 'not authenticated' }, 401)
  }

  try {
    const result = await client.downloadProfilePhoto(dialog.entity as never, { isBig: false })
    if (!Buffer.isBuffer(result) || result.length === 0) {
      setCachedAvatar(sessionString, dialogId, null)
      return c.body(null, 204)
    }
    setCachedAvatar(sessionString, dialogId, result)
    c.header('Content-Type', 'image/jpeg')
    c.header('Cache-Control', 'private, max-age=3600')
    return stream(c, async (s) => {
      await s.write(result)
    })
  } catch {
    setCachedAvatar(sessionString, dialogId, null)
    return c.body(null, 204)
  }
})
