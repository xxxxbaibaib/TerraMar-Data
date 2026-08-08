import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'

const nav = [
  { to: '/admin', end: true, label: '仪表盘' },
  { to: '/admin/settings', label: '站点设置' },
  { to: '/admin/pages', label: '页面文案' },
  { to: '/admin/team', label: '团队' },
  { to: '/admin/programs', label: '科考活动' },
  { to: '/admin/resources', label: '资源中心' },
  { to: '/admin/media', label: '媒体库' },
  { to: '/admin/heroes', label: '背景视频' },
  { to: '/admin/leads', label: '线索' },
  { to: '/admin/maps', label: '地图点位' },
  { to: '/admin/review', label: '内容审核' },
  { to: '/admin/audit', label: '操作日志' },
]

export function AdminShell() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[var(--text-primary)]">
      <header className="border-b border-[rgba(47,79,58,0.12)] bg-[#1F3328] text-[#F7F4EC]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">TerraMar CMS</p>
            <h1 className="text-lg font-semibold">网站管理系统</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/80 sm:inline">{user?.displayName}</span>
            <a href="/" className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10">
              查看官网
            </a>
            <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25" onClick={() => void logout()}>
              退出
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-[var(--brand-deep)] font-medium text-white'
                    : 'bg-white/70 text-[var(--brand-deep)] hover:bg-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 rounded-2xl border border-[rgba(47,79,58,0.1)] bg-white p-4 shadow-sm md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
