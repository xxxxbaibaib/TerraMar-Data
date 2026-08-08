import { getSupabaseClient } from '../supabase/client'
import type { CmsAuditRow } from './types'

export async function writeCmsAudit(input: {
  action: string
  entity: string
  entityId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('cms_audit_log').insert({
      actor_id: user?.id ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? {},
    })
  } catch (e) {
    console.warn('[CMS] audit log failed', e)
  }
}

export async function listCmsAudit(limit = 50): Promise<CmsAuditRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('cms_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as CmsAuditRow[]
}
