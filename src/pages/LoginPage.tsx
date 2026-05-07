import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { buildAuthHref, safeNextPath } from '../lib/joinRouting'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [loginKey, setLoginKey] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const nextRaw = searchParams.get('next')
  const intent = searchParams.get('intent')
  const entry = searchParams.get('entry')
  const nextSafe = safeNextPath(nextRaw)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(loginKey, password)
      navigate(nextSafe ?? '/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    }
  }

  const registerHref = buildAuthHref('/register', { next: nextRaw, intent, entry })

  return (
    <div className="tm-page tm-page-narrow">
      <h1 className="tm-page-title">山海云登录</h1>
      <p className="tm-page-lead">
        演示环境：账号与密码仅保存在本机浏览器，用于原型验收；正式环境将对接山海云 OAuth2 / OIDC。
        {nextSafe ? ' 登录后将返回您刚才的加入流程。' : null}
      </p>
      <form className="tm-form" onSubmit={handleSubmit}>
        {error && <p className="tm-form-error">{error}</p>}
        <label className="tm-field">
          <span className="tm-field-label">手机号或邮箱</span>
          <input
            className="tm-input"
            type="text"
            autoComplete="username"
            value={loginKey}
            onChange={(e) => setLoginKey(e.target.value)}
            required
          />
        </label>
        <label className="tm-field">
          <span className="tm-field-label">密码</span>
          <input
            className="tm-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="tm-btn tm-btn-primary" type="submit">
          登录
        </button>
      </form>
      <p className="tm-page-footer-note">
        还没有账号？<Link to={registerHref}>注册</Link>
      </p>
    </div>
  )
}
