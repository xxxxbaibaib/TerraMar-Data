import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import { useAuth } from '../lib/auth/AuthContext'
import { buildAuthHref, joinReturnPath, JOIN_INTENT_QUERY } from '../lib/joinRouting'
import { isMockAuthMode } from '../lib/supabase/env'
import {
  fetchExistingCooperationJoinNetworkLead,
  fetchExistingLeadForShanhaiyunChannel,
  SHANHAIYUN_CHANNEL,
} from '../lib/account/shanhaiyunProfileSnapshotRemote'

export function JoinNetworkLandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const intent = searchParams.get(JOIN_INTENT_QUERY)
  const isActivity = intent === 'activity'
  const isNetwork = intent === 'network'
  const isShanhai = intent === 'shanhai'
  const mockMode = isMockAuthMode()
  /** 合作共建 CTA：仅机构入网，不提供个人入口 */
  const cooperationNetworkOnly = isNetwork && !isActivity && !isShanhai

  const [shanhaiPrecheck, setShanhaiPrecheck] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [shanhaiPersonalBlocked, setShanhaiPersonalBlocked] = useState(false)
  const [shanhaiOrgBlocked, setShanhaiOrgBlocked] = useState(false)

  const nextPath = joinReturnPath(location.pathname, location.search)
  const loginHref = buildAuthHref('/login', { next: nextPath, intent })
  const registerHref = buildAuthHref('/register', { next: nextPath, intent })

  useEffect(() => {
    trackEvent('view_join_network_landing', { intent: intent ?? 'none' })
  }, [intent])

  useEffect(() => {
    if (!isShanhai || !isAuthenticated || !user?.id || mockMode) {
      setShanhaiPrecheck('ready')
      setShanhaiPersonalBlocked(false)
      setShanhaiOrgBlocked(false)
      return
    }
    let cancelled = false
    setShanhaiPrecheck('loading')
    void Promise.all([
      fetchExistingLeadForShanhaiyunChannel(user.id, SHANHAIYUN_CHANNEL.shanhai),
      fetchExistingLeadForShanhaiyunChannel(user.id, SHANHAIYUN_CHANNEL.join_network_personal),
      fetchExistingCooperationJoinNetworkLead(user.id),
    ])
      .then(([shanLead, networkPersonalLead, orgCoop]) => {
        if (cancelled) return
        setShanhaiPersonalBlocked(Boolean(shanLead || networkPersonalLead))
        setShanhaiOrgBlocked(orgCoop)
        setShanhaiPrecheck('ready')
      })
      .catch(() => {
        if (cancelled) return
        setShanhaiPersonalBlocked(false)
        setShanhaiOrgBlocked(false)
        setShanhaiPrecheck('ready')
      })
    return () => {
      cancelled = true
    }
  }, [isShanhai, isAuthenticated, user?.id, mockMode])

  const personalHref = isActivity
    ? '/join-network/personal?intent=activity'
    : isShanhai
      ? '/join-network/personal?intent=shanhai'
      : '/join-network/personal'

  const goPersonal = useCallback(() => {
    trackEvent('join_network_landing_pick', { choice: 'personal', intent: intent ?? undefined })
    if (isShanhai && isAuthenticated && user?.id && !mockMode) {
      if (shanhaiPrecheck !== 'ready') return
      if (shanhaiPersonalBlocked) return
    }
    navigate(personalHref)
  }, [
    intent,
    isShanhai,
    isAuthenticated,
    user?.id,
    mockMode,
    shanhaiPrecheck,
    shanhaiPersonalBlocked,
    navigate,
    personalHref,
  ])

  const goInstitution = useCallback(() => {
    trackEvent('join_network_landing_pick', { choice: 'institution', intent: intent ?? undefined })
    if (isShanhai && isAuthenticated && user?.id && !mockMode) {
      if (shanhaiPrecheck !== 'ready') return
      if (shanhaiOrgBlocked) return
    }
    navigate('/cooperation/join-network')
  }, [intent, isShanhai, isAuthenticated, user?.id, mockMode, shanhaiPrecheck, shanhaiOrgBlocked, navigate])

  const shanhaiGateActive = Boolean(isShanhai && isAuthenticated && !mockMode && user?.id)
  const shanhaiButtonsBusy = Boolean(shanhaiGateActive && shanhaiPrecheck === 'loading')

  return (
    <section className="section-shell bg-[#F2EEDB]">
      <div className="container-page py-10 md:py-16">
        <nav className="text-sm text-[var(--text-secondary)]">
          <Link to="/" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
            返回首页
          </Link>
          <span className="mx-2 text-[var(--text-secondary)]">·</span>
          <Link to="/programs" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
            科考活动
          </Link>
          <span className="mx-2 text-[var(--text-secondary)]">·</span>
          <Link to="/cooperation" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
            合作共建
          </Link>
        </nav>

        {!isAuthenticated ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-[16px] border border-[rgba(47,79,58,0.18)] bg-[#fffaf2] p-4 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <p className="font-medium text-[var(--text-primary)]">已有山海云演示账号？</p>
            <p className="mt-1">
              请先<strong className="text-[var(--brand-deep)]">登录</strong>再继续登记，无需重复注册；信息将与「我的账户」同步（本机演示）。
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link className="btn-primary text-sm" to={loginHref}>
                登录并返回此页
              </Link>
              <Link className="btn-secondary text-sm" to={registerHref}>
                没有账号，去注册
              </Link>
            </p>
          </div>
        ) : null}

        <header className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-deep)]/85">
            {isShanhai ? 'Join · 山海云' : 'Join · 自然教育网络'}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.6rem,3.2vw,2.35rem)] font-semibold text-[var(--brand-deep)]">
            {isShanhai ? '加入山海' : '加入自然教育网络'}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            {isShanhai ? (
              <>
                与「加入自然教育网络」<strong className="font-medium text-[var(--text-primary)]">同一套流程</strong>
                ：个人从左侧进入，先定位并选择协作参考点，再在基本信息中填写资料；<strong className="font-medium text-[var(--text-primary)]">
                  未登录时需填写登录账号与密码
                </strong>
                ，提交后等同于完成本站山海云注册并与登录体系同步。机构仍选右侧。
              </>
            ) : isActivity ? (
              <>
                您从<strong className="font-medium text-[var(--text-primary)]">自然教育活动</strong>
                入口进入：个人登记默认与山海云主身份「游客」对齐（演示）；机构入网仍选右侧。
              </>
            ) : isNetwork ? (
              <>
                您从<strong className="font-medium text-[var(--text-primary)]">自然教育网络</strong>
                入口进入：本页仅开放<strong className="font-medium text-[var(--text-primary)]">机构入网</strong>
                登记（与「合作共建」一致）——获取位置、选择周边协作参考点位，并提交机构名称、规模与联系方式。
              </>
            ) : (
              <>
                请选择您的身份类型。<strong className="font-medium text-[var(--text-primary)]">个人</strong>
                用于登记参与意向与后续活动匹配；<strong className="font-medium text-[var(--text-primary)]">机构</strong>
                将进入与合作共建一致的入网流程（定位参考点位并填写机构信息）。
              </>
            )}
          </p>
        </header>

        {shanhaiGateActive && shanhaiPrecheck === 'loading' ? (
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-[var(--text-secondary)]" role="status">
            正在校验是否已登记…
          </p>
        ) : null}

        <div
          className={`mx-auto mt-12 grid max-w-3xl gap-6 ${cooperationNetworkOnly ? 'grid-cols-1' : 'md:grid-cols-2'}`}
        >
          {!cooperationNetworkOnly ? (
            shanhaiGateActive ? (
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={shanhaiButtonsBusy}
                  onClick={goPersonal}
                  className="trust-card group block w-full p-8 text-left transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-lg font-semibold text-[var(--brand-deep)]">
                    人
                  </span>
                  <h2 className="mt-4 text-xl font-semibold text-[var(--brand-deep)] group-hover:underline">个人</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {isShanhai
                      ? '加入山海云：定位并选点后，在基本信息中填写登录账号与密码（未登录时）及联络方式，提交即完成注册并与本站登录体系一致。'
                      : isActivity
                        ? '与「加入自然教育活动」衔接：登记后可在账户中保持游客主身份并累计课程轨（演示）。'
                        : '选择游客 / 志愿者 / 公民科学家等角色，获取位置后从周边协作参考点位中选一条，再填写联系方式（与机构入网选点逻辑一致）。数据用途说明见登记页。'}
                  </p>
                  <span className="mt-6 inline-flex text-sm font-medium text-[var(--brand-deep)]">继续 →</span>
                </button>
                {shanhaiPersonalBlocked && shanhaiPrecheck === 'ready' ? (
                  <p className="mt-2 text-xs leading-relaxed text-amber-900" role="status">
                    您已加入山海
                  </p>
                ) : null}
              </div>
            ) : (
              <Link
                to={personalHref}
                onClick={() => trackEvent('join_network_landing_pick', { choice: 'personal', intent: intent ?? undefined })}
                className="trust-card group block p-8 transition hover:shadow-lg"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-lg font-semibold text-[var(--brand-deep)]">
                  人
                </span>
                <h2 className="mt-4 text-xl font-semibold text-[var(--brand-deep)] group-hover:underline">个人</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {isShanhai
                    ? '加入山海云：定位并选点后，在基本信息中填写登录账号与密码（未登录时）及联络方式，提交即完成注册并与本站登录体系一致。'
                    : isActivity
                      ? '与「加入自然教育活动」衔接：登记后可在账户中保持游客主身份并累计课程轨（演示）。'
                      : '选择游客 / 志愿者 / 公民科学家等角色，获取位置后从周边协作参考点位中选一条，再填写联系方式（与机构入网选点逻辑一致）。数据用途说明见登记页。'}
                </p>
                <span className="mt-6 inline-flex text-sm font-medium text-[var(--brand-deep)]">继续 →</span>
              </Link>
            )
          ) : null}

          {shanhaiGateActive ? (
            <div className="flex flex-col">
              <button
                type="button"
                disabled={shanhaiButtonsBusy}
                onClick={goInstitution}
                className={`trust-card group block w-full p-8 text-left transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${cooperationNetworkOnly ? 'mx-auto max-w-xl' : ''}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-lg font-semibold text-[var(--brand-deep)]">
                  构
                </span>
                <h2 className="mt-4 text-xl font-semibold text-[var(--brand-deep)] group-hover:underline">机构</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {isNetwork
                    ? '自然教育网络默认走机构入网：获取位置、选择周边协作参考点位，并提交机构名称、规模与联系方式。'
                    : '与「合作共建」入网流程相同：获取位置、选择周边协作参考点位，并提交机构名称、规模与联系方式。'}
                </p>
                <span className="mt-6 inline-flex text-sm font-medium text-[var(--brand-deep)]">继续 →</span>
              </button>
              {shanhaiOrgBlocked && shanhaiPrecheck === 'ready' ? (
                <p className="mt-2 text-xs leading-relaxed text-amber-900" role="status">
                  您已加入
                </p>
              ) : null}
            </div>
          ) : (
            <Link
              to="/cooperation/join-network"
              onClick={() => trackEvent('join_network_landing_pick', { choice: 'institution', intent: intent ?? undefined })}
              className={`trust-card group block p-8 transition hover:shadow-lg ${cooperationNetworkOnly ? 'mx-auto w-full max-w-xl' : ''}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(47,79,58,0.12)] text-lg font-semibold text-[var(--brand-deep)]">
                构
              </span>
              <h2 className="mt-4 text-xl font-semibold text-[var(--brand-deep)] group-hover:underline">机构</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {isNetwork
                  ? '自然教育网络默认走机构入网：获取位置、选择周边协作参考点位，并提交机构名称、规模与联系方式。'
                  : '与「合作共建」入网流程相同：获取位置、选择周边协作参考点位，并提交机构名称、规模与联系方式。'}
              </p>
              <span className="mt-6 inline-flex text-sm font-medium text-[var(--brand-deep)]">继续 →</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
