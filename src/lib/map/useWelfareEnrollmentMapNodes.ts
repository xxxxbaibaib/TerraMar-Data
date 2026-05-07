import { useEffect, useState } from 'react'
import type { MapNode, MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchWelfareEnrollmentMapPoints, welfareEnrollmentRowsToMapNodes } from './welfareEnrollmentMapRemote'

export type WelfareEnrollmentMapNodesState = {
  nodes: MapNode[]
  /** 是否已从 RPC 载入至少一条坐标（用于替换 impact 内置 mock 目录） */
  fromEnrollments: boolean
}

const empty: WelfareEnrollmentMapNodesState = { nodes: [], fromEnrollments: false }

/**
 * Impact 地图：从 `platform_welfare_enrollments` 经公开 RPC 拉取坐标并转为 MapNode。
 */
export function useWelfareEnrollmentMapNodes(page: MapPageType): WelfareEnrollmentMapNodesState {
  const [state, setState] = useState<WelfareEnrollmentMapNodesState>(empty)

  useEffect(() => {
    setState(empty)
    if (page !== 'impact') return
    if (!isSupabaseConfigured()) return

    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchWelfareEnrollmentMapPoints(800)
        if (cancelled) return
        const nodes = welfareEnrollmentRowsToMapNodes(rows)
        setState({
          nodes,
          fromEnrollments: nodes.length > 0,
        })
      } catch {
        if (!cancelled) setState(empty)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page])

  return state
}
