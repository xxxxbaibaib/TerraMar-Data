import { useEffect, useState } from 'react'
import type { MapNode, MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchSpeciesObservationsForMap } from './speciesObservationsMapRemote'

/** 公民科学地图：叠加 Supabase `platform_species_records`（已审核 + 本人待审核） */
export function useSpeciesObservationMapNodes(page: MapPageType): MapNode[] {
  const [nodes, setNodes] = useState<MapNode[]>([])

  useEffect(() => {
    if (page !== 'science') {
      setNodes([])
      return
    }

    if (!isSupabaseConfigured()) {
      setNodes([])
      return
    }

    let cancelled = false
    void fetchSpeciesObservationsForMap()
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
