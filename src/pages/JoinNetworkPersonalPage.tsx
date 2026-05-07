import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import { haversineKm } from '../lib/geo'
import { useNearbyMapPois } from '../lib/geo/useNearbyMapPois'
import {
  buildJoinNetworkExtraPayload,
  joinPoiDisplayName,
  joinPoiSubtitle,
  type JoinNetworkPoiChoice,
} from '../lib/joinNetwork/poiChoice'
import { saveCitizenScienceLead, CITIZEN_SCIENCE_ENTRY } from '../lib/citizenScienceLeads'
import { mergeLeadExtraWelfareProjectSlug, submitLead } from '../lib/leads'
import { saveShanhaiyunVolunteerLead, SHANHAIYUN_VOLUNTEER_ENTRY } from '../lib/shanhaiyunVolunteerLeads'
import {
  fetchExistingLeadForShanhaiyunChannel,
  fetchLatestShanhaiyunProfileSnapshot,
  resolveShanhaiyunChannelId,
  SHANHAIYUN_CHANNEL,
  snapshotToMapPoiChoice,
  snapshotToUserGeo,
  type ExistingShanhaiyunChannelLead,
  type ShanhaiyunProfileSnapshot,
} from '../lib/account/shanhaiyunProfileSnapshotRemote'
import { useAuth } from '../lib/auth/AuthContext'
import { RegisterEmailNoticeCard } from '../components/auth/RegisterEmailNoticeCard'
import { buildAuthHref, joinReturnPath, JOIN_INTENT_QUERY } from '../lib/joinRouting'
import { isMockAuthMode } from '../lib/supabase/env'
import {
  buildWelfareVolunteerProfileSnapshot,
  upsertMemberEngagement,
} from '../lib/account/memberEngagementsRemote'
import {
  parseWelfareProjectSlug,
  VOLUNTEER_ENGAGEMENT_CATALOG_SLUG,
  welfareProjectTitle,
} from '../lib/impact/welfareProjectSlugs'
import { parseScienceProjectSlug, scienceProjectTitle } from '../lib/science/scienceProjectSlugs'

type PrimaryRole = '游客' | '志愿者' | '公民科学家'
type Phase = 'role' | 'locate' | 'form' | 'success' | 'confirm_profile' | 'channel_registered'

type UserGeo = { lat: number; lng: number; accuracyMeters?: number; capturedAt: string }

const PRIMARY_ROLES: PrimaryRole[] = ['游客', '志愿者', '公民科学家']

/** 已在本渠道登记或重复提交拦截时的统一提示 */
const DUPLICATE_JOIN_APPLY_MESSAGE = '你已提交申请，请勿重复提交'

const GENDERS = ['男', '女'] as const
const EDUCATIONS = ['小学及以下', '初中', '高中/中专', '大专', '本科', '硕士', '博士', '其他'] as const

