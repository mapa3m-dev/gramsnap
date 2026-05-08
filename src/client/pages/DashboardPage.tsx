import { useEffect, useState } from 'react'
import type { AuthUser, ExportFormat } from '../api'
import { useDialogs } from '../hooks/useDialogs'
import { useExport } from '../hooks/useExport'
import { usePersistedSettings } from '../hooks/usePersistedSettings'
import { useTranslation } from '../i18n/useTranslation'
import { UserPicker } from '../components/UserPicker'
import { DateRangePicker } from '../components/DateRangePicker'
import { ExportProgress } from '../components/ExportProgress'
import { StatusDot } from '../components/StatusDot'
import { LangSwitcher } from '../components/LangSwitcher'
import { GlassButton } from '../components/GlassButton'
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
} from '../components/Icons'

interface DashboardPageProps {
  user: AuthUser
  onLogout: () => void
}

function displayName(user: AuthUser): string {
  const parts = [user.firstName, user.lastName].filter(Boolean) as string[]
  if (parts.length > 0) return parts.join(' ')
  return user.username ?? user.phone ?? user.id
}

export function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const { t } = useTranslation()
  const { dialogs, loading, error, search, setSearch } = useDialogs()
  const { state: exportState, startExport, download, reset } = useExport()
  const { settings, update, updateRange } = usePersistedSettings()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  useEffect(() => {
    if (exportState.status === 'done' && exportState.exportId && exportState.files.length > 0) {
      const handle = setTimeout(() => download(), 400)
      return () => clearTimeout(handle)
    }
  }, [exportState.status, exportState.exportId, exportState.files.length, download])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const isRunning = exportState.status === 'running'
  const canExport =
    selected.size > 0 && Boolean(settings.dateFrom) && Boolean(settings.dateTo) && !isRunning

  const onExport = () => {
    if (!canExport) return
    setDrawerOpen(false)
    void startExport({
      dialogIds: Array.from(selected),
      dateFrom: settings.dateFrom,
      dateTo: settings.dateTo,
      includeForwarded: settings.includeForwarded,
      includeReplies: settings.includeReplies,
      format: settings.format,
    })
  }

  const showExports = exportState.status !== 'idle' || exportState.files.length > 0

  const formatOptions: { id: ExportFormat; title: string; subtitle: string }[] = [
    {
      id: 'jsonl-per-dialog',
      title: t.dashboard.formatJsonl,
      subtitle: t.dashboard.formatJsonlSubtitle,
    },
    {
      id: 'json-combined',
      title: t.dashboard.formatCombined,
      subtitle: t.dashboard.formatCombinedSubtitle,
    },
  ]

  const ctaText = isRunning
    ? t.dashboard.ctaRunning
    : selected.size === 0
      ? t.dashboard.ctaEmpty
      : t.dashboard.cta(selected.size)

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 glass border-x-0 border-t-0 rounded-none">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="md:hidden glass-button rounded-lg p-2 -ml-1"
            onClick={() => setDrawerOpen(true)}
            aria-label={t.dashboard.open}
          >
            <MenuIcon />
          </button>

          <h1 className="font-semibold flex-1 truncate text-sm sm:text-base">
            {t.app.title}
          </h1>

          {selected.size > 0 && (
            <span className="md:hidden text-xs px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 whitespace-nowrap">
              {selected.size}
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 text-sm">
            <StatusDot active title={t.header.connected} />
            <span className="truncate max-w-[140px]">{displayName(user)}</span>
            {user.username && (
              <span className="text-text-muted text-xs hidden md:inline">@{user.username}</span>
            )}
          </div>

          <LangSwitcher />

          <button
            type="button"
            onClick={onLogout}
            className="glass-button rounded-lg p-2 text-text-muted hover:text-error"
            title={t.header.signOut}
            aria-label={t.header.signOut}
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside
          className={`
            ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            fixed md:static inset-y-0 left-0 z-30 w-[88vw] max-w-sm md:w-80
            glass rounded-none md:border-y-0 md:border-l-0
            flex flex-col transition-transform duration-200 ease-out
          `}
        >
          <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border)]">
            <span className="font-semibold">{t.dashboard.chats}</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="glass-button rounded-lg p-2 -mr-1"
              aria-label={t.dashboard.close}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="p-3 border-b border-[var(--border)] flex flex-col gap-2">
            <div className="hidden md:block text-xs uppercase tracking-wide text-text-muted">
              {t.dashboard.chats}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                <SearchIcon />
              </span>
              <input
                type="search"
                placeholder={t.dashboard.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
            {selected.size > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">{t.dashboard.selectedCount(selected.size)}</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-accent hover:underline"
                >
                  {t.dashboard.reset}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <div className="text-text-muted text-sm p-4">{t.dashboard.loading}</div>}
            {error && <div className="text-error text-sm p-4">{error}</div>}
            {!loading && !error && (
              <UserPicker dialogs={dialogs} selected={selected} onToggle={toggleSelected} />
            )}
          </div>
        </aside>

        {drawerOpen && (
          <button
            type="button"
            aria-label={t.dashboard.close}
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
          />
        )}

        <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto md:mx-0 flex flex-col gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden glass flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left text-sm"
            >
              <span className="text-text-muted">{t.dashboard.chatsForExport}:</span>
              <span className="font-medium">
                {selected.size === 0
                  ? t.dashboard.nothingSelected
                  : t.dashboard.selectedCount(selected.size)}
              </span>
              <span className="text-text-muted text-xs ml-auto">{t.dashboard.pickChats}</span>
            </button>

            <section className="glass glass-strong rounded-2xl p-4 md:p-5 flex flex-col gap-4 md:gap-5">
              <h2 className="font-semibold">{t.dashboard.settingsTitle}</h2>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  {t.dashboard.period}
                </label>
                <DateRangePicker
                  from={settings.dateFrom}
                  to={settings.dateTo}
                  onChange={updateRange}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  {t.dashboard.format}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formatOptions.map((opt) => {
                    const active = settings.format === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update('format', opt.id)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'border-accent bg-accent/10'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{opt.title}</span>
                          {active && (
                            <span className="text-accent">
                              <CheckIcon size={14} />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">{opt.subtitle}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.includeForwarded}
                    onChange={(e) => update('includeForwarded', e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  {t.dashboard.includeForwarded}
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.includeReplies}
                    onChange={(e) => update('includeReplies', e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  {t.dashboard.includeReplies}
                </label>
              </div>

              <div className="hidden md:flex justify-center pt-1">
                <GlassButton disabled={!canExport} onClick={onExport}>
                  <DownloadIcon size={14} />
                  {ctaText}
                </GlassButton>
              </div>
            </section>

            {showExports && (
              <section className="glass glass-strong rounded-2xl p-4 md:p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{t.dashboard.resultsTitle}</h2>
                  {!isRunning && (
                    <button
                      type="button"
                      onClick={reset}
                      className="text-xs text-text-muted hover:text-text"
                    >
                      {t.dashboard.clear}
                    </button>
                  )}
                </div>

                {isRunning && exportState.progress && (
                  <ExportProgress
                    dialog={exportState.progress.dialog}
                    current={exportState.progress.current}
                    total={exportState.progress.total}
                  />
                )}

                {exportState.status === 'error' && exportState.error && (
                  <div className="text-error text-sm bg-error/10 border border-error/30 rounded-lg p-3">
                    {exportState.error}
                  </div>
                )}

                {exportState.status === 'done' && exportState.files.length > 0 && (
                  <>
                    <ul className="flex flex-col text-sm border border-[var(--border)] rounded-xl overflow-hidden">
                      {exportState.files.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-3 p-3 border-b border-[var(--border)] last:border-0 bg-white/[0.02]"
                        >
                          <span className="text-success shrink-0">
                            <CheckIcon size={14} />
                          </span>
                          <span className="font-mono text-xs truncate" title={f}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-center pt-1">
                      <GlassButton onClick={download}>
                        <DownloadIcon size={14} />
                        {exportState.files.length > 1
                          ? t.dashboard.downloadAll
                          : t.dashboard.download}
                      </GlassButton>
                    </div>
                    <div className="text-text-muted text-xs">
                      {t.dashboard.summary(exportState.totalMessages, exportState.files.length)}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-10 glass rounded-none border-x-0 border-b-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!canExport}
          onClick={onExport}
          className="glass-cta w-full py-3 flex items-center justify-center gap-2"
        >
          <DownloadIcon />
          {ctaText}
        </button>
      </div>
    </div>
  )
}
