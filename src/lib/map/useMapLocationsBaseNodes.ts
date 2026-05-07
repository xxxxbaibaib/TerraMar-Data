import { useEffect, useState } from 'react'
import { mapNodes } from '../../mock/map/mapNodes'
import type { MapNode, MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchMapLocations } from './mapLocationsRemote'
import { fetchProgramExplorationMapPoints, programExplorationPointsToMapNodes } from './programExplorationMapRemote'

function mockNodesForPage(page: MapPageType): MapNode[] {
  return mapNodes.filter((node) => node.page === page)
}

export type MapLocationsDirectoryState = {
  nodes: MapNode[]
  /** 已从 Supabase `map_locations` 成功载入 */
  origin: 'supabase' | 'mock'
  /** 远程失败、空表或配置缺失时的说明（mock 时可能为 null） */
  remoteError: string | null
}

/**
 * 地图页「静态」点位：优先 Supabase `map_locations`，未配置、失败或空表时回退 `mapNodes`。
 * `origin` 用于区分真实目录与内置示例，便于入网页向用户说明。
 */
export function useMapLocationsBaseNodes(page: MapPageType): MapLocationsDirectoryState {
  const [state, setState] = useState<MapLocationsDirectoryState>(() => ({
    nodes: mockNodesForPage(page),
    origin: 'mock',
    remoteError: null,
  }))

  useEffect(() => {
    const fallback = mockNodesForPage(page)
    setState({ nodes: fallback, origin: 'mock', remoteError: null })

    if (!isSupabaseConfigured()) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const [rows, participantPoints] = await Promise.all([
          fetchMapLocations(page),
          page === 'programs'
            ? fetchProgramExplorationMapPoints(30).catch((e) => {
                const msg = e instanceof Error ? e.message : String(e)
                if (import.meta.env.DEV) {
                  console.warn('[TerraMar] tm_program_exploration_map_points 拉取失败', msg)
                }
                return []
              })
            : Promise.resolve([]),
        ])
        if (cancelled) return
        const participantNodes =
          page === 'programs' && participantPoints.length > 0
            ? programExplorationPointsToMapNodes(participantPoints)
            : []
        if (rows.length > 0) {
          setState({
            nodes: [...rows, ...participantNodes],
            origin: 'supabase',
            remoteError: null,
          })
        } else {
          setState({
            nodes: [...fallback, ...participantNodes],
            origin: 'mock',
            remoteError:
              participantNodes.length > 0
                ? null
                : '已连接数据库，但 map_locations 中暂无该页数据，请执行迁移种子。',
          })
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        if (import.meta.env.DEV) {
          console.warn('[TerraMar] map_locations 拉取失败', { page, msg })
        }
        setState({ nodes: fallback, origin: 'mock', remoteError: msg })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page])

  return state
}
