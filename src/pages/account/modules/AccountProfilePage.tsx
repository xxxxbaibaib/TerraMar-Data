import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { useAuth } from '../../../lib/auth/AuthContext'
import type { CloudPrimaryRole } from '../../../lib/auth/types'
import { primaryRoleLabel } from '../../../lib/auth/types'
import { isMockAuthMode } from '../../../lib/supabase/env'
import { getSupabaseClient } from '../../../lib/supabase/client'
import { remoteSaveAccountProfile } from '../../../lib/auth/profileRemoteUpdates'
import { updateUserRecord } from '../../../lib/auth/mockAuthStore'
import { authRegistrationEmail, authRegistrationPhone } from '../../../lib/auth/authRegistrationContact'

const ROLES: { value: CloudPrimaryRole; label: string }[] = [
  { value: 'visitor', label: '游客' },
  { value: 'volunteer', label: '志愿者' },
  { value: 'citizen_scientist', label: '公民科学家' },
]

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length < 7) return raw
  return `${d.slice(0, 3)}****${d.slice(-4)}`
}

export function AccountProfilePage() {
  const { user, setPrimaryRole, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [realName, setRealName] = useState('')
  const [bio, setBio] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [authPhone, setAuthPhone] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [authFetched, setAuthFetched] = useState(false)
  const prevUserIdRef = useRef<string | null>(null)
  const authContactPrefilledRef = useRef(false)

  useEffect(() => {
    if (!user?.id) {
      prevUserIdRef.current = null
      authContactPrefilledRef.current = false
      return
    }
    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id
      authContactPrefilledRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setRealName(user.realName ?? '')
    setBio(user.bio ?? '')
    setProfilePhone(user.profilePhone ?? '')
    setProfileEmail(user.profileEmail ?? '')
  }, [user, user?.displayName, user?.realName, user?.bio, user?.profilePhone, user?.profileEmail])

  useEffect(() => {
    if (!user) {
      setAuthPhone('')
      setAuthEmail('')
      setAuthFetched(false)
      return
    }
    if (isMockAuthMode()) {
      const k = user.loginKey.trim()
      if (k.includes('@')) {
        setAuthPhone('')
        setAuthEmail(k)
      } else {
        setAuthPhone(k)
        setAuthEmail('')
      }
      setAuthFetched(true)
      return
    }
    setAuthFetched(false)
    void getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        const au = data.user
        if (!au) {
          setAuthPhone('')
          setAuthEmail('')
          return
        }
        setAuthPhone(authRegistrationPhone(au))
        setAuthEmail(authRegistrationEmail(au))
      })
      .catch(() => {
        setAuthPhone('')
        setAuthEmail('')
      })
      .finally(() => setAuthFetched(true))
  }, [user])

  /** 服务端业务联系字段为空时，将注册/登录绑定手机、邮箱一次性填入输入框（每用户会话仅一次） */
  useEffect(() => {
    if (!user?.id) return
    if (authContactPrefilledRef.current) return
    if (!isMockAuthMode() && !authFetched) return

    const pPersist = (user.profilePhone ?? '').trim()
    const ePersist = (user.profileEmail ?? '').trim()
    const aPhone = authPhone.trim()
    const aEmail = authEmail.trim()
    const needPhone = !pPersist && Boolean(aPhone)
    const needEmail = !ePersist && Boolean(aEmail)

    if (!needPhone && !needEmail) {
      authContactPrefilledRef.current = true
      return
    }

    if (needPhone) setProfilePhone(aPhone)
    if (needEmail) setProfileEmail(aEmail)
    authContactPrefilledRef.current = true
  }, [user?.id, user?.profilePhone, user?.profileEmail, authPhone, authEmail, authFetched])

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!user) return
      setSaveError(null)
      setSaving(true)
      try {
        if (isMockAuthMode()) {
          updateUserRecord(user.id, {
            displayName: displayName.trim() || user.displayName,
            realName: realName.trim(),
            bio: bio.trim().slice(0, 200),
            profilePhone: profilePhone.trim(),
            profileEmail: profileEmail.trim(),
          })
          await refreshUser()
        } else {
          const { data: authData, error: authErr } = await getSupabaseClient().auth.getUser()
          if (authErr || !authData.user) throw new Error(authErr?.message ?? '未登录')
          await remoteSaveAccountProfile(authData.user.id, authData.user, {
            displayName: displayName.trim() || user.displayName,
            realName: realName.trim(),
            bio: bio.trim().slice(0, 200),
            profilePhone: profilePhone.trim(),
            profileEmail: profileEmail.trim(),
          })
          await refreshUser()
        }
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2500)
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [user, displayName, realName, bio, profilePhone, profileEmail, refreshUser],
  )

  if (!user) return null

  const isOrg = user.membershipType === 'organization'
  const phoneHint = profilePhone.trim()
    ? `${maskPhone(profilePhone.trim())}（业务联系，保存后生效）`
    : authPhone
      ? `${maskPhone(authPhone)}（注册/登录绑定）`
      : authEmail
        ? '未绑定登录手机（当前为邮箱注册/登录）'
        : '未绑定'
  const emailHint = profileEmail.trim()
    ? `${profileEmail.trim()}（业务联系，保存后生效）`
    : authEmail
      ? `${authEmail}（注册/登录绑定）`
      : authPhone && !authEmail
        ? '未绑定登录邮箱（当前为手机号注册/登录）'
        : '未绑定'

  return (
    <div>
      <AccountBreadcrumb current="个人资料" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">个人资料</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {isMockAuthMode()
          ? '演示环境：资料保存在浏览器本地；与 Supabase 档案互不影响。'
          : '已登录时保存至 Supabase「profiles」表，并用于入网 / 购课等表单的预填覆盖（姓名、手机、邮箱）。修改登录邮箱请在账号安全流程中操作。'}
      </p>

      <form className="card mt-8 space-y-6 p-6 shadow-[var(--shadow-soft)]" onSubmit={(e) => void onSubmit(e)}>
        {saved ? (
          <p className="rounded-xl border border-[rgba(47,79,58,0.15)] bg-[rgba(47,79,58,0.06)] px-3 py-2 text-sm text-[var(--brand-deep)]">
            已保存。
          </p>
        ) : null}
        {saveError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-xl font-semibold text-[var(--brand-deep)]">
            {displayName.charAt(0) || user.displayName.charAt(0) || '?'}
          </div>
          <button type="button" className="tm-btn tm-btn-secondary text-sm" onClick={() => alert('头像上传将在后续版本开放。')}>
            更换头像
          </button>
        </div>
        <label className="tm-field">
          <span className="tm-field-label">昵称</span>
          <input
            className="tm-input"
            maxLength={20}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            name="displayName"
          />
        </label>
        <label className="tm-field">
          <span className="tm-field-label">真实姓名（选填）</span>
          <input className="tm-input" placeholder="用于证书 / 合同" value={realName} onChange={(e) => setRealName(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="tm-field">
            <span className="tm-field-label">业务联系手机</span>
            <input
              className="tm-input"
              placeholder="选填，与登录手机可不同"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              inputMode="tel"
            />
            <span className="text-xs text-[var(--text-tertiary)]">展示：{phoneHint}</span>
          </label>
          <label className="tm-field">
            <span className="tm-field-label">业务联系邮箱</span>
            <input
              className="tm-input"
              placeholder="选填，与登录邮箱可不同"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              inputMode="email"
            />
            <span className="text-xs text-[var(--text-tertiary)]">展示：{emailHint}</span>
          </label>
        </div>
        {!isOrg ? (
          <label className="tm-field">
            <span className="tm-field-label">主身份</span>
            <select
              className="tm-input"
              value={user.primaryRole}
              onChange={(e) => void setPrimaryRole(e.target.value as CloudPrimaryRole)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-tertiary)]">当前：{primaryRoleLabel(user.primaryRole)} · 正式环境由行为与审核决定</span>
          </label>
        ) : null}
        <label className="tm-field">
          <span className="tm-field-label">个人简介（最多 200 字）</span>
          <textarea className="field-textarea" maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="tm-btn tm-btn-primary" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
