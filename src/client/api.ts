export interface AuthUser {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  phone: string | null
}

export type DialogType = 'user' | 'group' | 'channel'

export interface Dialog {
  id: string
  type: DialogType
  name: string
  username: string | null
  unreadCount: number
  lastMessage: string | null
  lastDate: string | null
  hasPhoto: boolean
  photo: null
}

export type ExportFormat = 'jsonl-per-dialog' | 'json-combined'

export interface ExportConfig {
  dialogIds: string[]
  dateFrom: string
  dateTo: string
  includeForwarded: boolean
  includeReplies: boolean
  format: ExportFormat
}

export type ProgressEvent =
  | { type: 'progress'; dialog: string; current: number; total: number }
  | { type: 'done'; files: string[]; totalMessages: number }
  | { type: 'error'; message: string }

const SESSION_KEY = 'tg-export.session.v1'

export function loadSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSession(session: string): void {
  try {
    localStorage.setItem(SESSION_KEY, session)
  } catch {
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const session = loadSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  }
  if (session) headers['X-TG-Session'] = session

  const res = await fetch(url, { ...init, headers })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `request failed: ${res.status}`)
  }
  return data
}

export const api = {
  me: () =>
    jsonFetch<{ authenticated: boolean; user?: AuthUser }>('/api/auth/me'),

  authStart: (phone: string) =>
    jsonFetch<{
      status: 'code_sent' | 'already_authorized'
      authId?: string
      user?: AuthUser
      session?: string
    }>('/api/auth/start', { method: 'POST', body: JSON.stringify({ phone }) }),

  authVerify: (authId: string, code: string) =>
    jsonFetch<{
      status: 'ok' | '2fa_required'
      authId?: string
      user?: AuthUser
      session?: string
    }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ authId, code }),
    }),

  authPassword: (authId: string, password: string) =>
    jsonFetch<{ status: 'ok'; user: AuthUser; session: string }>('/api/auth/2fa', {
      method: 'POST',
      body: JSON.stringify({ authId, password }),
    }),

  logout: () =>
    jsonFetch<{ status: 'ok' }>('/api/auth/logout', { method: 'POST' }),

  dialogs: (search: string) => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    return jsonFetch<{ dialogs: Dialog[] }>(`/api/dialogs?${q.toString()}`)
  },

  exportStart: (config: ExportConfig) =>
    jsonFetch<{ exportId: string }>('/api/export/start', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  exportDownloadUrl: (exportId: string): string => `/api/export/download/${exportId}`,
}
