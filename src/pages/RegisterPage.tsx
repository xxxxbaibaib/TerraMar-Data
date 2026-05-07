import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { CloudMembershipType } from '../lib/auth/types'
import { useAuth } from '../lib/auth/AuthContext'
import { buildAuthHref, resolveCloudJoinIntent, safeNextPath } from '../lib/joinRouting'
import { RegisterEmailNoticeCard } from '../components/auth/RegisterEmailNoticeCard'

function initialMembershipFromSearch(): CloudMembershipType {
  if (typeof window === 'undefined') return 'individual'
  const sp = new URLSearchParams(window.location.search)
  return resolveCloudJoinIntent(sp.get('intent'), sp.get('entry')) === 'network' ? 'organization' : 'individual'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { register } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [loginKey, setLoginKey] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [membershipType, setMembershipType] = useState<CloudMembershipType>(initialMembershipFromSearch)
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null)

  const nextRaw = searchParams.get('next')
  const intent = searchParams.get('intent')
  const entry = searchParams.get('entry')
  const nextSafe = useMemo(() => safeNextPath(nextRaw), [nextRaw])
  const joinIntent = useMemo(() => resolveCloudJoinIntent(intent, entry), [intent, entry])

  const loginHref = buildAuthHref('/login', { next: nextRaw, intent, entry })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPasswordMismatch(false)
    if (password !== passwordConfirm) {
      setPasswordMismatch(true)
      return
    }
    try {
      const result = await register({
        displayName,
        loginKey,
        password,
        membershipType,
        orgName: membershipType === 'organization' ? orgName : undefined,
        joinIntent,
      })
      if (result.status === 'awaiting_email') {
        setAwaitingEmail(result.email)
        return
      }
      navigate(nextSafe ?? '/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    }
  }

  if (awaitingEmail) {
    return (
      <div className="tm-page tm-page-narrow">
        <h1 className="tm-page-title">注册山海云账号</h1>
        <p className="tm-page-lead">还差一步：验证邮箱后即可登录。</p>
        <div className="mt-8">
          <RegisterEmailNoticeCard email={awaitingEmail} loginHref={loginHref} />
        </div>
        <p className="tm-page-footer-note">
          填错了？<Link to={{ pathname: '/register', search: location.search }}>重新填写</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="tm-page tm-page-narrow">
      <h1 className="tm-page-title">注册山海云账号</h1>
      <p className="tm-page-lead">
        {joinIntent === 'network'
          ? '您从「加入自然教育网络」进入：默认注册为机构账号（演示）；提交后可在「我的账户」查看机构状态。'
          : joinIntent === 'shanhai'
            ? '您从「加入山海」登记流程进入：将创建个人山海云账号并默认主身份为游客（演示），账号密码规则与首页加入山海、注册页一致。'
            : joinIntent === 'volunteer'
              ? '您从「参与公益行动」进入：将创建个人账号并默认主身份为志愿者（演示）。'
              : joinIntent === 'citizen_science'
                ? '您从「加入公民科学」进入：将创建个人账号并默认主身份为公民科学家（演示）。'
                : joinIntent === 'activity'
                  ? '您从「加入自然教育活动」进入：将创建个人账号并默认主身份为游客（演示）。'
                  : '新用户默认可在账户页选择主身份与贡献轨（演示数据）。'}
      </p>
      <form className="tm-form" onSubmit={handleSubmit}>
        {error && <p className="tm-form-error">{error}</p>}
        <label className="tm-field">
          <span className="tm-field-label">显示名称</span>
          <input
            className="tm-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
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
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setPasswordMismatch(false)
            }}
            required
            minLength={4}
          />
        </label>
        <label className="tm-field">
          <span className="tm-field-label">确认密码</span>
          <input
            className="tm-input"
            type="password"
            name="password-confirm"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value)
              setPasswordMismatch(false)
            }}
            required
            minLength={4}
          />
          {passwordMismatch ? <span className="tm-field-hint">两次输入的密码不一致。</span> : null}
        </label>
        <fieldset className="tm-fieldset">
          <legend className="tm-field-label">会员类型</legend>
          <label className="tm-radio">
            <input
              type="radio"
              name="membership"
              checked={membershipType === 'individual'}
              onChange={() => setMembershipType('individual')}
            />
            个人
          </label>
          <label className="tm-radio">
            <input
              type="radio"
              name="membership"
              checked={membershipType === 'organization'}
              onChange={() => setMembershipType('organization')}
            />
            机构
          </label>
        </fieldset>
        {membershipType === 'organization' && (
          <label className="tm-field">
            <span className="tm-field-label">机构名称</span>
            <input
              className="tm-input"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </label>
        )}
        <button className="tm-btn tm-btn-primary" type="submit">
          注册并登录
        </button>
      </form>
      <p className="tm-page-footer-note">
        已有账号？<Link to={loginHref}>登录</Link>（无需重复注册，登录后将返回加入流程）
      </p>
    </div>
  )
}
