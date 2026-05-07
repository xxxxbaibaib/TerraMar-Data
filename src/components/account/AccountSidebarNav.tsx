import { NavLink } from 'react-router-dom'
import type { CloudUserRecord } from '../../lib/auth/types'
import { primaryRoleLabel } from '../../lib/auth/types'
import { useProgramOrders } from '../../hooks/useProgramOrders'
import { combinedResourceProgress, getSlugProgress } from '../../lib/resources/resourceProgressStore'
import type { MockCourseOrder } from '../../mock/accountOrders'
import { orderStatusCounts } from '../../mock/accountOrders'
import { resources } from '../../mock/resources'

export type AccountNavItem = {
  to: string
  label: string
  icon: string
  end?: boolean
  badge?: number | null
}

function navForUser(_user: CloudUserRecord, orders: MockCourseOrder[]): AccountNavItem[] {
  const counts = orderStatusCounts(orders)
  const pendingPay = counts.pending_payment
  const inProgressCourses = resources.filter((r) => {
    const p = getSlugProgress(_user.id, r.slug)
    const c = combinedResourceProgress(Boolean(r.videoUrl), p)
    return c > 0 && c < 100
  }).length
  const claimableTasks = 2
  const unreadTickets = 0

  return [
    { to: '/account', label: '仪表板', icon: '仪', end: true },
    { to: '/account/orders', label: '我的订单', icon: '订', badge: pendingPay > 0 ? pendingPay : null },
    { to: '/account/courses', label: '我的课程', icon: '课', badge: inProgressCourses },
    { to: '/account/footprint', label: '我的足迹', icon: '迹' },
    { to: '/account/tasks', label: '任务中心', icon: '务', badge: claimableTasks > 0 ? claimableTasks : null },
    { to: '/account/wishlist', label: '我的收藏', icon: '藏' },
    { to: '/account/addresses', label: '地址簿', icon: '址' },
    { to: '/account/security', label: '安全设置', icon: '盾' },
    { to: '/account/support', label: '客服帮助', icon: '助', badge: unreadTickets > 0 ? unreadTickets : null },
  ]
}

function linkClass(active: boolean) {
  return [
    'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
    active
      ? 'bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] font-medium text-[var(--brand-primary)]'
      : 'text-[var(--text-primary)] hover:bg-[rgba(47,79,58,0.06)]',
  ].join(' ')
}

export function AccountSidebarNav({
  user,
  onNavigate,
}: {
  user: CloudUserRecord
  onNavigate?: () => void
}) {
  const { orders } = useProgramOrders(user.id)
  const items = navForUser(user, orders)
  const initial = user.displayName.trim().charAt(0) || '用'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-light)] p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-lg font-semibold text-[var(--brand-deep)]"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">{user.displayName}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {user.membershipType === 'organization' ? '机构账号' : primaryRoleLabel(user.primaryRole)}
            </p>
          </div>
        </div>
        <NavLink
          to="/account/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mt-3 block text-center text-xs font-medium ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] underline-offset-2 hover:underline'}`
          }
        >
          编辑资料 →
        </NavLink>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="个人中心">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => linkClass(isActive)}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,79,58,0.08)] text-xs font-semibold text-[var(--brand-deep)]"
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 ? (
              <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[11px] font-medium text-[#f8f2e8]">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
