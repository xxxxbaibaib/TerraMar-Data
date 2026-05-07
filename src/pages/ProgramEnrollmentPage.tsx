import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import { haversineKm } from '../lib/geo'
import { useNearbyMapPois } from '../lib/geo/useNearbyMapPois'
import {
  buildJoinNetworkExtraPayload,
  joinPoiDisplayName,
  joinPoiSubtitle,
  type JoinNetworkPoiChoice,
} from '../lib/joinNetwork/poiChoice'
import { submitLead } from '../lib/leads'
import { upsertMemberEngagement } from '../lib/account/memberEngagementsRemote'
import {
  fetchLastProgramEnrollmentSnapshot,
  snapshotToMapPoiChoice,
  snapshotToUserGeo,
  type ProgramEnrollmentSnapshot,
} from '../lib/account/programEnrollmentSnapshotRemote'
import { fetchOrdersForUser } from '../lib/account/programOrdersRemote'
import { useAuth } from '../lib/auth/AuthContext'
import { buildAuthHref } from '../lib/joinRouting'
import { isMockAuthMode } from '../lib/supabase/env'
import { programs } from '../mock/programs'
import type { Program } from '../mock/types'

type Step = 'locate' | 'form' | 'success'

const GENDERS = ['男', '女'] as const
const EDUCATIONS = ['小学及以下', '初中', '高中/中专', '大专', '本科', '硕士', '博士', '其他'] as const

type SubmitEnrollmentFields = {
  name: string
  gender: (typeof GENDERS)[number] | ''
  age: string
  education: (typeof EDUCATIONS)[number] | ''
  phone: string
  wechat: string
  email: string
  addressDetail: string
}

async function submitProgramEnrollment(args: {
  program: Program
  orderId: string
  userId: string
  membershipType: string
  fields: SubmitEnrollmentFields
  userGeo: { lat: number; lng: number; accuracyMeters?: number; capturedAt: string }
  selected: JoinNetworkPoiChoice
}): Promise<void> {
  const { program, orderId, userId, membershipType, fields, userGeo, selected } = args
  const hasContact = fields.phone.trim() || fields.wechat.trim() || fields.email.trim()
  if (!fields.name.trim() || !fields.gender || !fields.age.trim() || !fields.education || !hasContact) {
    throw new Error('请完善必填项。')
  }
  if (!fields.addressDetail.trim()) {
    throw new Error('请填写详细地址。')
  }

  const latRounded = Math.round(userGeo.lat * 1e6) / 1e6
  const lngRounded = Math.round(userGeo.lng * 1e6) / 1e6
  const poiLabel = joinPoiDisplayName(selected)
  const km = Math.round(selected.distanceKm * 10) / 10
  const contact = `性别:${fields.gender}|年龄:${fields.age.trim()}|学历:${fields.education}|手机:${fields.phone.trim() || '-'}|微信:${fields.wechat.trim() || '-'}|邮箱:${fields.email.trim() || '-'}|地图兴趣点:${poiLabel}|距离约${km}km|定位:纬度${latRounded},经度${lngRounded}|详细地址:${fields.addressDetail.trim()}`

  const extraPayload = {
    programSlug: program.slug,
    orderId,
    ...buildJoinNetworkExtraPayload(selected, userGeo),
  }

  await submitLead(
    {
      leadType: 'apply',
      sourcePath: `/programs/${program.slug}`,
      name: fields.name.trim(),
      contact,
      message: undefined,
      extra: extraPayload,
      structuredContact: {
        gender: fields.gender,
        age: fields.age.trim(),
        education: fields.education,
        phone: fields.phone.trim() || null,
        wechat: fields.wechat.trim() || null,
        email: fields.email.trim() || null,
        poi: poiLabel,
        addressDetail: fields.addressDetail.trim(),
        latitude: latRounded,
        longitude: lngRounded,
      },
    },
    { createdByUserId: userId },
  )

  if (!isMockAuthMode() && membershipType === 'individual') {
    await upsertMemberEngagement({
      userId,
      domain: 'natural_education_program',
      catalogSlug: program.slug,
      status: 'registered',
      latitude: latRounded,
      longitude: lngRounded,
      metadata: {
        source: 'program_post_purchase_form',
        orderId,
        address_detail: fields.addressDetail.trim(),
        map_poi: poiLabel,
      },
    })
  }
}

