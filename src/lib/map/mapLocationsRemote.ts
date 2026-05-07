import type { CooperationNodeMeta, CooperationSubject, MapNode, MapNodeType, MapPageType } from '../../mock/map/mapTypes'
import { getSupabaseClient } from '../supabase/client'

type MapLocationRow = {
  id: string
  page: string
  node_type: string
  name: string
  lat: number
  lng: number
  location_id: string | null
  city: string | null
  province: string | null
  tags: string[] | null
  status: string | null
  metrics: unknown
  cooperation_meta: unknown
}

const COOPERATION_SUBJECTS: CooperationSubject[] = ['政府', '社会机构', 'NGO']

function parseMetrics(raw: unknown): MapNode['metrics'] {
  if (!Array.isArray(raw)) return undefined
  const out: { label: string; value: string | number }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.label !== 'string') continue
    if (typeof o.value === 'string' || typeof o.value === 'number') {
      out.push({ label: o.label, value: o.value })
    }
  }
  return out.length ? out : undefined
}

function parseCooperationMeta(raw: unknown): CooperationNodeMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  if (typeof o.partnerName !== 'string') return undefined
  if (typeof o.cooperationSubject !== 'string' || !COOPERATION_SUBJECTS.includes(o.cooperationSubject as CooperationSubject))
    return undefined
  if (typeof o.subjectSubtype !== 'string') return undefined
  if (!Array.isArray(o.resourceTypes) || !o.resourceTypes.every((x) => typeof x === 'string')) return undefined
  return {
    partnerName: o.partnerName,
    cooperationSubject: o.cooperationSubject as CooperationSubject,
    subjectSubtype: o.subjectSubtype,
    resourceTypes: o.resourceTypes as string[],
  }
}

export function mapLocationRowToMapNode(row: MapLocationRow): MapNode {
  const page = row.page as MapPageType
  const nodeType = row.node_type as MapNodeType
  const status = row.status as MapNode['status'] | null | undefined
  const cooperationMeta = parseCooperationMeta(row.cooperation_meta)
  return {
    id: row.id,
    page,
    nodeType,
    name: row.name,
    location: {
      id: row.location_id ?? row.id,
      lng: row.lng,
      lat: row.lat,
      city: row.city ?? undefined,
      province: row.province ?? undefined,
    },
    tags: row.tags ?? [],
    metrics: parseMetrics(row.metrics),
    status: status ?? undefined,
    cooperationMeta,
  }
}

/** 从 Supabase 拉取指定地图页的点位；失败时由调用方回退 mock */
export async function fetchMapLocations(page: MapPageType): Promise<MapNode[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('map_locations')
    .select('id, page, node_type, name, lat, lng, location_id, city, province, tags, status, metrics, cooperation_meta')
    .eq('page', page)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as MapLocationRow[]
  return rows.map(mapLocationRowToMapNode)
}
