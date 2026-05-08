import { LOCALES, LOCALE_LABEL } from '../i18n/strings'
import { useTranslation } from '../i18n/useTranslation'

export function LangSwitcher() {
  const { locale, setLocale, t } = useTranslation()
  return (
    <label className="flex items-center gap-1.5" aria-label={t.header.language}>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof LOCALES[number])}
        className="bg-bg-input border border-border rounded-md text-xs py-1 px-2 outline-none focus:border-accent transition-colors"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABEL[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