function hydrateFormFromSnapshot(
  snap: ProgramEnrollmentSnapshot,
  setters: {
    setName: (v: string) => void
    setGender: (v: (typeof GENDERS)[number] | '') => void
    setAge: (v: string) => void
    setEducation: (v: (typeof EDUCATIONS)[number] | '') => void
    setPhone: (v: string) => void
    setWechat: (v: string) => void
    setEmail: (v: string) => void
    setAddressDetail: (v: string) => void
    setUserGeo: (v: { lat: number; lng: number; accuracyMeters?: number; capturedAt: string } | null) => void
    setSelected: (v: JoinNetworkPoiChoice | null) => void
  },
) {
  const g = (GENDERS as readonly string[]).includes(snap.gender) ? (snap.gender as (typeof GENDERS)[number]) : ''
  const e = (EDUCATIONS as readonly string[]).includes(snap.education)
    ? (snap.education as (typeof EDUCATIONS)[number])
    : ''
  setters.setName(snap.name)
  setters.setGender(g)
  setters.setAge(snap.age)
  setters.setEducation(e)
  setters.setPhone(snap.phone)
  setters.setWechat(snap.wechat)
  setters.setEmail(snap.email)
  setters.setAddressDetail(snap.addressDetail)
  setters.setUserGeo(snapshotToUserGeo(snap))
  setters.setSelected(snapshotToMapPoiChoice(snap))
}

