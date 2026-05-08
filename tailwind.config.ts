import type { Config } from 'tailwindcss'

export default {
  content: ['./src/client/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-input': 'var(--bg-input)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
      },
    },
  },
  plugins: [],
} satisfies Config
