import { useEffect, useState } from 'react'
import type { MapNode, MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchOrgPartnerUnitsForMap } from './orgPartnerUnitsMapRemote'

/** 合作共建地图：叠加 Supabase `platform_co_building_units` 中有经纬度的机构/伙伴 */
export function useOrgPartnerMapNodes(page: MapPageType): MapNode[] {
  const [nodes, setNodes] = useState<MapNode[]>([])

  useEffect(() => {
    if (page !== 'cooperation') {
      setNodes([])
      return
    }

    if (!isSupabaseConfigured()) {
      setNodes([])
      return
    }

    let cancelled = false
    void fetchOrgPartnerUnitsForMap()
      .then((rows) => {
        if (!cancelled) setNodes(rows)
      })
      .catch(() => {
        if (!cancelled) setNodes([])
      })

    return () => {
      cancelled = true
    }
  }, [page])

  return nodes
}
