interface StatusDotProps {
  active: boolean
  title?: string
}

export function StatusDot({ active, title }: StatusDotProps) {
  return (
    <span
      title={title}
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: active ? 'var(--success)' : 'var(--text-muted)' }}
    />
  )
}
