import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import { isMockAuthMode, isSupabaseConfigured } from '../../lib/supabase/env'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const mockMode = isMockAuthMode()

  if (!isSupabaseConfigured() || mockMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-[var(--brand-deep)]">CMS 需要 Supabase</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          请在项目根目录配置 <code className="rounded bg-black/5 px-1">VITE_SUPABASE_URL</code> 与{' '}
          <code className="rounded bg-black/5 px-1">VITE_SUPABASE_ANON_KEY</code>
          ，执行迁移 <code className="rounded bg-black/5 px-1">20260808120000_cms_website_admin.sql</code>
          ，并将管理员账号的 <code className="rounded bg-black/5 px-1">profiles.is_staff</code> 设为 true。
        </p>
        <Link to="/" className="tm-btn tm-btn-primary mt-6 inline-flex">
          返回官网
        </Link>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (!user?.isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-[var(--brand-deep)]">无管理权限</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          当前账号不是运营人员。请在 Supabase SQL Editor 执行：
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#1F3328] p-3 text-left text-xs text-[#F7F4EC]">
          {`update public.profiles\nset is_staff = true\nwhere user_id = '<你的 auth.users.id>';`}
        </pre>
        <Link to="/" className="tm-btn tm-btn-secondary mt-6 inline-flex">
          返回官网
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
