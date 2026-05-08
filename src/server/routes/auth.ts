import { Hono } from 'hono'
import { Api } from 'telegram'
import { computeCheck } from 'telegram/Password.js'
import { randomUUID } from 'node:crypto'
import {
  TELEGRAM_API_ID,
  TELEGRAM_API_HASH,
  createPendingAuth,
  setAuthCodeHash,
  getPendingAuth,
  promoteAuthToSession,
  discardPendingAuth,
  getClientForSession,
  disconnectSession,
} from '../telegram/client.js'
import type { AuthUser } from '../types.js'

function bigIntToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return (v as { toString(): string }).toString()
}

function userToDto(user: Api.TypeUser): AuthUser {
  if (!(user instanceof Api.User)) {
    return { id: '', firstName: null, lastName: null, username: null, phone: null }
  }
  return {
    id: bigIntToString(user.id),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    username: user.username ?? null,
    phone: user.phone ?? null,
  }
}

function isErrorMessage(err: unknown, code: string): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { errorMessage?: string; message?: string }
  return e.errorMessage === code || (e.message?.includes(code) ?? false)
}

function getSessionHeader(headers: Headers): string | null {
  return headers.get('x-tg-session') ?? headers.get('X-TG-Session') ?? null
}

export const authRoutes = new Hono()

authRoutes.get('/me', async (c) => {
  const sessionString = getSessionHeader(c.req.raw.headers)
  if (!sessionString) return c.json({ authenticated: false })
  try {
    const client = await getClientForSession(sessionString)
    const ok = await client.isUserAuthorized()
    if (!ok) return c.json({ authenticated: false })
    const me = await client.getMe()
    return c.json({ authenticated: true, user: userToDto(me) })
  } catch {
    return c.json({ authenticated: false })
  }
})

authRoutes.post('/start', async (c) => {
  const body = await c.req.json<{ phone?: string }>()
  const phone = body.phone?.trim()
  if (!phone) return c.json({ error: 'phone required' }, 400)

  const authId = randomUUID()
  let client
  try {
    client = await createPendingAuth(authId, phone)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'connection_failed' }, 502)
  }

  try {
    const result = (await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: TELEGRAM_API_ID,
        apiHash: TELEGRAM_API_HASH,
        settings: new Api.CodeSettings({}),
      }),
    )) as Api.auth.SentCode | Api.auth.SentCodeSuccess

    if (result instanceof Api.auth.SentCode) {
      setAuthCodeHash(authId, result.phoneCodeHash)
      return c.json({ status: 'code_sent', authId })
    }

    const sessionString = client.session.save() as unknown as string
    promoteAuthToSession(authId, sessionString)
    const me = await client.getMe()
    return c.json({ status: 'already_authorized', user: userToDto(me), session: sessionString })
  } catch (err) {
    discardPendingAuth(authId)
    return c.json({ error: err instanceof Error ? err.message : 'send_code_failed' }, 400)
  }
})

authRoutes.post('/verify', async (c) => {
  const body = await c.req.json<{ authId?: string; code?: string }>()
  const authId = body.authId
  const code = body.code?.trim()
  if (!authId || !code) return c.json({ error: 'authId and code required' }, 400)

  const auth = getPendingAuth(authId)
  if (!auth || !auth.phoneCodeHash) {
    return c.json({ error: 'auth session expired or missing — restart flow' }, 410)
  }

  try {
    const result = (await auth.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: auth.phone,
        phoneCodeHash: auth.phoneCodeHash,
        phoneCode: code,
      }),
    )) as Api.auth.TypeAuthorization

    if (result instanceof Api.auth.Authorization) {
      const sessionString = auth.client.session.save() as unknown as string
      promoteAuthToSession(authId, sessionString)
      return c.json({ status: 'ok', user: userToDto(result.user), session: sessionString })
    }
    discardPendingAuth(authId)
    return c.json({ error: 'unexpected response' }, 500)
  } catch (err) {
    if (isErrorMessage(err, 'SESSION_PASSWORD_NEEDED')) {
      return c.json({ status: '2fa_required', authId })
    }
    if (isErrorMessage(err, 'PHONE_CODE_INVALID')) {
      return c.json({ error: 'invalid_code' }, 400)
    }
    if (isErrorMessage(err, 'PHONE_CODE_EXPIRED')) {
      discardPendingAuth(authId)
      return c.json({ error: 'code_expired' }, 400)
    }
    return c.json({ error: err instanceof Error ? err.message : 'sign_in_failed' }, 400)
  }
})

authRoutes.post('/2fa', async (c) => {
  const body = await c.req.json<{ authId?: string; password?: string }>()
  const authId = body.authId
  const password = body.password
  if (!authId || !password) return c.json({ error: 'authId and password required' }, 400)

  const auth = getPendingAuth(authId)
  if (!auth) {
    return c.json({ error: 'auth session expired — restart flow' }, 410)
  }

  try {
    const passwordInfo = await auth.client.invoke(new Api.account.GetPassword())
    const check = await computeCheck(passwordInfo, password)
    const result = (await auth.client.invoke(
      new Api.auth.CheckPassword({ password: check }),
    )) as Api.auth.TypeAuthorization

    if (result instanceof Api.auth.Authorization) {
      const sessionString = auth.client.session.save() as unknown as string
      promoteAuthToSession(authId, sessionString)
      return c.json({ status: 'ok', user: userToDto(result.user), session: sessionString })
    }
    discardPendingAuth(authId)
    return c.json({ error: 'unexpected response' }, 500)
  } catch (err) {
    if (isErrorMessage(err, 'PASSWORD_HASH_INVALID')) {
      return c.json({ error: 'invalid_password' }, 400)
    }
    return c.json({ error: err instanceof Error ? err.message : '2fa_failed' }, 400)
  }
})

authRoutes.post('/logout', async (c) => {
  const sessionString = getSessionHeader(c.req.raw.headers)
  if (sessionString) {
    try {
      const client = await getClientForSession(sessionString)
      await client.invoke(new Api.auth.LogOut()).catch(() => {})
    } catch {
    }
    await disconnectSession(sessionString)
  }
  return c.json({ status: 'ok' })
})
