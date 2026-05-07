import { Link, NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { trackEvent } from '../../lib/analytics'
import { useAuth } from '../../lib/auth/AuthContext'

const navItems = [
  { to: '/programs', label: '科考活动' },
  { to: '/cooperation', label: '合作共建' },
  { to: '/impact', label: '公益行动' },
  { to: '/science', label: '科研与公民科学' },
  { to: '/resources', label: '资源中心' },
  { to: '/about', label: '关于我们' },
]

const authLinkClass =
  'rounded-[999px] px-3 py-1.5 text-sm text-white/85 transition-colors duration-200 hover:bg-white/20 hover:text-white'
const authLinkActiveClass = 'rounded-[999px] bg-white/25 px-3 py-1.5 text-sm text-white shadow-[var(--shadow-soft)]'

export function SiteLayout() {
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="fixed inset-x-0 top-4 z-50">
        <div className="container-page">
          <div className="flex h-[72px] items-center justify-between rounded-[999px] border border-white/30 bg-[rgba(20,30,24,0.32)] px-4 text-white shadow-[var(--shadow-card)] backdrop-blur-md md:px-6">
          <Link
            to="/"
            onClick={() => trackEvent('click_logo', { sourcePath: 'header' })}
            className="flex items-center gap-3 text-base font-semibold text-white md:text-lg"
          >
            <img src="/logo-brand.png" alt="TerraMar Logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="flex flex-col leading-tight">
              <span>山海自然科考</span>
              <span className="text-[0.92em] italic text-white/90">TerraMar Expeditions</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => trackEvent('click_nav_item', { item: item.to })}
                className={({ isActive }) =>
                  `text-sm transition-colors duration-200 ${
                    isActive
                      ? 'rounded-[999px] bg-white/25 px-3 py-1.5 text-white shadow-[var(--shadow-soft)]'
                      : 'rounded-[999px] px-3 py-1.5 text-white/85 hover:bg-white/20 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-1 border-l border-white/25 pl-4">
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/account"
                    onClick={() => trackEvent('click_nav_item', { item: '/account' })}
                    className={({ isActive }) => (isActive ? authLinkActiveClass : authLinkClass)}
                    title={user?.displayName}
                  >
                    账户
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      void logout()
                      trackEvent('cloud_logout', {})
                    }}
                    className={authLinkClass}
                  >
                    退出
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => trackEvent('click_nav_item', { item: '/login' })}
                    className={({ isActive }) => (isActive ? authLinkActiveClass : authLinkClass)}
                  >
                    登录
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => trackEvent('click_nav_item', { item: '/register' })}
                    className={({ isActive }) => (isActive ? authLinkActiveClass : authLinkClass)}
                  >
                    注册
                  </NavLink>
                </>
              )}
            </div>
          </nav>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-[999px] border border-white/30 bg-white/15 px-3 py-1.5 text-sm text-white md:hidden"
            aria-label="打开导航菜单"
          >
            菜单
          </button>
          <Link
            to="/programs"
            className="hidden min-h-11 items-center justify-center rounded-[999px] bg-white/90 px-5 py-2 text-sm font-medium text-[#1F3328] hover:bg-white md:inline-flex"
          >
            查看近期活动
          </Link>
        </div>
        </div>
        {isOpen && (
          <div className="container-page mt-2 md:hidden">
            <div className="rounded-[24px] border border-white/30 bg-[rgba(20,30,24,0.62)] p-3 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 border-b border-[rgba(47,79,58,0.12)] pb-2">
                <img src="/logo-brand.png" alt="TerraMar Logo" className="h-8 w-8 rounded-full object-cover" />
                <p className="text-sm font-medium text-white">TerraMar Expeditions</p>
              </div>
              <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    trackEvent('click_nav_item', { item: item.to })
                    setIsOpen(false)
                  }}
                  className="rounded-[12px] px-3 py-2 text-sm text-white/90 hover:bg-white/20 hover:text-white"
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-2 border-t border-white/20 pt-2">
                {isAuthenticated ? (
                  <>
                    <NavLink
                      to="/account"
                      onClick={() => {
                        trackEvent('click_nav_item', { item: '/account' })
                        setIsOpen(false)
                      }}
                      className="block rounded-[12px] px-3 py-2 text-sm text-white/90 hover:bg-white/20"
                    >
                      我的账户{user?.displayName ? `（${user.displayName}）` : ''}
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        void logout()
                        setIsOpen(false)
                        trackEvent('cloud_logout', { source: 'mobile_menu' })
                      }}
                      className="w-full rounded-[12px] px-3 py-2 text-left text-sm text-white/90 hover:bg-white/20"
                    >
                      退出登录
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block rounded-[12px] px-3 py-2 text-sm text-white/90 hover:bg-white/20"
                    >
                      山海云登录
                    </NavLink>
                    <NavLink
                      to="/register"
                      onClick={() => setIsOpen(false)}
                      className="block rounded-[12px] px-3 py-2 text-sm text-white/90 hover:bg-white/20"
                    >
                      注册账号
                    </NavLink>
                  </>
                )}
              </div>
              </div>
              <Link
                to="/programs"
                onClick={() => setIsOpen(false)}
                className="mt-2 inline-flex min-h-11 items-center justify-center rounded-[999px] bg-white/90 px-4 py-2 text-sm font-medium text-[#1F3328]"
              >
                查看近期活动
              </Link>
            </div>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-20 border-t border-[rgba(47,79,58,0.2)] bg-[#1F3328] text-[#EDE8DC]">
        <div className="container-page py-12 text-sm text-slate-600">
          <div className="flex items-center gap-2 text-[#F7F4EC]">
            <img src="/logo-brand.png" alt="TerraMar Logo" className="h-9 w-9 rounded-full object-cover" />
            <p className="font-medium">TerraMar Expeditions 山海自然科考</p>
          </div>
          <p className="mt-2 text-[#DDD5C5]">让保护被看见，让自然可感知，让参与有意义。</p>
          <p className="mt-2 text-[#DDD5C5]">服务区域：长三角优先</p>
          <p className="mt-1 text-[#DDD5C5]">手机：138-0000-0000</p>
          <p className="mt-1 text-[#DDD5C5]">微信：TerraMarEdu</p>
          <p className="mt-1 text-[#DDD5C5]">邮箱：hello@terramar.example</p>
          <p className="mt-1 text-[#DDD5C5]">商务邮箱：partnership@terramar.example</p>
          <p className="mt-2 text-xs text-[#DDD5C5]">© 2026 TerraMar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
