import { useTranslation } from '../i18n/useTranslation'

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'month'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeFor(preset: Preset): { from: string; to: string } {
  const today = new Date()
  switch (preset) {
    case 'today':
      return { from: isoDay(today), to: isoDay(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(today.getDate() - 1)
      return { from: isoDay(y), to: isoDay(y) }
    }
    case '7d': {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      return { from: isoDay(start), to: isoDay(today) }
    }
    case '30d': {
      const start = new Date(today)
      start.setDate(today.getDate() - 29)
      return { from: isoDay(start), to: isoDay(today) }
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: isoDay(start), to: isoDay(today) }
    }
  }
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const { t } = useTranslation()

  const presets: { id: Preset; label: string }[] = [
    { id: 'today', label: t.range.today },
    { id: 'yesterday', label: t.range.yesterday },
    { id: '7d', label: t.range.last7 },
    { id: '30d', label: t.range.last30 },
    { id: 'month', label: t.range.thisMonth },
  ]

  const activePreset: Preset | null = (() => {
    for (const p of presets) {
      const r = rangeFor(p.id)
      if (r.from === from && r.to === to) return p.id
    }
    return null
  })()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = activePreset === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const r = rangeFor(p.id)
                onChange(r.from, r.to)
              }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                active
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-text-muted hover:text-text hover:border-text-muted'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="text-text-muted uppercase tracking-wide">{t.range.from}</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange(e.target.value, to)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="text-text-muted uppercase tracking-wide">{t.range.to}</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange(from, e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
