import type { NearbyMapPoi } from '../geo/nearbyMapPois'
import type { JoinNetworkPoiChoice } from '../joinNetwork/poiChoice'
import { parseWelfareProjectSlug } from '../impact/welfareProjectSlugs'
import { CITIZEN_SCIENCE_ENTRY } from '../citizenScienceLeads'
import { SHANHAIYUN_VOLUNTEER_ENTRY } from '../shanhaiyunVolunteerLeads'
import { getSupabaseClient } from '../supabase/client'
import { isMockAuthMode } from '../supabase/env'

/** 写入 `extra.shanhaiyun_channel`，用于去重与统计 */
export const SHANHAIYUN_CHANNEL = {
  citizen_science: 'citizen_science',
  volunteer: SHANHAIYUN_VOLUNTEER_ENTRY,
  shanhai: 'shanhai',
  join_network_personal: 'join_network_personal',
  join_activity: 'join_activity',
} as const

export type ShanhaiyunChannelId = (typeof SHANHAIYUN_CHANNEL)[keyof typeof SHANHAIYUN_CHANNEL]

export type ShanhaiyunProfileSnapshot = {
  name: string
  gender: string
  age: string
  education: string
  phone: string
  wechat: string
  email: string
  addressDetail: string
  poiLabel: string
  latitude: number
  longitude: number
  /** 来自历史 `extra.primaryRole`（中文），非固定入口复用时回填身份展示 */
  primaryRoleLabel?: string | null
}

type LeadRow = {
  id?: string
  lead_type: string
  source_path: string | null
  name: string | null
  contact_gender: string | null
  contact_age: string | null
  contact_education: string | null
  contact_phone: string | null
  contact_wechat: string | null
  contact_email: string | null
  contact_poi: string | null
  contact_latitude: number | null
  contact_longitude: number | null
  contact_address_detail: string | null
  extra: Record<string, unknown> | null
}

/** 当前渠道已有一条线索时的快照 + 运营字段（志愿入口可带 `welfare_project_slug`） */
export type ExistingShanhaiyunChannelLead = {
  snapshot: ShanhaiyunProfileSnapshot
  welfareProjectSlug: string | null
  leadId: string | null
}

function welfareProjectSlugFromLeadRow(row: LeadRow): string | null {
  const ex = row.extra && typeof row.extra === 'object' && !Array.isArray(row.extra) ? row.extra : null
  const raw = ex && typeof ex.welfare_project_slug === 'string' ? ex.welfare_project_slug : null
  return raw ? parseWelfareProjectSlug(raw) : null
}

function hasContact(s: ShanhaiyunProfileSnapshot): boolean {
  return Boolean(s.phone.trim() || s.wechat.trim() || s.email.trim())
}

export function isShanhaiyunProfileSnapshotComplete(s: ShanhaiyunProfileSnapshot): boolean {
  return (
    s.name.trim().length > 0 &&
    s.gender.trim().length > 0 &&
    s.age.trim().length > 0 &&
    s.education.trim().length > 0 &&
    hasContact(s) &&
    Number.isFinite(s.latitude) &&
    Number.isFinite(s.longitude) &&
    s.addressDetail.trim().length > 0
  )
}

function matchesProfileSourceRow(row: LeadRow): boolean {
  if (row.lead_type === 'apply' && (row.source_path?.startsWith('/programs/') ?? false)) return true
  if (row.lead_type === 'network_personal' && (row.source_path?.includes('join-network') ?? false)) return true
  if (row.lead_type === 'science' && (row.source_path?.includes('join-network') ?? false)) return true
  if (row.lead_type === 'impact' && (row.source_path?.includes('join-network') ?? false)) return true
  return false
}


export function leadRowMatchesShanhaiyunChannel(row: LeadRow, channel: ShanhaiyunChannelId): boolean {
  const ex = row.extra
  if (ex && typeof ex === 'object' && ex.shanhaiyun_channel === channel) return true
  if (
    channel === SHANHAIYUN_CHANNEL.citizen_science &&
    row.lead_type === 'science' &&
    (row.source_path?.includes('join-network') ?? false)
  ) {
    return true
  }
  if (
    channel === SHANHAIYUN_CHANNEL.volunteer &&
    row.lead_type === 'impact' &&
    (row.source_path?.includes('join-network') ?? false)
  ) {
    return true
  }
  if (channel === SHANHAIYUN_CHANNEL.citizen_science && ex && typeof ex === 'object' && ex.entry === CITIZEN_SCIENCE_ENTRY) return true
  if (channel === SHANHAIYUN_CHANNEL.volunteer && ex && typeof ex === 'object' && ex.entry === SHANHAIYUN_VOLUNTEER_ENTRY) return true
  if (channel === SHANHAIYUN_CHANNEL.shanhai && ex && typeof ex === 'object' && ex.intent === 'join_shanhai') return true
  if (channel === SHANHAIYUN_CHANNEL.join_network_personal && ex && typeof ex === 'object') {
    if (ex.intent !== 'join_network_personal') return false
    if (ex.shanhaiyun_channel === SHANHAIYUN_CHANNEL.join_activity) return false
    if (ex.join_flow === 'activity') return false
    return true
  }
  if (channel === SHANHAIYUN_CHANNEL.join_activity && ex && typeof ex === 'object') {
    return ex.shanhaiyun_channel === SHANHAIYUN_CHANNEL.join_activity || ex.join_flow === 'activity'
  }
  return false
}

type ProfileOverlayRow = {
  real_name: string | null
  profile_phone: string | null
  profile_email: string | null
}

async function fetchProfileOverlayForSnapshotMerge(userId: string): Promise<ProfileOverlayRow | null> {
  if (isMockAuthMode()) return null
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('real_name, profile_phone, profile_email')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as ProfileOverlayRow
}