export function ProgramEnrollmentPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')?.trim() ?? ''
  const formErrorsId = useId()
  const { isAuthenticated, user, recordCourseCompleted } = useAuth()
  /** 报名表已成功写入后，禁止快照预检 effect 再次把 step 打回「待确认」 */
  const enrollmentSubmittedRef = useRef(false)

  const program = useMemo(() => programs.find((p) => p.slug === slug), [slug])
  const nextPath = `/programs/${slug ?? ''}/enrollment?orderId=${encodeURIComponent(orderId)}`

  const [step, setStep] = useState<Step>('locate')
  const [userGeo, setUserGeo] = useState<{ lat: number; lng: number; accuracyMeters?: number; capturedAt: string } | null>(
    null,
  )
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selected, setSelected] = useState<JoinNetworkPoiChoice | null>(null)
  const nearby = useNearbyMapPois(userGeo)

  const [name, setName] = useState('')
  const [gender, setGender] = useState<(typeof GENDERS)[number] | ''>('')
  const [age, setAge] = useState('')
  const [education, setEducation] = useState<(typeof EDUCATIONS)[number] | ''>('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [email, setEmail] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [consent, setConsent] = useState(false)

  const [orderValid, setOrderValid] = useState<boolean | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [reuseConfirm, setReuseConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  /** 报名表已提交但科考活动积分未写入 profiles 时提示 */
  const [explorationPointsSyncFailed, setExplorationPointsSyncFailed] = useState(false)

  const hydrate = useCallback((snap: ProgramEnrollmentSnapshot) => {
    hydrateFormFromSnapshot(snap, {
      setName,
      setGender,
      setAge,
      setEducation,
      setPhone,
      setWechat,
      setEmail,
      setAddressDetail,
      setUserGeo,
      setSelected,
    })
  }, [])

  type MapPoiChoice = Extract<JoinNetworkPoiChoice, { kind: 'map' }>
  const mapNearbyChoices = useMemo((): MapPoiChoice[] => {
    if (!userGeo) return []
    return nearby.pois.map((poi) => ({
      kind: 'map' as const,
      poi,
      distanceKm: haversineKm(userGeo.lat, userGeo.lng, poi.lat, poi.lng),
    }))
  }, [userGeo, nearby.pois])

  useEffect(() => {
    if (!slug) return
    trackEvent('view_program_enrollment', { slug, hasOrderId: Boolean(orderId) })
  }, [slug, orderId])

  useEffect(() => {
    if (!user?.displayName || reuseConfirm) return
    setName((prev) => (prev.trim() === '' ? user.displayName : prev))
  }, [user?.displayName, reuseConfirm])

  useEffect(() => {
    if (!isAuthenticated || !user || !orderId || !slug) {
      setOrderValid(orderId ? false : null)
      return
    }
    let cancelled = false
    void fetchOrdersForUser(user.id)
      .then((orders) => {
        if (cancelled) return
        const ok = orders.some((o) => o.id === orderId && o.programSlug === slug)
        setOrderValid(ok)
      })
      .catch(() => {
        if (cancelled) return
        setOrderValid(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user, orderId, slug])

  useEffect(() => {
    if (orderValid !== true || !user) {
      setSnapshotLoading(false)
      setReuseConfirm(false)
      return
    }
    let cancelled = false
    setSnapshotLoading(true)
    void fetchLastProgramEnrollmentSnapshot(user.id)
      .then((snap) => {
        if (cancelled) return
        if (enrollmentSubmittedRef.current) {
          setSnapshotLoading(false)
          return
        }
        setSnapshotLoading(false)
        if (snap) {
          hydrate(snap)
          setReuseConfirm(true)
          setStep('form')
        } else {
          setReuseConfirm(false)
          setStep('locate')
          setUserGeo(null)
          setSelected(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        if (enrollmentSubmittedRef.current) {
          setSnapshotLoading(false)
          return
        }
        setSnapshotLoading(false)
        setReuseConfirm(false)
        setStep('locate')
        setUserGeo(null)
        setSelected(null)
      })
    return () => {
      cancelled = true
    }
  }, [orderValid, user, hydrate, orderId, slug])

  if (!slug || !program) {
    return <Navigate to="/programs" replace />
  }

  if (!orderId) {
    return <Navigate to={`/programs/${program.slug}`} replace />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={buildAuthHref('/login', { next: nextPath })} replace />
  }

  if (user.membershipType !== 'individual') {
    return (
      <section className="section-shell bg-[var(--bg-base)] py-16">
        <div className="container-page card max-w-lg p-8">
          <p className="text-sm text-[var(--text-secondary)]">机构账号请通过商务或线下渠道提交报名信息。</p>
          <Link to={`/programs/${program.slug}`} className="btn-secondary mt-6 inline-flex text-sm">
            返回活动页
          </Link>
        </div>
      </section>
    )
  }

  if (orderValid === false) {
    return (
      <section className="section-shell bg-[var(--bg-base)] py-16">
        <div className="container-page card max-w-lg p-8">
          <p className="text-sm text-[var(--text-secondary)]">
            订单号无效或与当前活动不匹配。请从活动页重新下单，或前往「我的订单」核对。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/programs/${program.slug}`} className="btn-secondary inline-flex text-sm">
              返回活动页
            </Link>
            <Link to="/account/orders" className="btn-primary inline-flex text-sm">
              我的订单
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (orderValid === null) {
    return (
      <section className="section-shell bg-[var(--bg-base)] py-20">
        <p className="container-page text-sm text-[var(--text-secondary)]">正在校验订单…</p>
      </section>
    )
  }

  if (snapshotLoading) {
    return (
      <section className="section-shell bg-[var(--bg-base)] py-20">
        <p className="container-page text-sm text-[var(--text-secondary)]">正在加载报名信息…</p>
      </section>
    )
  }

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位。请在 HTTPS 或 localhost 下使用。')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    setUserGeo(null)
    setSelected(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setGeoLoading(false)
        trackEvent('program_enrollment_geo_success', { slug: program.slug })
      },
      (err) => {
        const map: Record<number, string> = {
          1: '您已拒绝定位授权，可在浏览器设置中开启后重试。',
          2: '暂时无法获取位置（设备不可用）。',
          3: '定位超时，请重试。',
        }
        setGeoError(map[err.code] ?? '无法获取位置，请稍后重试。')
        setGeoLoading(false)
        trackEvent('program_enrollment_geo_fail', { slug: program.slug, code: err.code })
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const handleSelectPoi = (row: JoinNetworkPoiChoice) => {
    setSelected(row)
    setStep('form')
    trackEvent('program_enrollment_select_poi', { slug: program.slug })
  }

  const runSubmit = async () => {
    if (!userGeo || !selected) {
      setFormError('缺少定位或地图兴趣点，请返回上一步完成选择。')
      return
    }
    const hasContact = phone.trim() || wechat.trim() || email.trim()
    if (!name.trim() || !gender || !age.trim() || !education || !hasContact) {
      setFormError('请完善必填项。')
      return
    }
    if (!addressDetail.trim()) {
      setFormError('请填写详细地址（门牌、楼层等）。')
      return
    }
    if (!consent) {
      setFormError('请阅读并勾选隐私说明。')
      return
    }

    setFormError(null)
    setExplorationPointsSyncFailed(false)
    setSubmitting(true)
    try {
      await submitProgramEnrollment({
        program,
        orderId,
        userId: user.id,
        membershipType: user.membershipType,
        fields: { name, gender, age, education, phone, wechat, email, addressDetail },
        userGeo,
        selected,
      })
      enrollmentSubmittedRef.current = true
      navigate(`/account/orders/${encodeURIComponent(orderId)}`, { replace: true })
      trackEvent('program_enrollment_submit_success', { slug: program.slug, reusedSnapshot: reuseConfirm })
      let explorationSyncFailed = false
      if (user.membershipType === 'individual') {
        const ok = await recordCourseCompleted(1)
        explorationSyncFailed = !ok
      }
      setExplorationPointsSyncFailed(explorationSyncFailed)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '提交失败，请稍后重试。')
      trackEvent('program_enrollment_submit_fail', { slug: program.slug })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await runSubmit()
  }

  const handleConfirmSubmit = async () => {
    await runSubmit()
  }

  if (step === 'success') {
    return (
      <section className="section-shell bg-[var(--bg-base)] py-16">
        <div className="container-page card max-w-lg space-y-4 p-8">
          <h1 className="text-xl font-semibold text-[var(--brand-deep)]">信息已提交</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            感谢您的填写。您可在「我的订单」中继续查看演示订单状态。
          </p>
          {explorationPointsSyncFailed ? (
            <p className="rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
              科考活动会员积分未能同步到云端（<code className="rounded bg-amber-100/80 px-1">profiles</code>
              未更新）。请打开个人中心刷新或重新登录后再查看积分与任务；若仍无变化，请在 Supabase 确认已有你的档案行且策略允许本人更新。
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to={`/account/orders/${encodeURIComponent(orderId)}`} className="btn-primary inline-flex text-sm">
              查看订单
            </Link>
            <Link to="/programs" className="btn-secondary inline-flex text-sm">
              探索更多活动
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const latRounded = userGeo ? Math.round(userGeo.lat * 1e6) / 1e6 : null
  const lngRounded = userGeo ? Math.round(userGeo.lng * 1e6) / 1e6 : null

  return (
    <section className="section-shell bg-[var(--bg-base)] py-12">
      <div className="container-page max-w-3xl">
        <nav className="text-xs text-[var(--text-secondary)]">
          <Link to="/programs" className="hover:underline">
            科考活动
          </Link>
          <span className="mx-1">/</span>
          <Link to={`/programs/${program.slug}`} className="hover:underline">
            {program.title}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-[var(--brand-deep)]">报名信息</span>
        </nav>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--brand-deep)]">
          {reuseConfirm ? '报名信息待确认' : '完善报名信息'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {reuseConfirm
            ? '检测到您曾提交过活动报名信息。请核对下列内容是否仍适用于本次活动订单；若无误可直接确认提交，如需变更请点击修改。'
            : '请完成地图定位并填写与山海云一致的基本资料，便于我们为您安排后续联络与行前服务。'}
        </p>

        {reuseConfirm ? (
          <article className="trust-card mt-8 space-y-5 p-6 md:p-8">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-secondary)]">姓名</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{name || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">性别</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">年龄</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{age || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">学历</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{education || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">手机</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">微信</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{wechat || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">邮箱</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">{email || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">地图兴趣点</dt>
                <dd className="mt-0.5 font-medium text-[var(--brand-deep)]">
                  {selected ? joinPoiDisplayName(selected) : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">定位坐标</dt>
                <dd className="mt-0.5 font-mono text-xs tabular-nums text-[var(--brand-deep)]">
                  {latRounded != null && lngRounded != null ? `纬度 ${latRounded} · 经度 ${lngRounded}` : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">详细地址</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[var(--brand-deep)]">{addressDetail || '—'}</dd>
              </div>
            </dl>

            {formError ? (
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800" role="alert">
                {formError}
              </div>
            ) : null}

            <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <input type="checkbox" className="mt-0.5" checked={consent} onChange={(ev) => setConsent(ev.target.checked)} />
              <span>确认将以上信息用于本次活动订单（演示环境），并已阅读隐私说明。</span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="btn-primary inline-flex justify-center text-sm sm:min-w-[200px]"
                disabled={submitting}
                onClick={() => void handleConfirmSubmit()}
              >
                {submitting ? '提交中…' : '确认无误并提交'}
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex justify-center text-sm sm:min-w-[200px]"
                disabled={submitting}
                onClick={() => {
                  setReuseConfirm(false)
                  setConsent(false)
                  setFormError(null)
                  setStep('form')
                  trackEvent('program_enrollment_edit_from_confirm', { slug: program.slug })
                }}
              >
                信息有变，去修改
              </button>
            </div>
          </article>
        ) : null}

        {!reuseConfirm && step === 'locate' ? (
          <article className="trust-card mt-8 space-y-6 p-6 md:p-8">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-deep)]">获取位置</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                用于检索周边地图兴趣点。坐标与所选 POI 将写入订单关联的报名记录。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" disabled={geoLoading} onClick={requestGeo}>
                {geoLoading ? '正在定位…' : userGeo ? '重新定位' : '获取我的位置'}
              </button>
            </div>
            {geoError ? (
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800" role="alert">
                {geoError}
              </div>
            ) : null}
            {userGeo ? (
              <p className="rounded-lg border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.95)] px-3 py-2 text-sm text-[var(--brand-deep)]">
                已获取：纬度 <span className="tabular-nums">{Math.round(userGeo.lat * 1e6) / 1e6}</span> · 经度{' '}
                <span className="tabular-nums">{Math.round(userGeo.lng * 1e6) / 1e6}</span>
              </p>
            ) : null}

            {userGeo ? (
              <div className="space-y-4 border-t border-[rgba(47,79,58,0.1)] pt-6">
                <h2 className="text-lg font-semibold text-[var(--brand-deep)]">选择周边地图兴趣点</h2>
                {nearby.status === 'loading' ? <p className="text-sm text-[var(--text-secondary)]">正在加载…</p> : null}
                {nearby.status === 'error' ? (
                  <p className="text-sm text-rose-800">地图兴趣点加载失败：{nearby.errorMessage}</p>
                ) : null}
                {mapNearbyChoices.length > 0 ? (
                  <ul className="space-y-2">
                    {mapNearbyChoices.map((row) => {
                      const label = joinPoiDisplayName(row)
                      const sub = joinPoiSubtitle(row)
                      const km = Math.round(row.distanceKm * 10) / 10
                      return (
                        <li key={row.poi.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectPoi(row)}
                            className="flex w-full items-start justify-between gap-3 rounded-xl border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.98)] px-4 py-3 text-left text-sm shadow-sm transition hover:border-[var(--brand-deep)]"
                          >
                            <span>
                              <span className="font-medium text-[var(--brand-deep)]">{label}</span>
                              {sub ? <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{sub}</span> : null}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--brand-deep)]">{km} km</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : nearby.status === 'ready' ? (
                  <p className="text-sm text-[var(--text-secondary)]">此范围内未检索到地点，请尝试重新定位。</p>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}

        {!reuseConfirm && step === 'form' && userGeo && selected ? (
          <div className="mt-8 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[rgba(47,79,58,0.14)] bg-[var(--brand-deep)] px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-wide text-white/75">已选地图兴趣点</p>
              <p className="mt-1 font-medium">{joinPoiDisplayName(selected)}</p>
              <p className="mt-1 text-sm text-white/85">
                与定位直线约 <span className="tabular-nums">{Math.round(selected.distanceKm * 10) / 10}</span> km
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-medium underline-offset-2 hover:underline"
                onClick={() => {
                  setStep('locate')
                  setSelected(null)
                }}
              >
                重选点位
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="trust-card space-y-4 p-6 md:p-8"
              aria-describedby={formError ? formErrorsId : undefined}
            >
              {formError ? (
                <div id={formErrorsId} className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">
                  {formError}
                </div>
              ) : null}

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                姓名 <span className="text-rose-600">*</span>
                <input className="field-input mt-1 w-full" value={name} onChange={(ev) => setName(ev.target.value)} required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[var(--brand-deep)]">
                  性别 <span className="text-rose-600">*</span>
                  <select
                    className="field-input mt-1 w-full"
                    value={gender}
                    onChange={(ev) => setGender(ev.target.value as (typeof GENDERS)[number] | '')}
                    required
                  >
                    <option value="">请选择</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-[var(--brand-deep)]">
                  年龄 <span className="text-rose-600">*</span>
                  <input className="field-input mt-1 w-full" value={age} onChange={(ev) => setAge(ev.target.value)} required />
                </label>
              </div>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                学历 <span className="text-rose-600">*</span>
                <select
                  className="field-input mt-1 w-full"
                  value={education}
                  onChange={(ev) => setEducation(ev.target.value as (typeof EDUCATIONS)[number] | '')}
                  required
                >
                  <option value="">请选择</option>
                  {EDUCATIONS.map((ed) => (
                    <option key={ed} value={ed}>
                      {ed}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                手机
                <input className="field-input mt-1 w-full" inputMode="tel" value={phone} onChange={(ev) => setPhone(ev.target.value)} />
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                微信
                <input className="field-input mt-1 w-full" value={wechat} onChange={(ev) => setWechat(ev.target.value)} />
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                邮箱
                <input className="field-input mt-1 w-full" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                详细地址 <span className="text-rose-600">*</span>
                <textarea
                  className="field-input mt-1 min-h-[88px] w-full"
                  value={addressDetail}
                  onChange={(ev) => setAddressDetail(ev.target.value)}
                  placeholder="门牌号、小区/楼宇、楼层与房间号等（坐标以上方定位为准）"
                  required
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={consent}
                  onChange={(ev) => setConsent(ev.target.checked)}
                />
                <span>我已阅读并同意按照隐私说明使用上述信息用于活动联络与行前服务（演示环境）。</span>
              </label>

              <button type="submit" className="btn-primary w-full justify-center text-sm" disabled={submitting}>
                {submitting ? '提交中…' : '提交报名信息'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  )
}