export function JoinNetworkPersonalPage() {
  const researchNoteId = useId()
  const formErrorsId = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, setPrimaryRole: setCloudPrimaryRole, recordActivityParticipated, register } = useAuth()
  const [searchParams] = useSearchParams()
  const entryParam = searchParams.get('entry')
  const welfareProjectSlug = useMemo(
    () => parseWelfareProjectSlug(searchParams.get('welfare_project')),
    [searchParams],
  )
  const scienceProjectSlug = useMemo(
    () => parseScienceProjectSlug(searchParams.get('science_project')),
    [searchParams],
  )
  const isActivityIntent = searchParams.get(JOIN_INTENT_QUERY) === 'activity'
  const isShanhaiIntent = searchParams.get(JOIN_INTENT_QUERY) === 'shanhai'
  const isVolunteerEntry = entryParam === SHANHAIYUN_VOLUNTEER_ENTRY
  const isCitizenScienceEntry = entryParam === CITIZEN_SCIENCE_ENTRY
  const isFixedRoleEntry = isVolunteerEntry || isCitizenScienceEntry || isShanhaiIntent

  /** 真实 Supabase 下志愿/公民科学须先登录，避免未登录走本地演示写入 */
  const requiresAuthForCloudJoin = useMemo(
    () => !isMockAuthMode() && (isVolunteerEntry || isCitizenScienceEntry),
    [isVolunteerEntry, isCitizenScienceEntry],
  )

  const nextPath = joinReturnPath(location.pathname, location.search)
  const loginHref = buildAuthHref('/login', {
    next: nextPath,
    intent: searchParams.get(JOIN_INTENT_QUERY),
    entry: entryParam,
  })
  const registerHref = buildAuthHref('/register', {
    next: nextPath,
    intent: searchParams.get(JOIN_INTENT_QUERY),
    entry: entryParam,
  })

  const [phase, setPhase] = useState<Phase>(() => (isFixedRoleEntry ? 'locate' : 'role'))
  const [primaryRole, setPrimaryRole] = useState<PrimaryRole | null>(() =>
    isVolunteerEntry ? '志愿者' : isCitizenScienceEntry ? '公民科学家' : isShanhaiIntent ? '游客' : null,
  )

  const [userGeo, setUserGeo] = useState<UserGeo | null>(null)
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
  const [note, setNote] = useState('')

  const [joinGate, setJoinGate] = useState<'loading' | 'ready'>('ready')
  const [channelExistingLead, setChannelExistingLead] = useState<ExistingShanhaiyunChannelLead | null>(null)
  /** 山海意图下仅存在「自然教育网络·个人」线索时，与 channel_registered 共用 UI，文案走「您已加入山海」 */
  const [shanhaiCrossNetworkPersonalLead, setShanhaiCrossNetworkPersonalLead] = useState(false)
  const [reuseConfirmMode, setReuseConfirmMode] = useState(false)
  /** 已在「已登记」页完成 leads.extra / platform_welfare_enrollments 补同步后的提示 */
  const [channelRegisteredSyncHint, setChannelRegisteredSyncHint] = useState<string | null>(null)
  /** 登记成功但会员公益任务积分未写入 profiles（无行 / RLS / 认证态异常）时提示 */
  const [activityPointsSyncFailed, setActivityPointsSyncFailed] = useState(false)
  const volunteerRepairSyncKeyRef = useRef<string>('')
  const [confirmConsent, setConfirmConsent] = useState(false)

  const [loginKey, setLoginKey] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  /** Supabase 邮箱确认：注册成功但未登录，中止后续登记 */
  const [registerAwaitingEmail, setRegisterAwaitingEmail] = useState<string | null>(null)

  const mapNearbyChoices = useMemo((): JoinNetworkPoiChoice[] => {
    if (!userGeo) return []
    return nearby.pois.map((poi) => ({
      kind: 'map' as const,
      poi,
      distanceKm: haversineKm(userGeo.lat, userGeo.lng, poi.lat, poi.lng),
    }))
  }, [userGeo, nearby.pois])

  useEffect(() => {
    if (isVolunteerEntry) {
      trackEvent('view_join_network_personal', { entry: SHANHAIYUN_VOLUNTEER_ENTRY })
    } else if (isCitizenScienceEntry) {
      trackEvent('view_join_network_personal', { entry: CITIZEN_SCIENCE_ENTRY })
    } else if (isShanhaiIntent) {
      trackEvent('view_join_network_personal', { intent: 'shanhai' })
    } else {
      trackEvent('view_join_network_personal')
    }
  }, [isVolunteerEntry, isCitizenScienceEntry, isShanhaiIntent])

  useEffect(() => {
    if (!user?.displayName || reuseConfirmMode || channelExistingLead) return
    setName((prev) => (prev.trim() === '' ? user.displayName : prev))
  }, [user?.displayName, reuseConfirmMode, channelExistingLead])

  const hydrateFromSnapshot = useCallback((snap: ShanhaiyunProfileSnapshot) => {
    const genders = GENDERS as readonly string[]
    const eds = EDUCATIONS as readonly string[]
    setName(snap.name)
    setGender(genders.includes(snap.gender) ? (snap.gender as (typeof GENDERS)[number]) : '')
    setAge(snap.age)
    setEducation(eds.includes(snap.education) ? (snap.education as (typeof EDUCATIONS)[number]) : '')
    setPhone(snap.phone)
    setWechat(snap.wechat)
    setEmail(snap.email)
    setAddressDetail(snap.addressDetail)
    setUserGeo(snapshotToUserGeo(snap))
    setSelected(snapshotToMapPoiChoice(snap))
    const pr = snap.primaryRoleLabel
    if (pr && (PRIMARY_ROLES as readonly string[]).includes(pr)) {
      setPrimaryRole(pr as PrimaryRole)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user || user.membershipType !== 'individual' || isMockAuthMode()) {
      setJoinGate('ready')
      setChannelExistingLead(null)
      setShanhaiCrossNetworkPersonalLead(false)
      setChannelRegisteredSyncHint(null)
      volunteerRepairSyncKeyRef.current = ''
      setReuseConfirmMode(false)
      return
    }
    const ch = resolveShanhaiyunChannelId({
      isVolunteerEntry,
      isCitizenScienceEntry,
      isShanhaiIntent,
      isActivityIntent,
    })
    let cancelled = false
    setJoinGate('loading')
    void (async () => {
      try {
        const existing = await fetchExistingLeadForShanhaiyunChannel(user.id, ch)
        if (cancelled) return
        if (existing) {
          setChannelExistingLead(existing)
          setShanhaiCrossNetworkPersonalLead(false)
          setChannelRegisteredSyncHint(null)
          volunteerRepairSyncKeyRef.current = ''
          setReuseConfirmMode(false)
          hydrateFromSnapshot(existing.snapshot)
          setPhase('channel_registered')
        } else if (
          isShanhaiIntent &&
          ch === SHANHAIYUN_CHANNEL.shanhai
        ) {
          const networkPersonal = await fetchExistingLeadForShanhaiyunChannel(
            user.id,
            SHANHAIYUN_CHANNEL.join_network_personal,
          )
          if (cancelled) return
          if (networkPersonal) {
            setChannelExistingLead(networkPersonal)
            setShanhaiCrossNetworkPersonalLead(true)
            setChannelRegisteredSyncHint(null)
            volunteerRepairSyncKeyRef.current = ''
            setReuseConfirmMode(false)
            hydrateFromSnapshot(networkPersonal.snapshot)
            setPhase('channel_registered')
          } else {
            setChannelExistingLead(null)
            setShanhaiCrossNetworkPersonalLead(false)
            setChannelRegisteredSyncHint(null)
            volunteerRepairSyncKeyRef.current = ''
            const snap = await fetchLatestShanhaiyunProfileSnapshot(user.id)
            if (cancelled) return
            if (snap) {
              hydrateFromSnapshot(snap)
              setReuseConfirmMode(true)
              setPhase('confirm_profile')
              const pr = snap.primaryRoleLabel
              if (pr && (PRIMARY_ROLES as readonly string[]).includes(pr)) {
                setPrimaryRole(pr as PrimaryRole)
              }
            } else {
              setReuseConfirmMode(false)
              setPhase(isFixedRoleEntry ? 'locate' : 'role')
            }
          }
        } else {
          setChannelExistingLead(null)
          setShanhaiCrossNetworkPersonalLead(false)
          setChannelRegisteredSyncHint(null)
          volunteerRepairSyncKeyRef.current = ''
          const snap = await fetchLatestShanhaiyunProfileSnapshot(user.id)
          if (cancelled) return
          if (snap) {
            hydrateFromSnapshot(snap)
            setReuseConfirmMode(true)
            setPhase('confirm_profile')
            const pr = snap.primaryRoleLabel
            if (pr && (PRIMARY_ROLES as readonly string[]).includes(pr)) {
              setPrimaryRole(pr as PrimaryRole)
            }
          } else {
            setReuseConfirmMode(false)
            setPhase(isFixedRoleEntry ? 'locate' : 'role')
          }
        }
      } catch {
        if (cancelled) return
        setChannelExistingLead(null)
        setShanhaiCrossNetworkPersonalLead(false)
        setChannelRegisteredSyncHint(null)
        volunteerRepairSyncKeyRef.current = ''
        setReuseConfirmMode(false)
        setPhase(isFixedRoleEntry ? 'locate' : 'role')
      } finally {
        if (!cancelled) setJoinGate('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    isAuthenticated,
    user,
    isVolunteerEntry,
    isCitizenScienceEntry,
    isShanhaiIntent,
    isActivityIntent,
    isFixedRoleEntry,
    hydrateFromSnapshot,
  ])

  /** 历史仅写入 leads、未双写报名表时：在「已登记」页用 URL 或线索 extra 中的项目补写 platform_welfare_enrollments，并在带 welfare_project 时合并 leads.extra */
  useEffect(() => {
    if (phase !== 'channel_registered' || joinGate !== 'ready') return
    if (!isVolunteerEntry || !user?.id || isMockAuthMode()) return
    const resolvedSlug = welfareProjectSlug ?? channelExistingLead?.welfareProjectSlug ?? null
    if (!resolvedSlug || !userGeo) return

    const uid = user.id
    const leadId = channelExistingLead?.leadId ?? null
    const syncKey = `${uid}|${resolvedSlug}|${leadId ?? 'no-lead'}`
    if (volunteerRepairSyncKeyRef.current === syncKey) return

    let cancelled = false
    void (async () => {
      try {
        await upsertMemberEngagement({
          userId: uid,
          domain: 'welfare_action',
          catalogSlug: VOLUNTEER_ENGAGEMENT_CATALOG_SLUG,
          status: 'registered',
          latitude: userGeo.lat,
          longitude: userGeo.lng,
          welfareProjectSlug: resolvedSlug,
          volunteerProfile: buildWelfareVolunteerProfileSnapshot({
            name,
            gender,
            age,
            education,
            phone,
            wechat,
            email,
            addressDetail,
            note,
          }),
          metadata: {
            welfare_project_slug: resolvedSlug,
            source: 'impact_volunteer',
            entry: SHANHAIYUN_VOLUNTEER_ENTRY,
            repair_sync: 'channel_registered',
            ...(leadId ? { shanhaiyun_lead_id: leadId } : {}),
          },
        })
        if (welfareProjectSlug && leadId) {
          await mergeLeadExtraWelfareProjectSlug(leadId, uid, welfareProjectSlug)
        }
        if (!cancelled) {
          volunteerRepairSyncKeyRef.current = syncKey
          setChannelRegisteredSyncHint(
            welfareProjectSlug
              ? '已将当前链接中的公益项目同步至报名表（platform_welfare_enrollments）与线索（leads.extra）。'
              : '已根据线索中的公益项目补写报名表（platform_welfare_enrollments）。',
          )
        }
      } catch {
        if (!cancelled) {
          setChannelRegisteredSyncHint('报名表同步失败，请检查网络后刷新本页重试。')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    phase,
    joinGate,
    isVolunteerEntry,
    user?.id,
    userGeo,
    welfareProjectSlug,
    channelExistingLead?.welfareProjectSlug,
    channelExistingLead?.leadId,
    name,
    gender,
    age,
    education,
    phone,
    wechat,
    email,
    addressDetail,
    note,
  ])

  useEffect(() => {
    if (!isAuthenticated || !user || user.membershipType !== 'individual') return
    if (isActivityIntent && user.primaryRole !== 'visitor') {
      void setCloudPrimaryRole('visitor')
      return
    }
    if (isVolunteerEntry && user.primaryRole !== 'volunteer') {
      void setCloudPrimaryRole('volunteer')
      return
    }
    if (isCitizenScienceEntry && user.primaryRole !== 'citizen_scientist') {
      void setCloudPrimaryRole('citizen_scientist')
    }
    if (isShanhaiIntent && user.primaryRole !== 'visitor') {
      void setCloudPrimaryRole('visitor')
    }
  }, [
    isAuthenticated,
    user,
    isActivityIntent,
    isVolunteerEntry,
    isCitizenScienceEntry,
    isShanhaiIntent,
    setCloudPrimaryRole,
  ])

  const pickRole = (role: PrimaryRole) => {
    setPrimaryRole(role)
    trackEvent('join_network_personal_role', { primaryRole: role })
    setUserGeo(null)
    setGeoError(null)
    setSelected(null)
    setPhase('locate')
  }

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位。请使用支持地理位置的桌面或移动浏览器，并在 HTTPS 或 localhost 环境下打开。')
      setUserGeo(null)
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
        trackEvent('join_network_personal_geo_success', { sourcePath: '/join-network/personal' })
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
        trackEvent('join_network_personal_geo_fail', { sourcePath: '/join-network/personal', code: err.code })
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const handleSelectPoi = (row: JoinNetworkPoiChoice) => {
    setSelected(row)
    setPhase('form')
    trackEvent('join_network_select_poi', {
      context: 'personal',
      nodeId: row.kind === 'catalog' ? row.node.id : row.poi.id,
      selectionKind: row.kind,
      distanceKm: Math.round(row.distanceKm * 10) / 10,
    })
  }

  const goBackFromLocate = () => {
    if (isVolunteerEntry) {
      navigate('/impact')
      return
    }
    if (isCitizenScienceEntry) {
      navigate('/science')
      return
    }
    if (isShanhaiIntent) {
      navigate('/join-network?intent=shanhai')
      return
    }
    setPhase('role')
    setPrimaryRole(null)
    setUserGeo(null)
    setGeoError(null)
    setSelected(null)
  }

  const goBackFromFormToLocate = () => {
    setFormError(null)
    setPhase('locate')
    setSelected(null)
  }

  const shanhaiyunChannel = useMemo(
    () =>
      resolveShanhaiyunChannelId({
        isVolunteerEntry,
        isCitizenScienceEntry,
        isShanhaiIntent,
        isActivityIntent,
      }),
    [isVolunteerEntry, isCitizenScienceEntry, isShanhaiIntent, isActivityIntent],
  )

  const goEditFromConfirm = () => {
    setReuseConfirmMode(false)
    setConfirmConsent(false)
    setFormError(null)
    if (isFixedRoleEntry) {
      setPhase('locate')
      setSelected(null)
    } else {
      setPhase('role')
      setPrimaryRole(null)
      setUserGeo(null)
      setSelected(null)
    }
    trackEvent('join_network_edit_from_confirm', { channel: shanhaiyunChannel })
  }

  const performSubmit = async () => {
    if (!userGeo || !selected) {
      setFormError('请完成定位并选择地图兴趣点。')
      return
    }
    if (!isFixedRoleEntry && !primaryRole) {
      setFormError('请先选择主身份。')
      return
    }

    const hasContact = phone.trim() || wechat.trim() || email.trim()
    if (!name.trim()) {
      setFormError('请填写姓名。')
      return
    }
    if (!gender) {
      setFormError('请选择性别。')
      return
    }
    if (!age.trim()) {
      setFormError('请填写年龄。')
      return
    }
    if (!education) {
      setFormError('请选择学历。')
      return
    }
    if (!hasContact) {
      setFormError('请至少填写手机、微信或邮箱中的一项，便于我们与您联系。')
      return
    }
    if (!addressDetail.trim()) {
      setFormError('请填写详细地址（门牌、小区/楼层等）。')
      return
    }

    if (isVolunteerEntry && !isMockAuthMode() && user?.id && !welfareProjectSlug) {
      setFormError('请先在「公益行动」页选择公益项目后再登记（链接中需含 welfare_project 参数）。')
      return
    }

    if (isCitizenScienceEntry && !isMockAuthMode() && user?.id && !scienceProjectSlug) {
      setFormError('请先在「科研与公民科学」页选择项目后再登记（链接中需含 science_project 参数）。')
      return
    }

    if (isShanhaiIntent && !isAuthenticated) {
      if (!loginKey.trim()) {
        setFormError('请填写登录账号（手机或邮箱），用于山海云登录。')
        return
      }
      if (!password || password.length < 4) {
        setFormError('请设置密码，至少 4 位（演示）。')
        return
      }
      if (password !== passwordConfirm) {
        setFormError('两次输入的密码不一致。')
        return
      }
    }

    setFormError(null)
    setActivityPointsSyncFailed(false)
    setSubmitting(true)
    try {
      if (isShanhaiIntent && !isAuthenticated) {
        const reg = await register({
          displayName: name.trim(),
          loginKey: loginKey.trim(),
          password,
          membershipType: 'individual',
          joinIntent: 'shanhai',
        })
        if (reg.status === 'awaiting_email') {
          setRegisterAwaitingEmail(reg.email)
          setSubmitting(false)
          return
        }
      }

      const uid = user?.id
      if (uid && !isMockAuthMode()) {
        if (isShanhaiIntent) {
          const dupShanhai = await fetchExistingLeadForShanhaiyunChannel(uid, SHANHAIYUN_CHANNEL.shanhai)
          const dupNetworkPersonal = await fetchExistingLeadForShanhaiyunChannel(
            uid,
            SHANHAIYUN_CHANNEL.join_network_personal,
          )
          if (dupShanhai || dupNetworkPersonal) {
            setFormError(DUPLICATE_JOIN_APPLY_MESSAGE)
            setSubmitting(false)
            return
          }
        } else {
          const dup = await fetchExistingLeadForShanhaiyunChannel(uid, shanhaiyunChannel)
          if (dup) {
            setFormError(DUPLICATE_JOIN_APPLY_MESSAGE)
            setSubmitting(false)
            return
          }
        }
      }

      const latRounded = Math.round(userGeo.lat * 1e6) / 1e6
      const lngRounded = Math.round(userGeo.lng * 1e6) / 1e6
      const poiLabel = joinPoiDisplayName(selected)
      const km = Math.round(selected.distanceKm * 10) / 10
      const joinPayload = buildJoinNetworkExtraPayload(selected, userGeo).joinNetwork
      const accountTag = isShanhaiIntent
        ? isAuthenticated
          ? `|已有山海云账号:${user?.loginKey ?? '-'}`
          : `|新注册登录账号:${loginKey.trim()}`
        : ''
      const contact = `性别:${gender}|年龄:${age.trim()}|学历:${education}|手机:${phone.trim() || '-'}|微信:${wechat.trim() || '-'}|邮箱:${email.trim() || '-'}|地图兴趣点:${poiLabel}|距离约${km}km|定位:纬度${latRounded},经度${lngRounded}|详细地址:${addressDetail.trim()}${accountTag}`
      const extraBase = {
        joinNetwork: joinPayload,
        shanhaiyun_channel: shanhaiyunChannel,
        ...(welfareProjectSlug ? { welfare_project_slug: welfareProjectSlug } : {}),
        ...(scienceProjectSlug ? { science_project_slug: scienceProjectSlug } : {}),
        ...(typeof userGeo.accuracyMeters === 'number' || userGeo.capturedAt
          ? {
              locationMeta: {
                accuracyMeters: userGeo.accuracyMeters,
                capturedAt: userGeo.capturedAt,
              },
            }
          : {}),
      }

      const structured = {
        gender: gender || null,
        age: age.trim() || null,
        education: education || null,
        phone: phone.trim() || null,
        wechat: wechat.trim() || null,
        email: email.trim() || null,
        poi: poiLabel,
        addressDetail: addressDetail.trim(),
        latitude: latRounded,
        longitude: lngRounded,
      }

      if (isVolunteerEntry) {
        if (!user?.id || isMockAuthMode()) {
          saveShanhaiyunVolunteerLead({
            sourcePath: '/join-network/personal',
            name: name.trim(),
            contact,
            message: note.trim() || undefined,
            extra: {
              intent: 'shanhaiyun_volunteer',
              entry: SHANHAIYUN_VOLUNTEER_ENTRY,
              primaryRole: '志愿者',
              ...extraBase,
            },
          })
        } else {
          await submitLead(
            {
              leadType: 'impact',
              sourcePath: '/join-network/personal',
              name: name.trim(),
              contact,
              message: note.trim() || undefined,
              extra: {
                intent: 'shanhaiyun_volunteer',
                entry: SHANHAIYUN_VOLUNTEER_ENTRY,
                primaryRole: '志愿者',
                ...extraBase,
              },
              structuredContact: structured,
            },
            { createdByUserId: user?.id ?? null },
          )
          if (user.id && welfareProjectSlug) {
            await upsertMemberEngagement({
              userId: user.id,
              domain: 'welfare_action',
              catalogSlug: VOLUNTEER_ENGAGEMENT_CATALOG_SLUG,
              status: 'registered',
              latitude: structured.latitude ?? null,
              longitude: structured.longitude ?? null,
              welfareProjectSlug,
              volunteerProfile: buildWelfareVolunteerProfileSnapshot({
                name: name.trim(),
                gender,
                age: age.trim(),
                education,
                phone: phone.trim(),
                wechat: wechat.trim(),
                email: email.trim(),
                addressDetail: addressDetail.trim(),
                note: note.trim(),
              }),
              metadata: {
                welfare_project_slug: welfareProjectSlug,
                source: 'impact_volunteer',
                entry: SHANHAIYUN_VOLUNTEER_ENTRY,
                poi_label: poiLabel,
              },
            })
          }
        }
        trackEvent('submit_shanhaiyun_volunteer_success')
      } else if (isCitizenScienceEntry) {
        if (!user?.id || isMockAuthMode()) {
          saveCitizenScienceLead({
            sourcePath: '/join-network/personal',
            name: name.trim(),
            contact,
            message: note.trim() || undefined,
            extra: {
              intent: 'citizen_science',
              entry: CITIZEN_SCIENCE_ENTRY,
              primaryRole: '公民科学家',
              ...extraBase,
            },
          })
        } else {
          await submitLead(
            {
              leadType: 'science',
              sourcePath: '/join-network/personal',
              name: name.trim(),
              contact,
              message: note.trim() || undefined,
              extra: {
                intent: 'citizen_science',
                entry: CITIZEN_SCIENCE_ENTRY,
                primaryRole: '公民科学家',
                ...extraBase,
              },
              structuredContact: structured,
            },
            { createdByUserId: user?.id ?? null },
          )
          if (user.id && scienceProjectSlug) {
            await upsertMemberEngagement({
              userId: user.id,
              domain: 'citizen_science_project',
              catalogSlug: scienceProjectSlug,
              status: 'registered',
              latitude: structured.latitude ?? null,
              longitude: structured.longitude ?? null,
              metadata: {
                science_project_slug: scienceProjectSlug,
                source: 'science_page',
                entry: CITIZEN_SCIENCE_ENTRY,
                poi_label: poiLabel,
              },
            })
          }
        }
        trackEvent('submit_citizen_science_success')
      } else if (isShanhaiIntent) {
        await submitLead(
          {
            leadType: 'network_personal',
            sourcePath: '/join-network/personal',
            name: name.trim(),
            contact,
            message: note.trim() || undefined,
            extra: {
              intent: 'join_shanhai',
              primaryRole,
              joinShanhai: true,
              ...extraBase,
            },
            structuredContact: structured,
          },
          { createdByUserId: user?.id ?? null },
        )
        trackEvent('submit_join_shanhai_success')
      } else {
        await submitLead(
          {
            leadType: 'network_personal',
            sourcePath: '/join-network/personal',
            name: name.trim(),
            contact,
            message: note.trim() || undefined,
            extra: {
              intent: 'join_network_personal',
              primaryRole,
              join_flow: isActivityIntent ? 'activity' : 'network',
              ...extraBase,
            },
            structuredContact: structured,
          },
          { createdByUserId: user?.id ?? null },
        )
        trackEvent('submit_join_network_personal_success')
      }
      setReuseConfirmMode(false)
      let pointsSyncFailed = false
      if (user?.membershipType === 'individual' && (isVolunteerEntry || isCitizenScienceEntry)) {
        const ok = await recordActivityParticipated(1)
        pointsSyncFailed = !ok
      }
      setActivityPointsSyncFailed(pointsSyncFailed)
      setPhase('success')
      if (isShanhaiIntent) {
        navigate('/account', { replace: true })
      }
    } catch (err) {
      if (isShanhaiIntent) {
        trackEvent('submit_join_shanhai_fail')
        setFormError(err instanceof Error ? err.message : '提交失败，请稍后重试。')
      } else if (isVolunteerEntry) {
        trackEvent('submit_shanhaiyun_volunteer_fail')
        setFormError('提交失败，请稍后重试。')
      } else if (isCitizenScienceEntry) {
        trackEvent('submit_citizen_science_fail')
        setFormError('提交失败，请稍后重试。')
      } else {
        trackEvent('submit_join_network_personal_fail')
        setFormError('提交失败，请稍后重试。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await performSubmit()
  }

  const handleConfirmSubmit = async () => {
    if (!confirmConsent) {
      setFormError('请勾选确认后再提交。')
      return
    }
    if (!isFixedRoleEntry && !primaryRole) {
      setFormError('缺少主身份，请点击「信息有变，去修改」后先选择身份。')
      return
    }
    setFormError(null)
    await performSubmit()
  }

  const step1Current = phase === 'role' && !isFixedRoleEntry
  const step2Current = phase === 'locate'
  const step3Current = phase === 'form' || phase === 'success' || phase === 'confirm_profile' || phase === 'channel_registered'

  const showCloudAuthGate = requiresAuthForCloudJoin && !isAuthenticated && registerAwaitingEmail === null

  return (
    <section className="section-shell flex min-h-[70vh] flex-col bg-[#F2EEDB] pb-32 md:pb-28">
      <div className="container-page flex-1 py-10 md:py-14">
        <nav className="text-sm text-[var(--text-secondary)]">
          {isVolunteerEntry ? (
            <Link to="/impact" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
              ← 返回公益平台
            </Link>
          ) : isCitizenScienceEntry ? (
            <Link to="/science" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
              ← 返回科研与公民科学
            </Link>
          ) : isShanhaiIntent ? (
            <Link to="/join-network?intent=shanhai" className="text-[var(--brand-deep)] underline-offset-2 hover:underline">
              ← 返回加入山海
            </Link>
          ) : (
            <Link
              to={isActivityIntent ? '/join-network?intent=activity' : '/join-network'}
              className="text-[var(--brand-deep)] underline-offset-2 hover:underline"
            >
              ← 返回选择身份
            </Link>
          )}
        </nav>

        {isVolunteerEntry && welfareProjectSlug ? (
          <p className="mt-4 inline-flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-[rgba(47,79,58,0.2)] bg-[rgba(47,79,58,0.06)] px-3 py-2 text-sm text-[var(--brand-deep)]">
            <span className="text-[var(--text-secondary)]">已选公益项目</span>
            <span className="font-medium">{welfareProjectTitle(welfareProjectSlug)}</span>
          </p>
        ) : null}
        {isVolunteerEntry && !welfareProjectSlug && !isMockAuthMode() && isAuthenticated ? (
          <div className="mt-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <p>未检测到公益项目参数。请返回公益行动页，点击「参与公益行动」并选择项目后再登记。</p>
            <Link to="/impact" className="mt-2 inline-block font-medium text-[var(--brand-deep)] underline-offset-2 hover:underline">
              前往公益行动
            </Link>
          </div>
        ) : null}
        {isCitizenScienceEntry && scienceProjectSlug ? (
          <p className="mt-4 inline-flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-[rgba(47,79,58,0.2)] bg-[rgba(47,79,58,0.06)] px-3 py-2 text-sm text-[var(--brand-deep)]">
            <span className="text-[var(--text-secondary)]">已选公民科学项目</span>
            <span className="font-medium">{scienceProjectTitle(scienceProjectSlug)}</span>
          </p>
        ) : null}
        {isCitizenScienceEntry && !scienceProjectSlug && !isMockAuthMode() && isAuthenticated ? (
          <div className="mt-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <p>未检测到公民科学项目参数。请返回科研与公民科学页，点击「加入公民科学」并选择项目后再登记。</p>
            <Link to="/science" className="mt-2 inline-block font-medium text-[var(--brand-deep)] underline-offset-2 hover:underline">
              前往科研与公民科学
            </Link>
          </div>
        ) : null}

        {registerAwaitingEmail ? (
          <div className="mt-8 max-w-3xl space-y-4">
            <RegisterEmailNoticeCard
              email={registerAwaitingEmail}
              loginHref={loginHref}
              variant="join_flow"
            />
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setRegisterAwaitingEmail(null)}
            >
              返回表单
            </button>
          </div>
        ) : null}

        {showCloudAuthGate ? (
          <article className="trust-card mt-8 max-w-3xl space-y-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--brand-deep)]">开始登记前，请先登录或注册山海云</h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              公益志愿与公民科学登记将写入云端。请先使用山海云账号<strong className="font-medium text-[var(--text-primary)]">登录</strong>
              或<strong className="font-medium text-[var(--text-primary)]">注册</strong>
              后再继续。登录成功后将自动返回本页；系统将尝试从云端拉取您在山海云的历史登记档案并预填表单。若存在可复用的档案，将进入「报名信息待确认」页，请您核对无误并勾选确认后再提交，写入当前渠道。
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              已有账号请直接登录，无需重复注册。
            </p>
            <p className="flex flex-wrap gap-2 pt-1">
              <Link className="btn-primary text-sm" to={loginHref}>
                登录并返回
              </Link>
              <Link className="btn-secondary text-sm" to={registerHref}>
                注册新账号
              </Link>
            </p>
          </article>
        ) : null}

        {!registerAwaitingEmail && !isAuthenticated && !requiresAuthForCloudJoin ? (
          <div className="mt-6 max-w-3xl rounded-[16px] border border-[rgba(47,79,58,0.18)] bg-[#fffaf2] p-4 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <p className="font-medium text-[var(--text-primary)]">同步山海云演示账户</p>
            <p className="mt-1">
              已有账号请<strong className="text-[var(--brand-deep)]">登录</strong>，无需重复注册；登录后自动回到本页并预填资料。
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link className="btn-primary text-sm" to={loginHref}>
                登录并返回
              </Link>
              <Link className="btn-secondary text-sm" to={registerHref}>
                注册新账号
              </Link>
            </p>
          </div>
        ) : null}

        <div className={registerAwaitingEmail || showCloudAuthGate ? 'hidden' : ''}>
        {joinGate === 'loading' && isAuthenticated ? (
          <p className="mt-8 max-w-3xl text-sm text-[var(--text-secondary)]">正在校验登记状态与档案…</p>
        ) : null}

        {joinGate === 'ready' && phase === 'channel_registered' ? (
          <article className="trust-card mt-8 max-w-xl space-y-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--brand-deep)]">
              {isShanhaiIntent && shanhaiCrossNetworkPersonalLead ? '您已加入山海' : DUPLICATE_JOIN_APPLY_MESSAGE}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {isShanhaiIntent && shanhaiCrossNetworkPersonalLead
                ? '您已通过「自然教育网络·个人」完成登记，与加入山海为同一套资料，无需重复提交。以下为已保存的信息摘要。'
                : '您已在当前山海云入口完成登记，无法再次加入。以下为已保存的信息摘要。'}
            </p>
            <dl className="mt-4 grid gap-2 text-sm text-[var(--brand-deep)]">
              <div>
                <dt className="text-[var(--text-secondary)]">姓名</dt>
                <dd className="font-medium">{name || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">主身份</dt>
                <dd className="font-medium">{primaryRole ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">手机 / 微信 / 邮箱</dt>
                <dd className="font-medium">
                  {[phone, wechat, email].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">详细地址</dt>
                <dd className="font-medium whitespace-pre-wrap">{addressDetail || '—'}</dd>
              </div>
            </dl>
            {channelRegisteredSyncHint ? (
              <p className="rounded-lg border border-[rgba(47,79,58,0.2)] bg-[rgba(47,79,58,0.06)] px-3 py-2 text-xs leading-relaxed text-[var(--brand-deep)]">
                {channelRegisteredSyncHint}
              </p>
            ) : null}
            <div className="pt-2">
              <Link
                to={isVolunteerEntry ? '/impact' : isCitizenScienceEntry ? '/science' : isShanhaiIntent ? '/join-network?intent=shanhai' : '/join-network'}
                className="btn-primary inline-flex text-sm"
              >
                返回
              </Link>
            </div>
          </article>
        ) : null}

        {joinGate === 'ready' && phase === 'confirm_profile' ? (
          <article className="trust-card mt-8 max-w-xl space-y-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--brand-deep)]">报名信息待确认</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              以下信息已从山海云历史登记档案同步到本页。请核对是否仍适用于本次登记；确认后将写入当前渠道且不可重复提交。
            </p>
            {!isFixedRoleEntry ? (
              <p className="text-sm text-[var(--brand-deep)]">
                主身份：<span className="font-medium">{primaryRole ?? '未选择（请点「去修改」）'}</span>
              </p>
            ) : null}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-secondary)]">姓名</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{name || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">性别</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">年龄</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{age || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">学历</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{education || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">手机</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">微信</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{wechat || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">邮箱</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{email || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">地图兴趣点</dt>
                <dd className="font-medium text-[var(--brand-deep)]">{selected ? joinPoiDisplayName(selected) : '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--text-secondary)]">详细地址</dt>
                <dd className="whitespace-pre-wrap text-[var(--brand-deep)]">{addressDetail || '—'}</dd>
              </div>
            </dl>
            {formError ? (
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">{formError}</div>
            ) : null}
            <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmConsent}
                onChange={(ev) => setConfirmConsent(ev.target.checked)}
              />
              <span>确认将以上信息用于本次渠道登记，并已阅读说明。</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-primary text-sm" disabled={submitting} onClick={() => void handleConfirmSubmit()}>
                {submitting ? '提交中…' : '确认无误并提交'}
              </button>
              <button type="button" className="btn-secondary text-sm" disabled={submitting} onClick={goEditFromConfirm}>
                信息有变，去修改
              </button>
            </div>
          </article>
        ) : null}

        {joinGate === 'ready' && phase !== 'channel_registered' && phase !== 'confirm_profile' ? (
        <>
        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-deep)]/80">
            {isShanhaiIntent
              ? '山海云 · 加入山海'
              : isVolunteerEntry
                ? '山海云公益 · 志愿登记'
                : isCitizenScienceEntry
                  ? '科研与公民科学 · 登记'
                  : 'Network · 个人登记'}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.65rem,3.2vw,2.25rem)] font-semibold leading-tight text-[var(--brand-deep)]">
            {isShanhaiIntent
              ? '加入山海（个人）'
              : isVolunteerEntry
                ? '山海云公益志愿登记'
                : isCitizenScienceEntry
                  ? '加入公民科学登记'
                  : '加入自然教育网络（个人）'}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
            {isShanhaiIntent ? (
              <>
                流程与「加入自然教育网络」个人一致：定位并选择周边地图兴趣点后，在基本信息中填写资料。
                <strong className="font-medium text-[var(--text-primary)]">未登录时须填写登录账号与密码</strong>
                ，提交后即完成本站山海云注册（与
                <Link to="/register" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
                  注册页
                </Link>
                、
                <Link to="/login" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
                  登录页
                </Link>
                同一套演示规则）。已登录则仅登记资料。
              </>
            ) : isVolunteerEntry ? (
              <>
                您将以<strong className="font-medium text-[var(--text-primary)]">志愿者</strong>
                身份登记。请获取位置并从周边地图兴趣点中选一项，最后填写联系方式。
              </>
            ) : isCitizenScienceEntry ? (
              <>
                您将以<strong className="font-medium text-[var(--text-primary)]">公民科学家</strong>
                身份登记。流程与公益志愿登记一致：请获取位置并从周边地图兴趣点中选一项，最后填写联系方式（表单草稿在本地浏览器）。
              </>
            ) : (
              <>
                先选择主身份，再获取位置并从<strong className="font-medium text-[var(--text-primary)]">周边地图兴趣点</strong>
                中选一项（与机构入网一致），最后填写联系方式。
              </>
            )}
          </p>
          {isAuthenticated && user ? (
            <p className="mt-4 rounded-[16px] border border-[rgba(47,79,58,0.12)] bg-[#fffaf2]/95 px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              您已登录山海云（<span className="font-medium text-[var(--text-primary)]">{user.displayName}</span>
              ）。下方「姓名」已预填为账户显示名，可按需修改；正式环境可与山海云资料同步。
            </p>
          ) : null}
        </header>

        <ol className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" aria-label="办理步骤">
          <li
            aria-current={step1Current ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              step1Current
                ? 'bg-[var(--brand-deep)] text-white shadow-md'
                : 'border border-[rgba(47,79,58,0.22)] bg-[rgba(255,251,245,0.9)] text-[var(--brand-deep)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step1Current ? 'bg-white/20 text-white' : 'bg-[rgba(47,79,58,0.12)] text-[var(--brand-deep)]'
              }`}
              aria-hidden
            >
              {!step1Current ? '✓' : '1'}
            </span>
            {isShanhaiIntent
              ? '山海云个人'
              : isVolunteerEntry
                ? '志愿者（山海云公益）'
                : isCitizenScienceEntry
                  ? '公民科学家（科研与公民科学）'
                  : '主身份'}
          </li>
          <li className="hidden text-[var(--text-secondary)] sm:block" aria-hidden>
            →
          </li>
          <li
            aria-current={step2Current ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              step2Current
                ? 'bg-[var(--brand-deep)] text-white shadow-md'
                : phase === 'form' || phase === 'success'
                  ? 'border border-[rgba(47,79,58,0.22)] bg-[rgba(255,251,245,0.9)] text-[var(--brand-deep)]'
                  : 'border border-dashed border-[rgba(47,79,58,0.2)] bg-transparent text-[var(--text-secondary)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step2Current ? 'bg-white/20 text-white' : phase === 'form' || phase === 'success' ? 'bg-[rgba(47,79,58,0.12)] text-[var(--brand-deep)]' : 'bg-[rgba(47,79,58,0.08)] text-[var(--text-secondary)]'
              }`}
              aria-hidden
            >
              {phase === 'form' || phase === 'success' ? '✓' : '2'}
            </span>
            定位与选点
          </li>
          <li className="hidden text-[var(--text-secondary)] sm:block" aria-hidden>
            →
          </li>
          <li
            aria-current={step3Current && phase !== 'success' ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              step3Current
                ? 'bg-[var(--brand-deep)] text-white shadow-md'
                : 'border border-dashed border-[rgba(47,79,58,0.2)] bg-transparent text-[var(--text-secondary)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step3Current ? 'bg-white/20 text-white' : 'bg-[rgba(47,79,58,0.08)] text-[var(--text-secondary)]'
              }`}
              aria-hidden
            >
              {phase === 'success' ? '✓' : '3'}
            </span>
            基本信息
          </li>
        </ol>

        {phase === 'role' && !isFixedRoleEntry ? (
          <div className="mt-10 max-w-xl">
            <p className="mb-4 text-sm font-medium text-[var(--brand-deep)]">请选择您的主身份</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {PRIMARY_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => pickRole(role)}
                  className="trust-card rounded-2xl border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.98)] px-4 py-6 text-center text-base font-semibold text-[var(--brand-deep)] shadow-sm transition hover:border-[var(--brand-deep)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-deep)]"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === 'locate' ? (
          <div className="mt-8 max-w-2xl">
            <article className="trust-card space-y-6 p-6 md:p-8">
              <p className="text-sm text-[var(--text-secondary)]">
                已选身份：
                <span className="font-medium text-[var(--brand-deep)]">
                  {isShanhaiIntent ? `山海云 · ${primaryRole ?? '游客'}` : primaryRole}
                </span>
              </p>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-deep)]">获取位置</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  用于检索周边地图 POI 并计算与所选地点的直线距离。定位仅在您的浏览器内完成，不会自动对外公开精确坐标。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary" disabled={geoLoading} onClick={requestGeo}>
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
                <p className="rounded-lg border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.95)] px-3 py-2 text-sm text-[var(--brand-deep)]">
                  已获取：纬度 <span className="tabular-nums">{Math.round(userGeo.lat * 1e6) / 1e6}</span> · 经度{' '}
                  <span className="tabular-nums">{Math.round(userGeo.lng * 1e6) / 1e6}</span>
                  {typeof userGeo.accuracyMeters === 'number' ? (
                    <span className="text-[var(--text-secondary)]">（精度约 {Math.round(userGeo.accuracyMeters)} m）</span>
                  ) : null}
                </p>
              ) : null}

              {userGeo ? (
                <div className="space-y-8 border-t border-[rgba(47,79,58,0.1)] pt-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-deep)]">周边地图兴趣点</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      来自 OpenStreetMap（约 1 km）；可选配置 <span className="font-mono text-xs">VITE_GEOAPIFY_API_KEY</span> 使用 Geoapify。
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
                                  {sub ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">{sub}</span> : null}
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-1">
                                  <span className="rounded-full bg-[rgba(47,79,58,0.1)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--brand-deep)]">
                                    {km} km
                                  </span>
                                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--brand-deep)]">选择</span>
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

              <button type="button" onClick={goBackFromLocate} className="text-sm font-medium text-[var(--brand-deep)] underline-offset-2 hover:underline">
                {isVolunteerEntry ? '返回公益平台' : isCitizenScienceEntry ? '返回科研与公民科学' : '上一步'}
              </button>
            </article>
          </div>
        ) : null}

        {phase === 'form' && selected && userGeo ? (
          <div className="mt-10 max-w-xl space-y-5">
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
                onClick={goBackFromFormToLocate}
              >
                重选周边点位
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="trust-card space-y-5 p-6 md:p-8"
              aria-describedby={formError ? `${researchNoteId} ${formErrorsId}` : researchNoteId}
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-deep)]">填写基本信息</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">已选身份：{primaryRole}</p>
              </div>

              {formError ? (
                <div id={formErrorsId} className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800" role="alert">
                  {formError}
                </div>
              ) : null}

              {isShanhaiIntent && !isAuthenticated ? (
                <div className="space-y-4 border-b border-[rgba(47,79,58,0.12)] pb-4">
                  <p className="text-sm font-medium text-[var(--brand-deep)]">山海云账号（与注册页一致）</p>
                  <label className="block text-sm font-medium text-[var(--brand-deep)]">
                    登录账号（手机或邮箱） <span className="text-rose-600">*</span>
                    <input
                      className="field-input mt-1 w-full"
                      value={loginKey}
                      onChange={(ev) => setLoginKey(ev.target.value)}
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-[var(--brand-deep)]">
                    密码 <span className="text-rose-600">*</span>
                    <input
                      className="field-input mt-1 w-full"
                      type="password"
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      autoComplete="new-password"
                      minLength={4}
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-[var(--brand-deep)]">
                    确认密码 <span className="text-rose-600">*</span>
                    <input
                      className="field-input mt-1 w-full"
                      type="password"
                      value={passwordConfirm}
                      onChange={(ev) => setPasswordConfirm(ev.target.value)}
                      autoComplete="new-password"
                      minLength={4}
                      required
                    />
                  </label>
                </div>
              ) : null}

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                姓名 <span className="text-rose-600">*</span>
                <input
                  className="field-input mt-1 w-full"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  autoComplete="name"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                性别 <span className="text-rose-600">*</span>
                <select className="field-input mt-1 w-full" value={gender} onChange={(ev) => setGender(ev.target.value as (typeof GENDERS)[number])}>
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
                <input className="field-input mt-1 w-full" value={age} onChange={(ev) => setAge(ev.target.value)} inputMode="numeric" />
              </label>

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                学历 <span className="text-rose-600">*</span>
                <select
                  className="field-input mt-1 w-full"
                  value={education}
                  onChange={(ev) => setEducation(ev.target.value as (typeof EDUCATIONS)[number])}
                >
                  <option value="">请选择</option>
                  {EDUCATIONS.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-xs text-[var(--text-secondary)]">手机、微信、邮箱请至少填写一项 *</p>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                手机
                <input className="field-input mt-1 w-full" value={phone} onChange={(ev) => setPhone(ev.target.value)} autoComplete="tel" inputMode="tel" />
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                微信
                <input className="field-input mt-1 w-full" value={wechat} onChange={(ev) => setWechat(ev.target.value)} autoComplete="nickname" />
              </label>
              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                邮箱
                <input className="field-input mt-1 w-full" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="email" />
              </label>

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                详细地址 <span className="text-rose-600">*</span>
                <textarea
                  className="field-input mt-1 min-h-[88px] w-full resize-y"
                  value={addressDetail}
                  onChange={(ev) => setAddressDetail(ev.target.value)}
                  placeholder="门牌号、小区/楼宇、楼层与房间号等（与上方地图选点配套）"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[var(--brand-deep)]">
                备注
                <textarea className="field-input mt-1 min-h-[100px] w-full resize-y" value={note} onChange={(ev) => setNote(ev.target.value)} rows={4} />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" onClick={goBackFromFormToLocate} className="rounded-full border border-[rgba(47,79,58,0.35)] px-5 py-2 text-sm font-medium text-[var(--brand-deep)] hover:bg-[rgba(47,79,58,0.06)]">
                  上一步
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? '提交中…' : '提交登记'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {phase === 'success' ? (
          <div className="mt-10 max-w-xl">
            <div className="trust-card space-y-4 p-6 md:p-8" role="status">
              <h2 className="text-lg font-semibold text-[var(--brand-deep)]">提交成功</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                感谢您的登记。我们可能在自然教育网络运营、活动匹配与<strong className="font-medium text-[var(--text-primary)]">领域研究统计</strong>
                等场景使用您提供的信息；不会用于与本网络无关的营销目的。如需更正或删除，可通过您留下的联系方式与我们联系。
              </p>
              {activityPointsSyncFailed && (isVolunteerEntry || isCitizenScienceEntry) ? (
                <p className="rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
                  会员任务积分未能同步到云端（<code className="rounded bg-amber-100/80 px-1">profiles</code>
                  未更新）。请打开个人中心刷新或重新登录后再查看积分与等级；若仍无变化，请在 Supabase 确认已有你的档案行且策略允许本人更新。
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Link
                  to={isVolunteerEntry ? '/impact' : isCitizenScienceEntry ? '/science' : isShanhaiIntent ? '/join-network?intent=shanhai' : '/join-network'}
                  className="inline-flex text-sm font-medium text-[var(--brand-deep)] underline-offset-2 hover:underline"
                >
                  {isVolunteerEntry ? '返回公益平台' : isCitizenScienceEntry ? '返回科研与公民科学' : isShanhaiIntent ? '返回加入山海' : '返回统一入口'}
                </Link>
                {isShanhaiIntent ? (
                  <Link to="/account" className="inline-flex text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
                    进入山海云个人中心
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        </>
        ) : null}
        </div>

      </div>

      {(phase === 'locate' || phase === 'form' || phase === 'success') && joinGate === 'ready' && !showCloudAuthGate ? (
        <div
          id={researchNoteId}
          className="fixed bottom-0 left-0 right-0 border-t border-[rgba(47,79,58,0.15)] bg-[#EDE8D4]/95 px-4 py-3 text-center text-xs leading-relaxed text-[var(--text-secondary)] backdrop-blur-sm md:text-sm"
          role="note"
        >
          您提交的数据将用于自然教育网络服务匹配、联络沟通与<strong className="font-medium text-[var(--text-primary)]">自然教育领域研究</strong>
          等用途。
          {isMockAuthMode()
            ? ' 演示模式下部分入口数据仍保存在本地浏览器。'
            : ' 已连接数据库时，登记将写入云端线索表（含定位与详细地址）；定位与详细地址为必填项。'}
        </div>
      ) : null}
    </section>
  )
}
