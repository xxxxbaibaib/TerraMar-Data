/** 与 impactProgramCards.id、platform_welfare_enrollments.welfare_project_slug 一致 */

export const WELFARE_PROJECT_SLUGS = [
  'eco-culture',
  'citizen-science',
  'child-nature-class',
  'community-capacity',
] as const

export type WelfareProjectSlug = (typeof WELFARE_PROJECT_SLUGS)[number]

export const VOLUNTEER_ENGAGEMENT_CATALOG_SLUG = 'shanhaiyun_volunteer' as const

const SLUG_SET = new Set<string>(WELFARE_PROJECT_SLUGS)

export function parseWelfareProjectSlug(raw: string | null | undefined): WelfareProjectSlug | null {
  if (!raw) return null
  const t = raw.trim()
  return SLUG_SET.has(t) ? (t as WelfareProjectSlug) : null
}

export function welfareProjectTitle(slug: WelfareProjectSlug): string {
  switch (slug) {
    case 'eco-culture':
      return '生态文化传承项目'
    case 'citizen-science':
      return '公民科学家项目'
    case 'child-nature-class':
      return '儿童自然课堂项目'
    case 'community-capacity':
      return '社区能力建设项目'
    default:
      return slug
  }
}
