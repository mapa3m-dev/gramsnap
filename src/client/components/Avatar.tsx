import { useEffect, useRef, useState } from 'react'
import { loadSession } from '../api'

interface AvatarProps {
  dialogId: string
  name: string
  hasPhoto: boolean
  size?: number
}

type Entry = string | null
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<Entry>>()

const MAX_CONCURRENT = 4
let activeFetches = 0
const fetchQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT) {
    activeFetches++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    fetchQueue.push(() => {
      activeFetches++
      resolve()
    })
  })
}

function releaseSlot(): void {
  activeFetches--
  const next = fetchQueue.shift()
  if (next) next()
}

async function fetchAvatar(dialogId: string): Promise<Entry> {
  const session = loadSession()
  if (!session) return null
  await acquireSlot()
  try {
    const res = await fetch(`/api/dialogs/avatar/${dialogId}`, {
      headers: { 'X-TG-Session': session },
    })
    if (res.status === 204 || !res.ok) return null
    const blob = await res.blob()
    if (blob.size === 0) return null
    return URL.createObjectURL(blob)
  } finally {
    releaseSlot()
  }
}

function loadInto(dialogId: string): Promise<Entry> {
  if (cache.has(dialogId)) return Promise.resolve(cache.get(dialogId)!)
  const existing = inflight.get(dialogId)
  if (existing) return existing
  const p = fetchAvatar(dialogId)
    .then((v) => {
      cache.set(dialogId, v)
      inflight.delete(dialogId)
      return v
    })
    .catch(() => {
      cache.set(dialogId, null)
      inflight.delete(dialogId)
      return null
    })
  inflight.set(dialogId, p)
  return p
}

export function clearAvatarCache(): void {
  for (const v of cache.values()) {
    if (typeof v === 'string') URL.revokeObjectURL(v)
  }
  cache.clear()
  inflight.clear()
  fetchQueue.length = 0
  activeFetches = 0
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const hues = [220, 260, 30, 160, 0, 200, 290, 50]
  const h = hues[Math.abs(hash) % hues.length]
  return `hsl(${h} 55% 35%)`
}

export function Avatar({ dialogId, name, hasPhoto, size = 36 }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(() =>
    cache.has(dialogId) ? (cache.get(dialogId) as Entry) : null,
  )
  const [shouldLoad, setShouldLoad] = useState(() => cache.has(dialogId))
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (shouldLoad || !hasPhoto) return
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            io.disconnect()
            return
          }
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shouldLoad, hasPhoto])

  useEffect(() => {
    if (!shouldLoad || !hasPhoto) return
    if (cache.has(dialogId)) {
      setUrl(cache.get(dialogId) as Entry)
      return
    }
    let cancelled = false
    void loadInto(dialogId).then((v) => {
      if (!cancelled) setUrl(v)
    })
    return () => {
      cancelled = true
    }
  }, [dialogId, hasPhoto, shouldLoad])

  const dimension = { width: size, height: size }

  if (url) {
    return (
      <img
        ref={(el) => {
          wrapRef.current = el as unknown as HTMLDivElement | null
        }}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover"
        style={dimension}
      />
    )
  }

  return (
    <div
      ref={wrapRef}
      className="shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
      style={{
        ...dimension,
        background: avatarColor(name),
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </div>
  )
}
