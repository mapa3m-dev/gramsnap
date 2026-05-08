import { useCallback, useRef, useState } from 'react'
import { api, type ExportConfig, type ProgressEvent } from '../api'

interface ExportState {
  status: 'idle' | 'running' | 'done' | 'error'
  exportId: string | null
  progress: { dialog: string; current: number; total: number } | null
  files: string[]
  totalMessages: number
  error: string | null
}

const INITIAL: ExportState = {
  status: 'idle',
  exportId: null,
  progress: null,
  files: [],
  totalMessages: 0,
  error: null,
}

export function useExport() {
  const [state, setState] = useState<ExportState>(INITIAL)
  const sourceRef = useRef<EventSource | null>(null)

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }
  }, [])

  const startExport = useCallback(
    async (config: ExportConfig) => {
      stop()
      setState({ ...INITIAL, status: 'running' })
      let exportId: string
      try {
        const res = await api.exportStart(config)
        exportId = res.exportId
      } catch (err) {
        setState({
          ...INITIAL,
          status: 'error',
          error: err instanceof Error ? err.message : 'failed to start',
        })
        return
      }

      setState((s) => ({ ...s, exportId }))

      const es = new EventSource(`/api/export/progress/${exportId}`)
      sourceRef.current = es

      const handle = (raw: MessageEvent) => {
        try {
          const event = JSON.parse(raw.data) as ProgressEvent
          if (event.type === 'progress') {
            setState((s) => ({
              ...s,
              progress: {
                dialog: event.dialog,
                current: event.current,
                total: event.total,
              },
            }))
          } else if (event.type === 'done') {
            setState((s) => ({
              ...s,
              status: 'done',
              files: event.files,
              totalMessages: event.totalMessages,
            }))
            es.close()
            sourceRef.current = null
          } else if (event.type === 'error') {
            setState((s) => ({ ...s, status: 'error', error: event.message }))
          }
        } catch {
        }
      }

      es.addEventListener('progress', handle)
      es.addEventListener('done', handle)
      es.addEventListener('error', handle)
      es.onerror = () => {
        es.close()
        sourceRef.current = null
      }
    },
    [stop],
  )

  const download = useCallback(() => {
    if (!state.exportId || state.status !== 'done') return
    const url = api.exportDownloadUrl(state.exportId)
    window.location.href = url
  }, [state.exportId, state.status])

  const reset = useCallback(() => {
    stop()
    setState(INITIAL)
  }, [stop])

  return { state, startExport, download, reset }
}
