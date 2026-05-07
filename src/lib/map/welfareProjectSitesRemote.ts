import type { MapNode } from '../../mock/map/mapTypes'
import { welfareProjectTitle, type WelfareProjectSlug } from '../impact/welfareProjectSlugs'
import { getSupabaseClient } from '../supabase/client'

export type WelfareProjectSiteGeometryKind = 'point' | 'polygon'

/** 与表 `platform_welfare_project_sites.site_type` 一致 */
export type WelfareProjectSiteType = '保护地' | '社区' | '学校' | '公众传播' | '综合'

export type WelfareProjectSiteRow = {
  id: string
  welfare_project_slug: string | null
  site_name: string
  site_type: WelfareProjectSiteType
  summary: string | null
  geometry_kind: WelfareProjectSiteGeometryKind
  centroid_lat: number
  centroid_lng: number
  boundary_geojson: unknown | null
  tags: string[]
}

const SITE_TAG = 'welfare_project_site'

export type SitePolygonGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

function isPolygonGeometry(g: unknown): g is SitePolygonGeometry {
  if (!g || typeof g !== 'object') return false
  const t = (g as { type?: string }).type
  return t === 'Polygon' || t === 'MultiPolygon'
}

/** 供 Leaflet 校验；polygon 行应带合法 geometry */
export function parseSiteBoundaryGeometry(raw: unknown): SitePolygonGeometry | null {
  if (!isPolygonGeometry(raw)) return null
  return raw
}

export function welfareProjectSiteToMapNode(site: WelfareProjectSiteRow): MapNode {
  const slug = site.welfare_project_slug
  const projectLabel =
    slug && ['eco-culture', 'citizen-science', 'child-nature-class', 'community-capacity'].includes(slug)
      ? welfareProjectTitle(slug as WelfareProjectSlug)
      : slug ?? '—'

  const metrics: { label: string; value: string }[] = [
    { label: '类型', value: '公益项目地（运营配置）' },
    { label: '项目地类型', value: site.site_type },
    { label: '几何形态', value: site.geometry_kind === 'polygon' ? '面（范围）' : '点' },
    { label: '关联公益项目', value: projectLabel },
  ]
  if (site.summary?.trim()) {
    metrics.push({ label: '简介', value: site.summary.trim() })
  }

  return {
    id: `welfare-site-${site.id}`,
    page: 'impact',
    nodeType: site.geometry_kind === 'polygon' ? 'habitat' : 'community',
    name: site.site_name,
    location: {
      id: `welfare-site-loc-${site.id}`,
      lat: site.centroid_lat,
      lng: site.centroid_lng,
    },
    tags: [...site.tags, SITE_TAG, site.site_type, ...(slug ? [slug] : [])],
    status: 'active',
    metrics,
  }
}

export function isWelfareProjectSiteMapNode(node: MapNode): boolean {
  return node.tags.includes(SITE_TAG)
}

export async function fetchPublicWelfareProjectSites(): Promise<WelfareProjectSiteRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('platform_welfare_project_sites')
    .select(
      'id, welfare_project_slug, site_name, site_type, summary, geometry_kind, centroid_lat, centroid_lng, boundary_geojson, tags',
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[TerraMar] platform_welfare_project_sites', error.message)
    }
    return []
  }

  const siteTypes: readonly WelfareProjectSiteType[] = ['保护地', '社区', '学校', '公众传播', '综合']

  return (data ?? []).map((row) => {
    const st = row.site_type as string
    const siteType: WelfareProjectSiteType = siteTypes.includes(st as WelfareProjectSiteType)
      ? (st as WelfareProjectSiteType)
      : '综合'
    return {
      id: row.id as string,
      welfare_project_slug: (row.welfare_project_slug as string | null) ?? null,
      site_name: row.site_name as string,
      site_type: siteType,
      summary: (row.summary as string | null) ?? null,
      geometry_kind: row.geometry_kind as WelfareProjectSiteGeometryKind,
      centroid_lat: row.centroid_lat as number,
      centroid_lng: row.centroid_lng as number,
      boundary_geojson: row.boundary_geojson,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    }
  })
}
