import { Link } from 'react-router-dom'
import { ORDER_QUICK_TILES } from '../../lib/account/orderStatus'

/** 订单五态快捷入口（仪表板 / 订单页可复用） */
export function AccountOrderQuickTiles({ className = '' }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-5 gap-2 sm:gap-3 ${className}`} role="list">
      {ORDER_QUICK_TILES.map((tile) => (
        <li key={tile.status} className="min-w-0">
          <Link
            to={`/account/orders?status=${encodeURIComponent(tile.status)}`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] px-1 py-3 text-center transition hover:border-[rgba(47,79,58,0.22)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] sm:py-3.5"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(47,79,58,0.1)] text-sm font-semibold text-[var(--brand-deep)]"
              aria-hidden
            >
              {tile.icon}
            </span>
            <span className="text-[11px] font-medium leading-tight text-[var(--text-primary)] sm:text-xs">{tile.label}</span>
            <span className="hidden text-[10px] text-[var(--text-tertiary)] sm:block">{tile.hint}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
