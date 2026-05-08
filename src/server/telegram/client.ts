import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { startSocksOverHttpBridge, type SocksBridge } from './proxyBridge.js'

const API_ID = 2040
const API_HASH = 'b18441a1ff607e10a989891a5462e627'

const SESSION_TTL_MS = 15 * 60 * 1000
const AUTH_TTL_MS = 10 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000

interface DialogCache {
  byId: Map<string, unknown>
  cachedAt: number
}

interface CachedClient {
  client: TelegramClient
  lastAccess: number
  dialogs?: DialogCache
  avatars: Map<string, Buffer | null>
}

const DIALOG_CACHE_TTL_MS = 5 * 60 * 1000

interface PendingAuth {
  client: TelegramClient
  phone: string
  phoneCodeHash: string
  expires: number
}

const sessionClients = new Map<string, CachedClient>()
const pendingAuths = new Map<string, PendingAuth>()
let bridge: SocksBridge | null = null
let bridgeInitDone = false

async function ensureBridge(): Promise<void> {
  if (bridgeInitDone) return
  bridgeInitDone = true
  const httpProxy =
    process.env.TELEGRAM_HTTP_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
  if (!httpProxy) return
  try {
    bridge = await startSocksOverHttpBridge(httpProxy)
  } catch (err) {
    console.error('[client] failed to start proxy bridge:', err)
  }
}

function proxyOptions() {
  if (!bridge) return undefined
  return { ip: bridge.host, port: bridge.port, socksType: 5 as const }
}

function buildClient(sessionString: string): TelegramClient {
  return new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: false,
    deviceModel: 'gramsnap',
    systemVersion: 'web',
    appVersion: '0.1.0',
    proxy: proxyOptions(),
  })
}

export async function initServer(): Promise<void> {
  await ensureBridge()
  setInterval(sweep, SWEEP_INTERVAL_MS).unref()
}

function sweep(): void {
  const now = Date.now()
  for (const [key, val] of sessionClients) {
    if (now - val.lastAccess > SESSION_TTL_MS) {
      void val.client.disconnect().catch(() => {})
      sessionClients.delete(key)
    }
  }
  for (const [key, val] of pendingAuths) {
    if (now > val.expires) {
      void val.client.disconnect().catch(() => {})
      pendingAuths.delete(key)
    }
  }
}

export async function getClientForSession(sessionString: string): Promise<TelegramClient> {
  await ensureBridge()
  const cached = sessionClients.get(sessionString)
  if (cached) {
    cached.lastAccess = Date.now()
    return cached.client
  }
  const client = buildClient(sessionString)
  await client.connect()
  sessionClients.set(sessionString, {
    client,
    lastAccess: Date.now(),
    avatars: new Map(),
  })
  return client
}

export function getSessionState(sessionString: string): CachedClient | null {
  return sessionClients.get(sessionString) ?? null
}

export function setDialogsCache(sessionString: string, dialogs: { id?: { toString(): string } }[]): void {
  const state = sessionClients.get(sessionString)
  if (!state) return
  const byId = new Map<string, unknown>()
  for (const d of dialogs) {
    const id = d.id ? d.id.toString() : ''
    if (id) byId.set(id, d)
  }
  state.dialogs = { byId, cachedAt: Date.now() }
}

export function getCachedDialog(sessionString: string, dialogId: string): unknown | null {
  const state = sessionClients.get(sessionString)
  if (!state?.dialogs) return null
  if (Date.now() - state.dialogs.cachedAt > DIALOG_CACHE_TTL_MS) return null
  return state.dialogs.byId.get(dialogId) ?? null
}

export function getCachedAvatar(sessionString: string, dialogId: string): Buffer | null | undefined {
  const state = sessionClients.get(sessionString)
  if (!state) return undefined
  return state.avatars.get(dialogId)
}

export function setCachedAvatar(
  sessionString: string,
  dialogId: string,
  buf: Buffer | null,
): void {
  const state = sessionClients.get(sessionString)
  if (!state) return
  state.avatars.set(dialogId, buf)
}

export async function disconnectSession(sessionString: string): Promise<void> {
  const cached = sessionClients.get(sessionString)
  if (!cached) return
  sessionClients.delete(sessionString)
  try {
    await cached.client.disconnect()
  } catch {
  }
}

export async function createPendingAuth(authId: string, phone: string): Promise<TelegramClient> {
  await ensureBridge()
  const client = buildClient('')
  await client.connect()
  pendingAuths.set(authId, {
    client,
    phone,
    phoneCodeHash: '',
    expires: Date.now() + AUTH_TTL_MS,
  })
  return client
}

export function setAuthCodeHash(authId: string, phoneCodeHash: string): void {
  const auth = pendingAuths.get(authId)
  if (!auth) return
  auth.phoneCodeHash = phoneCodeHash
  auth.expires = Date.now() + AUTH_TTL_MS
}

export function getPendingAuth(authId: string): PendingAuth | null {
  const auth = pendingAuths.get(authId)
  if (!auth) return null
  if (Date.now() > auth.expires) {
    pendingAuths.delete(authId)
    return null
  }
  return auth
}

export function promoteAuthToSession(authId: string, sessionString: string): void {
  const auth = pendingAuths.get(authId)
  if (!auth) return
  pendingAuths.delete(authId)
  sessionClients.set(sessionString, {
    client: auth.client,
    lastAccess: Date.now(),
    avatars: new Map(),
  })
}

export function discardPendingAuth(authId: string): void {
  const auth = pendingAuths.get(authId)
  if (!auth) return
  pendingAuths.delete(authId)
  void auth.client.disconnect().catch(() => {})
}

export const TELEGRAM_API_ID = API_ID
export const TELEGRAM_API_HASH = API_HASH
