import { useCallback, useEffect, useState } from 'react'
import { api, type Dialog } from '../api'

export function useDialogs() {
  const [search, setSearch] = useState('')
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.dialogs(q)
      setDialogs(res.dialogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load dialogs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      void load(search)
    }, 250)
    return () => clearTimeout(handle)
  }, [search, load])

  return { dialogs, loading, error, search, setSearch, reload: () => load(search) }
}
