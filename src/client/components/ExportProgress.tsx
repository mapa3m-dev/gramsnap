import { useTranslation } from '../i18n/useTranslation'

interface ExportProgressProps {
  dialog: string
  current: number
  total: number
}

export function ExportProgress({ dialog, current, total }: ExportProgressProps) {
  const { t, locale } = useTranslation()
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : null
  const numFmt = locale === 'ru' ? 'ru-RU' : 'en-US'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{dialog || t.progress.preparing}</span>
        <span className="text-text-muted tabular-nums">
          {current.toLocaleString(numFmt)}
          {total > 0 ? ` / ${total.toLocaleString(numFmt)}` : ''} {t.progress.messagesUnit}
        </span>
      </div>
      <div className="h-1.5 bg-bg-input rounded overflow-hidden relative">
        <div
          className={`h-full bg-accent transition-all ${pct === null ? 'animate-pulse' : ''}`}
          style={{ width: pct === null ? '40%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}
