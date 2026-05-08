import { useCallback, useEffect, useState } from 'react'
import { api, clearSession, loadSession, saveSession, type AuthUser } from '../api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    if (!loadSession()) {
      setState({ status: 'unauthenticated' })
      return
    }
    try {
      const res = await api.me()
      if (res.authenticated && res.user) {
        setState({ status: 'authenticated', user: res.user })
      } else {
        clearSession()
        setState({ status: 'unauthenticated' })
      }
    } catch {
      clearSession()
      setState({ status: 'unauthenticated' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setAuthenticated = useCallback((user: AuthUser, session: string) => {
    saveSession(session)
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // ignore
    } finally {
      clearSession()
      setState({ status: 'unauthenticated' })
    }
  }, [])

  return { state, refresh, setAuthenticated, logout }
}
