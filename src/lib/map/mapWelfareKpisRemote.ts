import type { MapMetric } from '../../mock/map/mapTypes'
import { mapDashboardMetricRowToMapMetric } from './mapDashboardMetricsRemote'
import { getSupabaseClient } from '../supabase/client'

type KpiRow = {
  metric_key: string
  label: string
  value_text: string
  trend: string | null
}

/**
 * 公益地图 KPI：来自 `get_public_welfare_enrollment_kpis()`（聚合 platform_welfare_enrollments）。
 * 需在 Supabase 执行迁移：`supabase/migrations/20250619120000_welfare_project_slug_and_kpis_rpc.sql`
 */
/** Impact 页大图与 MapHero 会同时拉取；合并为单次 in-flight 请求，减少重复 404/配额消耗 */
let welfareKpiInflight: Promise<MapMetric[]> | null = null

function mapRpcRowsToMetrics(rows: KpiRow[]): MapMetric[] {
  return rows.map((row) =>
    mapDashboardMetricRowToMapMetric({
      page: 'impact',
      metric_key: row.metric_key,
      label: row.label,
      value_text: row.value_text,
      trend: row.trend,
    }),
  )
}

export async function fetchWelfareEnrollmentKpisAsMapMetrics(): Promise<MapMetric[]> {
  if (welfareKpiInflight) return welfareKpiInflight

  welfareKpiInflight = (async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('get_public_welfare_enrollment_kpis')
      if (error) {
        // 未部署 RPC 时 PostgREST 为 HTTP 404 / code 如 PGRST202；不抛错，由调用方回退 mock
        return []
      }
      const rows = (data ?? []) as KpiRow[]
      return mapRpcRowsToMetrics(rows)
    } catch {
      return []
    } finally {
      welfareKpiInflight = null
    }
  })()

  return welfareKpiInflight
}
