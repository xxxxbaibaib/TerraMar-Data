import { getSupabaseClient } from '../supabase/client'

export type EngagementDomain = 'natural_education_program' | 'welfare_action' | 'citizen_science_project'

export type EngagementStatus = 'interested' | 'registered' | 'completed' | 'dropped'

const tableByDomain: Record<EngagementDomain, string> = {
  natural_education_program: 'platform_exploration_enrollments',
  welfare_action: 'platform_welfare_enrollments',
  citizen_science_project: 'platform_citizen_science_enrollments',
}

/** 与 `platform_welfare_enrollments.volunteer_profile`、登记页表单一致（运营快照，权威 PII 仍在 leads） */
export type WelfareVolunteerProfileJson = {
  display_name: string
  gender?: string | null
  age?: string | null
  education?: string | null
  phone?: string | null
  wechat?: string | null
  email?: string | null
  address_detail?: string | null
  note?: string | null
}

function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t.length > 0 ? t : null
}

export function buildWelfareVolunteerProfileSnapshot(parts: {
  name: string
  gender: string
  age: string
  education: string
  phone: string
  wechat: string
  email: string
  addressDetail: string
  note: string
}): WelfareVolunteerProfileJson {
  return {
    display_name: parts.name.trim(),
    gender: emptyToNull(parts.gender),
    age: emptyToNull(parts.age),
    education: emptyToNull(parts.education),
    phone: emptyToNull(parts.phone),
    wechat: emptyToNull(parts.wechat),
    email: emptyToNull(parts.email),
    address_detail: emptyToNull(parts.addressDetail),
    note: emptyToNull(parts.note),
  }
}

/**
 * 个人参与（课程 / 公益 / 公民科学项目），写入对应 `platform_*_enrollments` 表；唯一约束 `(user_id, catalog_slug)`。
 */
export async function upsertMemberEngagement(input: {
  userId: string
  domain: EngagementDomain
  catalogSlug: string
  status: EngagementStatus
  metadata?: Record<string, unknown>
  latitude?: number | null
  longitude?: number | null
  /** 仅 `welfare_action` 域写入 `platform_welfare_enrollments.welfare_project_slug` */
  welfareProjectSlug?: string | null
  /** 仅 `welfare_action` 域写入 `platform_welfare_enrollments.volunteer_profile` */
  volunteerProfile?: WelfareVolunteerProfileJson | null
}): Promise<void> {
  const supabase = getSupabaseClient()
  /** getUser 偶发空包；本地 session 仍有效时用 getSession 对齐，避免漏写 platform_*_enrollments */
  const {
    data: { user: gotUser },
  } = await supabase.auth.getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionUser = session?.user
  const resolvedId = gotUser?.id ?? sessionUser?.id ?? null
  if (!resolvedId) {
    throw new Error('无法写入报名表：当前无有效登录会话，请重新登录后再试。')
  }
  if (resolvedId !== input.userId) {
    throw new Error('无法写入报名表：会话用户与操作不一致，请重新登录后再试。')
  }

  const table = tableByDomain[input.domain]
  const base: Record<string, unknown> = {
    user_id: input.userId,
    catalog_slug: input.catalogSlug.trim(),
    status: input.status,
    metadata: input.metadata ?? {},
    ...(typeof input.latitude === 'number' && Number.isFinite(input.latitude)
      ? { latitude: input.latitude }
      : {}),
    ...(typeof input.longitude === 'number' && Number.isFinite(input.longitude)
      ? { longitude: input.longitude }
      : {}),
  }
  if (input.domain === 'welfare_action' && input.welfareProjectSlug != null && input.welfareProjectSlug !== '') {
    base.welfare_project_slug = input.welfareProjectSlug.trim()
  }
  if (input.domain === 'welfare_action' && input.volunteerProfile != null) {
    base.volunteer_profile = input.volunteerProfile
  }
  const { error } = await supabase.from(table).upsert(base, { onConflict: 'user_id,catalog_slug' })
  if (error) throw new Error(error.message)
}
