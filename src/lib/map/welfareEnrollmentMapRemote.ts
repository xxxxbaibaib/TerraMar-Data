import type { MapNode, MapNodeType } from '../../mock/map/mapTypes'
import { welfareProjectTitle, type WelfareProjectSlug } from '../impact/welfareProjectSlugs'
import { getSupabaseClient } from '../supabase/client'

export type WelfareEnrollmentMapPointRow = {
  point_id: string
  lat: number
  lng: number
  welfare_project_slug: string | null
  status: string
}

function slugToNodeType(slug: string | null): MapNodeType {
  switch (slug) {
    case 'eco-culture':
      return 'habitat'
    case 'citizen-science':
      return 'species_record'
    case 'child-nature-class':
      return 'school'
    case 'community-capacity':
      return 'community'
    default:
      return 'source_city'
  }
}

/** 与公益地图筛选项（中文）及 impactType 英文项对齐，满足 MapHeroShell 多条件 AND 过滤 */
function tagsForWelfareRow(slug: string | null, status: string): string[] {
  const tags = new Set<string>()
  if (slug) tags.add(slug)

  switch (slug) {
    case 'eco-culture':
      tags.add('保护地课程')
      tags.add('公众传播')
      tags.add('志愿者')
      break
    case 'citizen-science':
      tags.add('公众传播')
      tags.add('志愿者')
      break
    case 'child-nature-class':
      tags.add('youth_access')
      tags.add('儿童')
      tags.add('家庭')
      break
    case 'community-capacity':
      tags.add('社区项目')
      tags.add('社区居民')
      break
    default:
      tags.add('志愿者')
      break
  }

  switch (status) {
    case 'interested':
      tags.add('规划中')
      break
    case 'registered':
      tags.add('执行中')
      break
    case 'completed':
      tags.add('已完成')
      break
    default:
      tags.add('执行中')
      break
  }

  return [...tags]
}

function statusToMapNodeStatus(
  status: string,
): 'planning' | 'active' | 'completed' | undefined {
  if (status === 'interested') return 'planning'
  if (status === 'registered') return 'active'
  if (status === 'completed') return 'completed'
  return 'active'
}

function statusLabelCn(status: string): string {
  switch (status) {
    case 'interested':
      return '意向'
    case 'registered':
      return '已报名'
    case 'completed':
      return '已完成'
    case 'dropped':
      return '已退出'
    default:
      return status
  }
}

export function welfareEnrollmentRowsToMapNodes(rows: WelfareEnrollmentMapPointRow[]): MapNode[] {
  return rows.map((row) => {
    const slug = row.welfare_project_slug
    const title =
      slug && ['eco-culture', 'citizen-science', 'child-nature-class', 'community-capacity'].includes(slug)
        ? welfareProjectTitle(slug as WelfareProjectSlug)
        : '公益报名'

    return {
      id: `welfare-enrollment-${row.point_id}`,
      page: 'impact' as const,
      nodeType: slugToNodeType(slug),
      name: `公益触点 · ${title}`,
      location: {
        id: `welfare-loc-${row.point_id}`,
        lng: row.lng,
        lat: row.lat,
        city: slug ?? undefined,
        province: undefined,
      },
      tags: tagsForWelfareRow(slug, row.status),
      status: statusToMapNodeStatus(row.status),
      metrics: [
        { label: '项目', value: title },
        { label: '参与状态', value: statusLabelCn(row.status) },
        { label: '数据来源', value: 'platform_welfare_enrollments' },
      ],
    }
  })
}

let welfareMapPointsInflight: Promise<WelfareEnrollmentMapPointRow[]> | null = null

/**
 * 公益地图匿名点位：`get_public_welfare_enrollment_map_points`（platform_welfare_enrollments）。
 * 迁移：`20250622120000_welfare_enrollment_map_points_rpc.sql`
 */
export async function fetchWelfareEnrollmentMapPoints(limit = 500): Promise<WelfareEnrollmentMapPointRow[]> {
  if (welfareMapPointsInflight) return welfareMapPointsInflight

  welfareMapPointsInflight = (async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('get_public_welfare_enrollment_map_points', {
        p_limit: limit,
      })
      if (error) return []
      const raw = (data ?? []) as Array<{
        point_id: string
        lat: number
        lng: number
        welfare_project_slug: string | null
        status: string
      }>
      return raw.map((r) => ({
        point_id: r.point_id,
        lat: r.lat,
        lng: r.lng,
        welfare_project_slug: r.welfare_project_slug,
        status: r.status,
      }))
    } catch {
      return []
    } finally {
      welfareMapPointsInflight = null
    }
  })()

  return welfareMapPointsInflight
}
