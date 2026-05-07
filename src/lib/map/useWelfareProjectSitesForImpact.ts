import { useEffect, useState } from 'react'
import type { MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchPublicWelfareProjectSites, type WelfareProjectSiteRow } from './welfareProjectSitesRemote'

export type WelfareProjectSitesState = {
  sites: WelfareProjectSiteRow[]
  loaded: boolean
}

const initial: WelfareProjectSitesState = { sites: [], loaded: false }

/**
 * Impact 公益地图：拉取「公益项目地」配置（platform_welfare_project_sites）。
 */
export function useWelfareProjectSitesForImpact(page: MapPageType): WelfareProjectSitesState {
  const [state, setState] = useState<WelfareProjectSitesState>(initial)

  useEffect(() => {
    setState(initial)
    if (page !== 'impact') return
    if (!isSupabaseConfigured()) return

    let cancelled = false
    void (async () => {
      try {
        const sites = await fetchPublicWelfareProjectSites()
        if (!cancelled) setState({ sites, loaded: true })
      } catch {
        if (!cancelled) setState({ sites: [], loaded: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page])

  return state
}
