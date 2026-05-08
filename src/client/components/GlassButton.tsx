import type { ReactNode } from 'react'

interface GlassButtonProps {
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  fullWidth?: boolean
}

export function GlassButton({
  onClick,
  disabled,
  children,
  fullWidth,
}: GlassButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`glass-cta py-2.5 px-7 flex items-center justify-center gap-2 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  )
}