function mergeLeadSnapshotWithProfileOverlay(
  snap: ShanhaiyunProfileSnapshot,
  overlay: ProfileOverlayRow | null,
): ShanhaiyunProfileSnapshot {
  if (!overlay) return snap
  const rn = overlay.real_name?.trim()
  const ph = overlay.profile_phone?.trim()
  const em = overlay.profile_email?.trim()
  return {
    ...snap,
    name: rn ? rn : snap.name,
    phone: ph ? ph : snap.phone,
    email: em ? em : snap.email,
  }
}

function mapRowToSnapshot(row: LeadRow): ShanhaiyunProfileSnapshot {
  const ex = row.extra && typeof row.extra === 'object' ? row.extra : null
  const primaryRoleLabel =
    ex && typeof ex.primaryRole === 'string' ? (ex.primaryRole as string) : null
  return {
    name: (row.name ?? '').trim(),
    gender: (row.contact_gender ?? '').trim(),
    age: (row.contact_age ?? '').trim(),
    education: (row.contact_education ?? '').trim(),
    phone: (row.contact_phone ?? '').trim(),
    wechat: (row.contact_wechat ?? '').trim(),
    email: (row.contact_email ?? '').trim(),
    addressDetail: (row.contact_address_detail ?? '').trim(),
    poiLabel: (row.contact_poi ?? '').trim() || '历史定位点',
    latitude: row.contact_latitude ?? NaN,
    longitude: row.contact_longitude ?? NaN,
    primaryRoleLabel,
  }
}

export function snapshotToMapPoiChoice(snap: ShanhaiyunProfileSnapshot): Extract<JoinNetworkPoiChoice, { kind: 'map' }> {
  const poi: NearbyMapPoi = {
    id: 'shanhaiyun-snapshot',
    source: 'overpass',
    osmType: 'other',
    osmId: 0,
    name: snap.poiLabel,
    lat: snap.latitude,
    lng: snap.longitude,
  }
  return { kind: 'map', poi, distanceKm: 0 }
}

export function snapshotToUserGeo(snap: ShanhaiyunProfileSnapshot): {
  lat: number
  lng: number
  capturedAt: string
} {
  return {
    lat: snap.latitude,
    lng: snap.longitude,
    capturedAt: new Date().toISOString(),
  }
}

/**
 * 最近一次「完整山海云档案」线索：`network_personal`（加入网络）或 `apply`（购课）或 `science`/`impact`（公民科学/志愿）。
 */
export async function fetchLatestShanhaiyunProfileSnapshot(userId: string): Promise<ShanhaiyunProfileSnapshot | null> {
  if (isMockAuthMode()) return null

  const overlay = await fetchProfileOverlayForSnapshotMerge(userId)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, lead_type, source_path, name, contact_gender, contact_age, contact_education, contact_phone, contact_wechat, contact_email, contact_poi, contact_latitude, contact_longitude, contact_address_detail, extra',
    )
    .eq('created_by_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as LeadRow[]
  for (const row of rows) {
    if (!matchesProfileSourceRow(row)) continue
    const snap = mapRowToSnapshot(row)
    if (isShanhaiyunProfileSnapshotComplete(snap)) return mergeLeadSnapshotWithProfileOverlay(snap, overlay)
  }
  return null
}

/** 当前渠道是否已有登记（禁止重复 insert）；含 `leads.id` 与志愿 `extra.welfare_project_slug` 便于补写报名表 */
export async function fetchExistingLeadForShanhaiyunChannel(
  userId: string,
  channel: ShanhaiyunChannelId,
): Promise<ExistingShanhaiyunChannelLead | null> {
  if (isMockAuthMode()) return null

  const overlay = await fetchProfileOverlayForSnapshotMerge(userId)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, lead_type, source_path, name, contact_gender, contact_age, contact_education, contact_phone, contact_wechat, contact_email, contact_poi, contact_latitude, contact_longitude, contact_address_detail, extra',
    )
    .eq('created_by_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as LeadRow[]
  for (const row of rows) {
    if (leadRowMatchesShanhaiyunChannel(row, channel)) {
      const snapshot = mergeLeadSnapshotWithProfileOverlay(mapRowToSnapshot(row), overlay)
      return {
        snapshot,
        welfareProjectSlug: welfareProjectSlugFromLeadRow(row),
        leadId: row.id && String(row.id).trim() ? String(row.id) : null,
      }
    }
  }
  return null
}

/** 是否已有「合作共建 · 机构加入自然教育网络」线索（`cooperation` + `extra.intent === 'join_network'`） */
export async function fetchExistingCooperationJoinNetworkLead(userId: string): Promise<boolean> {
  if (isMockAuthMode()) return false

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, extra')
    .eq('created_by_user_id', userId)
    .eq('lead_type', 'cooperation')
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    const ex = row.extra && typeof row.extra === 'object' && !Array.isArray(row.extra) ? (row.extra as Record<string, unknown>) : null
    if (ex && ex.intent === 'join_network') return true
  }
  return false
}

export function resolveShanhaiyunChannelId(opts: {
  isVolunteerEntry: boolean
  isCitizenScienceEntry: boolean
  isShanhaiIntent: boolean
  isActivityIntent: boolean
}): ShanhaiyunChannelId {
  if (opts.isVolunteerEntry) return SHANHAIYUN_CHANNEL.volunteer
  if (opts.isCitizenScienceEntry) return SHANHAIYUN_CHANNEL.citizen_science
  if (opts.isShanhaiIntent) return SHANHAIYUN_CHANNEL.shanhai
  if (opts.isActivityIntent) return SHANHAIYUN_CHANNEL.join_activity
  return SHANHAIYUN_CHANNEL.join_network_personal
}
