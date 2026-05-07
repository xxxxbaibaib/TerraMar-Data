import type { MapMetric, MapPageType } from '../../mock/map/mapTypes'
import { getSupabaseClient } from '../supabase/client'

type MetricRow = {
  page: string
  metric_key: string
  label: string
  value_text: string
  trend: string | null
}

function parseMetricDisplayValue(raw: string): string | number {
  const s = raw.trim()
  if (/^-?\d+$/.test(s)) return Number(s)
  if (/^-?\d+\.\d+$/.test(s)) return Number(s)
  return s
}

function parseTrend(raw: string | null | undefined): MapMetric['trend'] {
  if (raw === 'up' || raw === 'down' || raw === 'flat') return raw
  return undefined
}

export function mapDashboardMetricRowToMapMetric(row: MetricRow): MapMetric {
  return {
    page: row.page as MapPageType,
    key: row.metric_key,
    label: row.label,
    value: parseMetricDisplayValue(row.value_text),
    trend: parseTrend(row.trend),
  }
}

export async function fetchMapDashboardMetrics(page: MapPageType): Promise<MapMetric[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('map_dashboard_metrics')
    .select('page, metric_key, label, value_text, trend')
    .eq('page', page)
    .order('sort_order', { ascending: true })
    .order('metric_key', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as MetricRow[]).map(mapDashboardMetricRowToMapMetric)
}
