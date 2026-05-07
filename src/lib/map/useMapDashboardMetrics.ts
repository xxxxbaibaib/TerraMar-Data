import { useEffect, useState } from 'react'
import { mapMetrics } from '../../mock/map/mapMetrics'
import type { MapMetric, MapPageType } from '../../mock/map/mapTypes'
import { isSupabaseConfigured } from '../supabase/env'
import { fetchMapDashboardMetrics } from './mapDashboardMetricsRemote'
import { fetchWelfareEnrollmentKpisAsMapMetrics } from './mapWelfareKpisRemote'

function mockMetricsForPage(page: MapPageType): MapMetric[] {
  return mapMetrics.filter((m) => m.page === page)
}

/**
 * 地图大屏 KPI：公益页 `impact` 优先聚合 `platform_welfare_enrollments`（RPC），其余页读 `map_dashboard_metrics`；失败或未配置时回退 mock。
 */
export function useMapDashboardMetrics(page: MapPageType): MapMetric[] {
  const [metrics, setMetrics] = useState<MapMetric[]>(() => mockMetricsForPage(page))

  useEffect(() => {
    setMetrics(mockMetricsForPage(page))
  }, [page])

  useEffect(() => {
    const fallback = mockMetricsForPage(page)
    if (!isSupabaseConfigured()) {
      setMetrics(fallback)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        if (page === 'impact') {
          const kpi = await fetchWelfareEnrollmentKpisAsMapMetrics().catch(() => [] as MapMetric[])
          if (cancelled) return
          if (kpi.length > 0) {
            setMetrics(kpi)
            return
          }
        }
        const rows = await fetchMapDashboardMetrics(page)
        if (cancelled) return
        setMetrics(rows.length > 0 ? rows : fallback)
      } catch {
        if (!cancelled) setMetrics(fallback)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page])

  return metrics
}
