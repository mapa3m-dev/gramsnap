import { useEffect, useState } from 'react'
import type { ExportFormat } from '../api'

export interface PersistedSettings {
  dateFrom: string
  dateTo: string
  includeForwarded: boolean
  includeReplies: boolean
  format: ExportFormat
}

const STORAGE_KEY = 'tg-export.settings.v1'

function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const DEFAULTS: PersistedSettings = {
  dateFrom: todayISO(-1),
  dateTo: todayISO(0),
  includeForwarded: true,
  includeReplies: true,
  format: 'jsonl-per-dialog',
}

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

export function usePersistedSettings() {
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettings(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
    }
  }, [settings, hydrated])

  const update = <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateRange = (from: string, to: string) => {
    setSettings((prev) => ({ ...prev, dateFrom: from, dateTo: to }))
  }

  return { settings, update, updateRange }
}
