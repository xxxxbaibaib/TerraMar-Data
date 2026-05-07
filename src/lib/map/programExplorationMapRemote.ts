import type { MapNode } from '../../mock/map/mapTypes'
import { getSupabaseClient } from '../supabase/client'

export type ProgramExplorationMapPoint = {
  lat: number
  lng: number
  catalog_slug: string
  source: string
}

type RpcRow = {
  lat: number
  lng: number
  catalog_slug: string
  source: string
}

/**
 * 科考活动地图参与者坐标（SECURITY DEFINER RPC；无 PII）。
 * `sinceDays` 映射为 Postgres interval。
 */
export async function fetchProgramExplorationMapPoints(sinceDays = 30): Promise<ProgramExplorationMapPoint[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('tm_program_exploration_map_points', {
    p_since: `${Math.max(1, Math.min(3650, sinceDays))} days`,
  })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as RpcRow[]
  return rows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    catalog_slug: r.catalog_slug,
    source: r.source,
  }))
}

/** 将 RPC 点位并入科考活动地图目录（与 `map_locations` 节点并列展示） */
export function programExplorationPointsToMapNodes(points: ProgramExplorationMapPoint[]): MapNode[] {
  return points.map((p, i) => ({
    id: `enrollment-participant-${p.catalog_slug}-${i}-${Math.round(p.lat * 1e4)}-${Math.round(p.lng * 1e4)}`,
    page: 'programs',
    nodeType: 'source_city',
    name: '参与者',
    location: {
      id: `rpc-${p.catalog_slug}-${i}`,
      lng: p.lng,
      lat: p.lat,
      city: p.catalog_slug,
    },
    tags: [p.source],
    status: 'active',
  }))
}
