import { Link } from 'react-router-dom'

export function AccountBreadcrumb({ current }: { current: string }) {
  return (
    <nav className="mb-6 text-sm text-[var(--text-secondary)]">
      <Link to="/account" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
        仪表板
      </Link>
      <span className="mx-2 text-[var(--text-tertiary)]">/</span>
      <span className="text-[var(--text-primary)]">{current}</span>
    </nav>
  )
}
