import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LeadForm } from '../components/common/LeadForm'
import { useAuth } from '../lib/auth/AuthContext'
import {
  createOrganizationWithPartnerProject,
  parseStaffHeadcount,
} from '../lib/account/orgPartnerUnitsRemote'
import { trackEvent } from '../lib/analytics'
import { isMockAuthMode } from '../lib/supabase/env'
import { fetchExistingCooperationJoinNetworkLead } from '../lib/account/shanhaiyunProfileSnapshotRemote'
import { buildAuthHref, joinReturnPath } from '../lib/joinRouting'
import { haversineKm } from '../lib/geo'
import { useNearbyMapPois } from '../lib/geo/useNearbyMapPois'
import {
  buildJoinNetworkExtraPayload,
  joinPoiDisplayName,
  joinPoiSubtitle,
  type JoinNetworkPoiChoice,
} from '../lib/joinNetwork/poiChoice'

type Step = 'locate' | 'form'

type UserGeo = { lat: number; lng: number }

export function CooperationJoinNetworkPage() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const mockMode = isMockAuthMode()
  const [step, setStep] = useState<Step>('locate')
  const [userGeo, setUserGeo] = useState<UserGeo | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selected, setSelected] = useState<JoinNetworkPoiChoice | null>(null)
  const nearby = useNearbyMapPois(userGeo)
  const [orgJoinPrecheck, setOrgJoinPrecheck] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [hasExistingCooperationJoin, setHasExistingCooperationJoin] = useState(false)
  const [joinSubmitDone, setJoinSubmitDone] = useState(false)

  useEffect(() => {
    trackEvent('view_join_network')
  }, [])

  useEffect(() => {
    if (mockMode || !isAuthenticated || !user?.id) {
      setOrgJoinPrecheck('ready')
      setHasExistingCooperationJoin(false)
      return
    }
    let cancelled = false
    setOrgJoinPrecheck('loading')
    void fetchExistingCooperationJoinNetworkLead(user.id)
      .then((exists) => {
        if (cancelled) return
        setHasExistingCooperationJoin(exists)
        setOrgJoinPrecheck('ready')
      })
      .catch(() => {
        if (cancelled) return
        setHasExistingCooperationJoin(false)
        setOrgJoinPrecheck('ready')
      })
    return () => {
      cancelled = true
    }
  }, [mockMode, isAuthenticated, user?.id])

  const mapNearbyChoices = useMemo((): JoinNetworkPoiChoice[] => {
    if (!userGeo) return []
    return nearby.pois.map((poi) => ({
      kind: 'map' as const,
      poi,
      distanceKm: haversineKm(userGeo.lat, userGeo.lng, poi.lat, poi.lng),
    }))
  }, [userGeo, nearby.pois])

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位。请使用支持地理位置的桌面或移动浏览器，并在 HTTPS 或 localhost 环境下打开。')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    setUserGeo(null)
    setSelected(null)
    setStep('locate')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setGeoLoading(false)
        trackEvent('join_network_geo_success', { sourcePath: '/cooperation/join-network' })
      },
      (err) => {
        const map: Record<number, string> = {
          1: '您已拒绝定位授权，可在浏览器设置中开启后重试。',
          2: '暂时无法获取位置（设备不可用）。',
          3: '定位超时，请重试或在信号较好处操作。',
        }
        setGeoError(
          `${map[err.code] ?? '无法获取位置，请稍后重试。'} 若持续失败，请确认站点以 HTTPS 或 localhost 访问。`,
        )
        setGeoLoading(false)
        trackEvent('join_network_geo_fail', { sourcePath: '/cooperation/join-network', code: err.code })
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const handleSelectPoi = (row: JoinNetworkPoiChoice) => {
    setSelected(row)
    setStep('form')
    trackEvent('join_network_select_poi', {
      nodeId: row.kind === 'catalog' ? row.node.id : row.poi.id,
      selectionKind: row.kind,
      distanceKm: Math.round(row.distanceKm * 10) / 10,
    })
  }

  const gatedCloudOrgUser = !mockMode && isAuthenticated && Boolean(user?.id)
  const showOrgJoinWizard =
    !joinSubmitDone &&
    (!gatedCloudOrgUser || (orgJoinPrecheck === 'ready' && !hasExistingCooperationJoin))

  const joinExtra = useMemo(() => {
    if (!selected || !userGeo) return undefined
    const payload = buildJoinNetworkExtraPayload(selected, userGeo)
    const base: Record<string, unknown> = {
      intent: 'join_network' as const,
      ...payload,
    }
    if (isAuthenticated && user?.id) {
      base.shanhaiyunUserId = user.id
    }
    return base
  }, [selected, userGeo, isAuthenticated, user?.id])

  const nextPath = joinReturnPath(location.pathname, location.search)
  const loginHref = buildAuthHref('/login', { next: nextPath })

  return (
    <section className="section-shell bg-[#F2EEDB]">
      <div className="container-page py-10 md:py-14">
        <nav className="text-sm text-[var(--text-secondary)]">
          <Link
            to="/cooperation"
            className="inline-flex items-center gap-1.5 font-medium text-[var(--brand-deep)] underline-offset-2 hover:underline"
          >
            <span aria-hidden>←</span> 返回合作共建
          </Link>
        </nav>

        {!joinSubmitDone && !isAuthenticated ? (
          <div className="mt-6 max-w-3xl rounded-[16px] border border-[rgba(47,79,58,0.18)] bg-[#fffaf2] p-4 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <p className="font-medium text-[var(--text-primary)]">
              {mockMode ? '机构入网与山海云演示账号（可选）' : '已连接数据库：提交意向须登录'}
            </p>
            <p className="mt-1">
              {mockMode
                ? '登录后可在演示环境中把意向与当前主账号 ID 一并写入线索；不登录也可正常提交意向。'
                : '线索与机构档案将写入 Supabase；请先登录后再填写第二步表单。'}
            </p>
            <p className="mt-3">
              <Link className="btn-primary text-sm" to={loginHref}>
                登录并返回本页
              </Link>
            </p>
          </div>
        ) : null}

        {!joinSubmitDone ? (
        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-deep)]/80">Network · 入网意向</p>
          <h1 className="mt-2 font-serif text-[clamp(1.65rem,3.2vw,2.25rem)] font-semibold leading-tight text-[var(--brand-deep)]">
            加入自然教育网络
          </h1>
          <p className="mt-4 border-l-[3px] border-[var(--brand-deep)] pl-4 text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
            先获取您的当前位置，系统会加载<strong className="font-medium text-[var(--text-primary)]">周边真实地图兴趣点</strong>
            （OpenStreetMap 社区数据，默认约 1 km；可选配置 <span className="font-mono text-xs">VITE_GEOAPIFY_API_KEY</span> 使用 Geoapify）。请点选一项后继续填写机构信息。
          </p>
        </header>
        ) : null}

        {joinSubmitDone ? (
          <article className="trust-card mx-auto mt-10 max-w-2xl space-y-5 p-8 md:p-10" role="status">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-deep)]/85">Network · 提交成功</p>
            <h1 className="font-serif text-[clamp(1.5rem,2.8vw,2rem)] font-semibold leading-tight text-[var(--brand-deep)]">
              您已成功提交
            </h1>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
              贵机构的加入自然教育网络意向已送达。我们将在 <strong className="font-medium text-[var(--text-primary)]">1–3 个工作日</strong>
              内通过您留下的联系方式与您沟通入网与协作安排；请留意手机、微信或邮箱。
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              您仍可随时返回合作共建首页了解其他共建方式。
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/cooperation" className="btn-primary text-sm">
                返回合作共建
              </Link>
              <Link to="/" className="btn-secondary text-sm">
                返回首页
              </Link>
            </div>
          </article>
        ) : null}

        {!joinSubmitDone && !mockMode && isAuthenticated && user?.id && orgJoinPrecheck === 'loading' ? (
          <p className="mt-6 max-w-2xl text-sm text-[var(--text-secondary)]" role="status">
            正在校验是否已登记…
          </p>
        ) : null}

        {!joinSubmitDone && !mockMode && isAuthenticated && user?.id && orgJoinPrecheck === 'ready' && hasExistingCooperationJoin ? (
          <article className="trust-card mt-8 max-w-2xl space-y-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--brand-deep)]">您已加入</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              当前账号已提交过机构加入自然教育网络意向，无需重复填写表单。
            </p>
            <Link
              to="/cooperation"
              className="btn-primary inline-flex text-sm"
            >
              返回合作共建
            </Link>
          </article>
        ) : null}

        {showOrgJoinWizard ? (
        <>
        <ol className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" aria-label="办理步骤">
          <li
            aria-current={step === 'locate' ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              step === 'locate'
                ? 'bg-[var(--brand-deep)] text-white shadow-md'
                : 'border border-[rgba(47,79,58,0.22)] bg-[rgba(255,251,245,0.9)] text-[var(--brand-deep)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step === 'locate' ? 'bg-white/20 text-white' : 'bg-[rgba(47,79,58,0.12)] text-[var(--brand-deep)]'
              }`}
              aria-hidden
            >
              {step === 'form' ? '✓' : '1'}
            </span>
            定位与选点
          </li>
          <li className="hidden text-[var(--text-secondary)] sm:block" aria-hidden>
            →
          </li>
          <li
            aria-current={step === 'form' ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              step === 'form'
                ? 'bg-[var(--brand-deep)] text-white shadow-md'
                : 'border border-dashed border-[rgba(47,79,58,0.2)] bg-transparent text-[var(--text-secondary)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step === 'form' ? 'bg-white/20 text-white' : 'bg-[rgba(47,79,58,0.08)] text-[var(--text-secondary)]'
              }`}
              aria-hidden
            >
              2
            </span>
            填写机构信息
          </li>
        </ol>

        {step === 'locate' ? (
          <div className="mt-8 max-w-2xl">
            <article className="trust-card space-y-6 p-6 md:p-8">
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-deep)]">获取位置</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  用于检索周边地图 POI 并计算与所选地点的直线距离。定位仅在您的浏览器内完成，不会自动对外公开精确坐标。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={geoLoading}
                  onClick={requestGeo}
                >
                  {geoLoading ? '正在定位…' : userGeo ? '重新定位' : '获取我的位置'}
                </button>
                {!userGeo && !geoLoading ? (
                  <span className="text-xs text-[var(--text-secondary)]">需 HTTPS 或 localhost，并允许浏览器位置权限</span>
                ) : null}
              </div>
              {geoError ? (
                <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800" role="alert">
                  {geoError}
                </div>
              ) : null}

              {userGeo ? (
                <div className="space-y-8 border-t border-[rgba(47,79,58,0.1)] pt-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-deep)]">周边地图兴趣点</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      来自 OpenStreetMap 社区数据（默认约 1 km 范围）；配置 <span className="font-mono text-xs">VITE_GEOAPIFY_API_KEY</span>{' '}
                      时可改用 Geoapify。距离为球面近似值（km）。
                    </p>
                    {nearby.status === 'loading' ? (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">正在加载周边地点…</p>
                    ) : null}
                    {nearby.status === 'error' ? (
                      <p className="mt-3 rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">
                        地图兴趣点加载失败：{nearby.errorMessage}
                      </p>
                    ) : null}
                    {mapNearbyChoices.length > 0 ? (
                      <ul className="mt-4 space-y-2.5">
                        {mapNearbyChoices.map((row) => {
                          const label = joinPoiDisplayName(row)
                          const sub = joinPoiSubtitle(row)
                          const km = Math.round(row.distanceKm * 10) / 10
                          return (
                            <li key={row.kind === 'map' ? row.poi.id : row.node.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectPoi(row)}
                                className="group flex w-full items-start justify-between gap-3 rounded-xl border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.98)] px-4 py-3.5 text-left shadow-sm transition hover:border-[var(--brand-deep)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-deep)]"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="font-medium text-[var(--brand-deep)] group-hover:underline">{label}</span>
                                  {sub ? (
                                    <span className="mt-1 block text-xs text-[var(--text-secondary)]">{sub}</span>
                                  ) : null}
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-1">
                                  <span className="rounded-full bg-[rgba(47,79,58,0.1)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--brand-deep)]">
                                    {km} km
                                  </span>
                                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--brand-deep)]">
                                    选择
                                  </span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : nearby.status === 'ready' ? (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        此范围内未检索到带名称的地图地点，请尝试重新定位或稍后再试。
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        ) : null}

        {step === 'form' && selected && userGeo && !mockMode && !isAuthenticated ? (
          <div className="mt-10 max-w-2xl rounded-[16px] border border-[rgba(47,79,58,0.18)] bg-[#fffaf2] p-5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <p className="font-medium text-[var(--text-primary)]">请先登录后再填写机构信息</p>
            <p className="mt-2">已连接数据库时，意向与机构档案需关联登录用户。</p>
            <Link className="btn-primary mt-4 inline-flex text-sm" to={loginHref}>
              去登录
            </Link>
          </div>
        ) : null}

        {step === 'form' && selected && userGeo && (mockMode || isAuthenticated) ? (
          <div className="mt-10 max-w-2xl space-y-5">
            <div className="overflow-hidden rounded-[20px] border border-[rgba(47,79,58,0.14)] bg-[var(--brand-deep)] px-5 py-4 text-white shadow-[0_12px_32px_rgba(13,26,20,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/75">已选地图兴趣点</p>
              <p className="mt-1 font-serif text-lg font-semibold leading-snug">{joinPoiDisplayName(selected)}</p>
              {joinPoiSubtitle(selected) ? (
                <p className="mt-1 text-xs text-white/80">{joinPoiSubtitle(selected)}</p>
              ) : null}
              <p className="mt-1 text-sm text-white/85">
                与您当前位置直线约 <span className="tabular-nums font-medium">{Math.round(selected.distanceKm * 10) / 10}</span> km
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                onClick={() => {
                  setStep('locate')
                  setSelected(null)
                }}
              >
                重选周边点位
              </button>
            </div>

            <LeadForm
              leadType="cooperation"
              sourcePath="/cooperation/join-network"
              title="加入自然教育网络"
              submitEventSuccess="submit_join_network_success"
              submitEventFail="submit_join_network_fail"
              variant="organization"
              showTitle
              extra={joinExtra}
              structuredGeo={{
                latitude: userGeo.lat,
                longitude: userGeo.lng,
                poiLabel: joinPoiDisplayName(selected),
              }}
              introOverride="请留下贵机构名称、规模与对接方式。您已选择周边地图兴趣点，我们将在 1–3 个工作日内与您沟通网络加入与协作安排。"
              onSubmitSuccess={() => setJoinSubmitDone(true)}
              onAfterLeadSubmit={
                mockMode || !user
                  ? undefined
                  : async (ctx) => {
                      if (ctx.sourcePath !== '/cooperation/join-network') return
                      await createOrganizationWithPartnerProject({
                        orgName: ctx.name,
                        summary: ctx.message || null,
                        staffHeadcount: parseStaffHeadcount(ctx.orgHeadcount),
                        latitude: userGeo.lat,
                        longitude: userGeo.lng,
                        contact: ctx.contact,
                        partnerProjectName: joinPoiDisplayName(selected),
                        partnerSummary:
                          selected.kind === 'map'
                            ? `地图兴趣点: ${selected.poi.id} · ${selected.poi.source}${selected.poi.category ? ` · ${selected.poi.category}` : ''}`
                            : '—',
                      })
                    }
              }
            />
          </div>
        ) : null}
        </>
        ) : null}
      </div>
    </section>
  )
}
