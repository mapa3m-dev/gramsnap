import type { Dialog } from '../api'
import { useTranslation } from '../i18n/useTranslation'
import { Avatar } from './Avatar'

interface UserPickerProps {
  dialogs: Dialog[]
  selected: Set<string>
  onToggle: (id: string) => void
}

const TYPE_COLOR: Record<Dialog['type'], string> = {
  user: 'bg-accent/15 text-accent',
  group: 'bg-success/15 text-success',
  channel: 'bg-warning/15 text-warning',
}

export function UserPicker({ dialogs, selected, onToggle }: UserPickerProps) {
  const { t } = useTranslation()

  const typeLabel: Record<Dialog['type'], string> = {
    user: t.picker.typeUser,
    group: t.picker.typeGroup,
    channel: t.picker.typeChannel,
  }

  if (dialogs.length === 0) {
    return (
      <div className="text-text-muted text-sm py-8 text-center px-4">
        {t.dashboard.nothingFound}
      </div>
    )
  }

  return (
    <ul className="flex flex-col">
      {dialogs.map((d) => {
        const isSelected = selected.has(d.id)
        const name = d.name || t.picker.noName
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onToggle(d.id)}
              className={`glass-row w-full flex items-center gap-3 px-3 py-2.5 text-left ${
                isSelected ? 'is-selected' : ''
              }`}
            >
              <Avatar dialogId={d.id} name={name} hasPhoto={d.hasPhoto} size={36} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-sm">{name}</span>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${TYPE_COLOR[d.type]}`}
                  >
                    {typeLabel[d.type]}
                  </span>
                </div>
                {d.username && (
                  <div className="text-xs text-text-muted truncate">@{d.username}</div>
                )}
              </div>

              <span
                aria-hidden
                className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-accent border-accent'
                    : 'border-[var(--border-strong)]'
                }`}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.5L5 9L9.5 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
