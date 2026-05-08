import { useTranslation } from '../i18n/useTranslation'

function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l8 3v6c0 4.5-3.2 8.4-8 9.5-4.8-1.1-8-5-8-9.5V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.5l2 2L15 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ServerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="7" r="0.8" fill="currentColor" />
      <circle cx="7" cy="17" r="0.8" fill="currentColor" />
    </svg>
  )
}

function BrowserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="8" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

function TelegramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 4L3 11l5.5 2L11 19l3-4 4 3 3-14z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckCircle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PrivacyAssurance() {
  const { t } = useTranslation()

  const points = [
    t.privacy.pointSession,
    t.privacy.pointNoStore,
    t.privacy.pointDownload,
    t.privacy.pointPublic,
  ]

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
          <ShieldIcon size={18} />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm">{t.privacy.title}</span>
          <span className="text-xs text-text-muted">{t.privacy.subtitle}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-text-muted">
        <FlowNode icon={<BrowserIcon />} label={t.privacy.flowBrowser} note={t.privacy.flowBrowserNote} />
        <FlowNode icon={<ServerIcon />} label={t.privacy.flowServer} note={t.privacy.flowServerNote} />
        <FlowNode icon={<TelegramIcon />} label={t.privacy.flowTelegram} note={t.privacy.flowTelegramNote} />
      </div>

      <ul className="flex flex-col gap-2 text-xs">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-success shrink-0 mt-0.5">
              <CheckCircle size={14} />
            </span>
            <span className="text-text">{p}</span>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-text-muted leading-relaxed">{t.privacy.disclaimer}</p>
    </div>
  )
}

function FlowNode({
  icon,
  label,
  note,
}: {
  icon: React.ReactNode
  label: string
  note: string
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 px-1">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-[var(--border)] text-text flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] font-medium text-text">{label}</span>
      <span className="text-[10px] leading-tight">{note}</span>
    </div>
  )
}
