import { getSupabaseClient } from '../supabase/client'

export type CreateOrgWithPartnerInput = {
  orgName: string
  summary?: string | null
  staffHeadcount?: number | null
  latitude: number
  longitude: number
  contact: string
  partnerProjectName: string
  partnerSummary?: string | null
}

/** 从「机构人数」自由文本中取首个数字，若无则 null */
export function parseStaffHeadcount(raw: string): number | null {
  const m = raw.trim().match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return Number.isFinite(n) ? n : null
}

/**
 * 写入机构根行 + 伙伴项目子行（RLS：须已登录，owner 为当前用户）。
 * 失败时抛出，由调用方捕获（线索可能已成功写入）。
 */
export async function createOrganizationWithPartnerProject(
  input: CreateOrgWithPartnerInput,
): Promise<{ orgId: string; partnerId: string }> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录后再同步机构档案')

  const orgPayload: Record<string, unknown> = {
    unit_type: 'organization',
    parent_id: null,
    owner_user_id: user.id,
    name: input.orgName.trim(),
    summary: input.summary?.trim() || null,
    contact: input.contact.trim(),
    staff_headcount: input.staffHeadcount ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    metadata: {},
    verification_status: 'pending',
  }

  const { data: orgRow, error: orgErr } = await supabase
    .from('platform_co_building_units')
    .insert(orgPayload)
    .select('id')
    .single()

  if (orgErr) throw new Error(orgErr.message)
  const orgId = (orgRow as { id: string }).id

  const partnerPayload: Record<string, unknown> = {
    unit_type: 'partner_project',
    parent_id: orgId,
    owner_user_id: user.id,
    name: input.partnerProjectName.trim(),
    summary: input.partnerSummary?.trim() || null,
    contact: null,
    metadata: {},
  }

  const { data: partnerRow, error: partnerErr } = await supabase
    .from('platform_co_building_units')
    .insert(partnerPayload)
    .select('id')
    .single()

  if (partnerErr) throw new Error(partnerErr.message)
  return { orgId, partnerId: (partnerRow as { id: string }).id }
}
