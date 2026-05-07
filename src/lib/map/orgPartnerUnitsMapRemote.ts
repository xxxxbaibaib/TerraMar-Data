import type { CooperationNodeMeta, MapNode } from '../../mock/map/mapTypes'
import { getSupabaseClient } from '../supabase/client'

type OrgMapRow = {
  id: string
  unit_type: string
  parent_id: string | null
  name: string
  summary: string | null
  latitude: number
  longitude: number
  verification_status: string | null
  staff_headcount: number | null
  metadata: unknown
}

function defaultCooperationMeta(name: string, summary: string | null): CooperationNodeMeta {
  return {
    partnerName: name,
    cooperationSubject: '社会机构',
    subjectSubtype: '其他',
    resourceTypes: summary?.trim() ? [summary.trim().slice(0, 40)] : ['机构网络登记'],
  }
}

export function orgPartnerRowToMapNode(row: OrgMapRow): MapNode {
  const meta = defaultCooperationMeta(row.name, row.summary)
  const status =
    row.verification_status === 'verified'
      ? 'active'
      : row.verification_status === 'pending'
        ? 'planning'
        : 'active'

  return {
    id: `org-unit-${row.id}`,
    page: 'cooperation',
    nodeType: 'institution',
    name: row.unit_type === 'organization' ? row.name : `${row.name}（伙伴项目）`,
    location: {
      id: `org-loc-${row.id}`,
      lng: row.longitude,
      lat: row.latitude,
    },
    tags: ['platform_co_building_units', row.unit_type, ...(row.verification_status ? [row.verification_status] : [])],
    status,
    cooperationMeta: meta,
    metrics: [
      { label: '档案类型', value: row.unit_type === 'organization' ? '机构' : '伙伴项目' },
      ...(row.staff_headcount != null ? [{ label: '从业人数', value: row.staff_headcount }] : []),
    ],
  }
}

/** 拉取可展示在合作共建地图上的机构/伙伴（须已有 latitude/longitude） */
export async function fetchOrgPartnerUnitsForMap(): Promise<MapNode[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('platform_co_building_units')
    .select('id, unit_type, parent_id, name, summary, latitude, longitude, verification_status, staff_headcount, metadata')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as OrgMapRow[]
  return rows.map(orgPartnerRowToMapNode)
}
