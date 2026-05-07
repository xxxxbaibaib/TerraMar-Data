import type { MapNode } from '../../mock/map/mapTypes'
import { getSupabaseClient } from '../supabase/client'

type SpeciesMapRow = {
  id: string
  species_name_cn: string
  observed_at: string
  location: unknown
  latitude: number | null
  longitude: number | null
  verification_status: string
  notes: string | null
}

function parseLocationJsonb(raw: unknown): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const lat = Number(o.lat)
  const lng = Number(o.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

function coordsForRow(row: SpeciesMapRow): { lat: number; lng: number } | null {
  const fromLoc = parseLocationJsonb(row.location)
  if (fromLoc) return fromLoc
  if (
    row.latitude != null &&
    row.longitude != null &&
    Number.isFinite(row.latitude) &&
    Number.isFinite(row.longitude)
  ) {
    return { lat: row.latitude, lng: row.longitude }
  }
  return null
}

/** 与 `notes` 中 `分类:birds` 写入格式一致（见 speciesRecordsRemote） */
function topicSlugFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = String(notes).match(/分类:([a-z_]+)/i)
  return m ? m[1].toLowerCase() : null
}

function mapDbStatusToMapNodeStatus(v: string): NonNullable<MapNode['status']> {
  if (v === 'approved') return 'verified'
  if (v === 'pending_review') return 'pending_review'
  if (v === 'rejected') return 'rejected'
  return 'pending_review'
}

export function speciesObservationRowToMapNode(row: SpeciesMapRow, coords: { lat: number; lng: number }): MapNode {
  const topic = topicSlugFromNotes(row.notes)
  const tags = ['platform_species_records', row.verification_status]
  if (topic) tags.push(topic)

  const status = mapDbStatusToMapNodeStatus(row.verification_status)

  return {
    id: `species-obs-${row.id}`,
    page: 'science',
    nodeType: 'species_record',
    name: `${row.species_name_cn}（观测）`,
    location: { id: `species-loc-${row.id}`, lng: coords.lng, lat: coords.lat },
    tags,
    status,
    metrics: [{ label: '观测时间', value: row.observed_at }],
  }
}

const SELECT =
  'id, species_name_cn, observed_at, location, latitude, longitude, verification_status, notes'

/**
 * 科学地图叠加：已审核记录（匿名可读）+ 当前登录用户本人待审核且有坐标的记录。
 * 新上传点位在运营审核前为 `pending_review`，仅本人会话下可见。
 */
export async function fetchSpeciesObservationsForMap(): Promise<MapNode[]> {
  const supabase = getSupabaseClient()
  const { data: approved, error: errApproved } = await supabase
    .from('platform_species_records')
    .select(SELECT)
    .eq('verification_status', 'approved')
    .order('observed_at', { ascending: false })
    .limit(200)

  if (errApproved) throw new Error(errApproved.message)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let pending: SpeciesMapRow[] = []
  if (user) {
    const { data: pend, error: errPending } = await supabase
      .from('platform_species_records')
      .select(SELECT)
      .eq('verification_status', 'pending_review')
      .eq('observer_user_id', user.id)
      .order('observed_at', { ascending: false })
      .limit(80)
    if (!errPending && pend) pending = pend as SpeciesMapRow[]
  }

  const merged = [...pending, ...(approved ?? [])] as SpeciesMapRow[]
  const seen = new Set<string>()
  const unique = merged.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  const out: MapNode[] = []
  for (const row of unique) {
    const coords = coordsForRow(row)
    if (!coords) continue
    out.push(speciesObservationRowToMapNode(row, coords))
  }
  return out
}

/** @deprecated 使用 `fetchSpeciesObservationsForMap`（含本人待审核） */
export async function fetchApprovedSpeciesObservationsForMap(): Promise<MapNode[]> {
  return fetchSpeciesObservationsForMap()
}
