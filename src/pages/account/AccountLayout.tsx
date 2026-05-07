import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccountSidebarNav } from '../../components/account/AccountSidebarNav'
import { useAuth } from '../../lib/auth/AuthContext'
import { buildAuthHref, joinReturnPath } from '../../lib/joinRouting'

const MOBILE_NAV = [
  { to: '/', label: '首页', icon: '⌂' },
  { to: '/account/orders', label: '订单', icon: '订' },
  { to: '/account/courses', label: '课程', icon: '课' },
  { to: '/account/tasks', label: '任务', icon: '务' },
] as const

export function AccountLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!isAuthenticated || !user) {
    const next = joinReturnPath(location.pathname, location.search)
    return <Navigate to={buildAuthHref('/login', { next })} replace />
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="min-h-[calc(100vh-1rem)] bg-[var(--bg-base)] pb-24 pt-[8.5rem] lg:pb-10 lg:pt-28">
      {/* 移动端顶栏（位于全站顶栏下方） */}
      <div className="fixed inset-x-0 top-[5.5rem] z-30 flex h-12 items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-surface)]/95 px-4 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[rgba(47,79,58,0.12)] bg-[#fffaf2] text-sm font-medium text-[var(--brand-deep)]"
          aria-expanded={drawerOpen}
          aria-controls="account-nav-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          菜单
        </button>
        <p className="text-sm font-semibold text-[var(--brand-deep)]">个人中心</p>
        <Link
          to="/account/profile"
          className="text-xs font-medium text-[var(--brand-primary)]"
          onClick={closeDrawer}
        >
          资料
        </Link>
      </div>

      <div className="container-page flex gap-0 lg:gap-8">
        {/* 桌面侧边栏 */}
        <aside
          className="sticky top-28 hidden h-[calc(100vh-8rem)] w-[260px] shrink-0 flex-col rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] shadow-[var(--shadow-soft)] lg:flex"
          aria-label="个人中心导航"
        >
          <AccountSidebarNav user={user} />
          <div className="mt-auto border-t border-[var(--border-light)] p-4">
            <button
              type="button"
              className="tm-btn tm-btn-secondary w-full text-sm"
              onClick={() => void logout()}
            >
              退出登录
            </button>
            <p className="mt-2 text-center text-[10px] text-[var(--text-tertiary)]">演示数据 · 本地存储</p>
          </div>
        </aside>

        {/* 主内容 */}
        <main
          id="account-main"
          className="min-w-0 flex-1 bg-[var(--bg-base)] lg:rounded-2xl lg:border lg:border-[rgba(47,79,58,0.06)] lg:bg-[rgba(255,251,245,0.5)] lg:p-6"
        >
          <div className="mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 抽屉 */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="关闭菜单"
            onClick={closeDrawer}
          />
          <div
            id="account-nav-drawer"
            className="absolute left-0 top-0 flex h-full w-[min(300px,88vw)] flex-col border-r border-[var(--border-light)] bg-[var(--bg-surface)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] p-3">
              <span className="text-sm font-semibold text-[var(--brand-deep)]">导航</span>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]"
                onClick={closeDrawer}
              >
                关闭
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AccountSidebarNav user={user} onNavigate={closeDrawer} />
            </div>
            <div className="border-t border-[var(--border-light)] p-3">
              <button type="button" className="tm-btn tm-btn-secondary w-full text-sm" onClick={() => void logout()}>
                退出登录
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 底部快速导航 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--border-light)] bg-[var(--bg-surface)]/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-sm lg:hidden"
        aria-label="个人中心快捷入口"
      >
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to + item.label}
            to={item.to}
            className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-[var(--text-secondary)]"
          >
            <span className="text-sm" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-[var(--text-secondary)]"
          onClick={() => setDrawerOpen(true)}
        >
          <span className="text-sm" aria-hidden>
            ≡
          </span>
          <span>更多</span>
        </button>
      </nav>
    </div>
  )
}
