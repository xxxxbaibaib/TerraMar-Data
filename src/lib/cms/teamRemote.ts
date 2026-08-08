import type { TeamMember } from '../../mock/team'
import { teamMembers as mockTeam } from '../../mock/team'
import { getSupabaseClient } from '../supabase/client'
import { isSupabaseConfigured } from '../supabase/env'
import { writeCmsAudit } from './audit'
import type { CmsStatus, TeamMemberRow } from './types'

export async function fetchPublishedTeamMembers(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured()) return mockTeam
  try {
    const { data, error } = await getSupabaseClient()
      .from('team_members')
      .select('name,role,bio,image_url,sort_order')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return mockTeam
    return data.map((r) => ({
      name: r.name as string,
      role: r.role as string,
      bio: r.bio as string,
      image: (r.image_url as string) || '',
    }))
  } catch {
    return mockTeam
  }
}

export async function listTeamMembersAdmin(): Promise<TeamMemberRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('team_members')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as TeamMemberRow[]
}

export async function upsertTeamMember(
  input: Partial<TeamMemberRow> & { name: string; role: string; bio: string },
): Promise<TeamMemberRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const row = {
    id: input.id,
    name: input.name,
    role: input.role,
    bio: input.bio,
    image_url: input.image_url ?? '',
    sort_order: input.sort_order ?? 0,
    status: (input.status ?? 'draft') as CmsStatus,
    published_at: input.status === 'published' ? new Date().toISOString() : input.published_at ?? null,
    updated_by: user?.id ?? null,
  }
  const q = input.id
    ? supabase.from('team_members').update(row).eq('id', input.id)
    : supabase.from('team_members').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw error
  await writeCmsAudit({
    action: input.status === 'published' ? 'publish' : 'save',
    entity: 'team_members',
    entityId: (data as TeamMemberRow).id,
  })
  return data as TeamMemberRow
}

export async function archiveTeamMember(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('team_members')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error) throw error
  await writeCmsAudit({ action: 'archive', entity: 'team_members', entityId: id })
}
