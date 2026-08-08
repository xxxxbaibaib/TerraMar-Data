import { getSupabaseClient } from '../supabase/client'
import { writeCmsAudit } from './audit'

export type LeadAdminRow = {
  id: string
  lead_type: string
  source_path: string
  name: string
  contact: string
  message: string | null
  created_at: string
}

export async function listLeadsAdmin(limit = 100): Promise<LeadAdminRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('leads')
    .select('id,lead_type,source_path,name,contact,message,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as LeadAdminRow[]
}

export type MapLocationAdminRow = {
  id: string
  page: string
  title: string
  node_type: string | null
  lat: number
  lng: number
  sort_order: number
}

export async function listMapLocationsAdmin(page?: string): Promise<MapLocationAdminRow[]> {
  let q = getSupabaseClient()
    .from('map_locations')
    .select('id,page,title,node_type,lat,lng,sort_order')
    .order('sort_order', { ascending: true })
  if (page) q = q.eq('page', page)
  const { data, error } = await q.limit(200)
  if (error) throw error
  return (data ?? []) as MapLocationAdminRow[]
}

export async function upsertMapLocation(input: Partial<MapLocationAdminRow> & { id: string; page: string; title: string; lat: number; lng: number }): Promise<void> {
  const { error } = await getSupabaseClient().from('map_locations').upsert({
    id: input.id,
    page: input.page,
    title: input.title,
    node_type: input.node_type ?? null,
    lat: input.lat,
    lng: input.lng,
    sort_order: input.sort_order ?? 0,
  })
  if (error) throw error
  await writeCmsAudit({ action: 'save', entity: 'map_locations', entityId: input.id })
}

export type SpeciesReviewRow = {
  id: string
  verification_status: string
  common_name: string | null
  scientific_name: string | null
  created_at: string
  user_id: string
}

export async function listPendingSpecies(limit = 50): Promise<SpeciesReviewRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('platform_species_records')
    .select('id,verification_status,common_name,scientific_name,created_at,user_id')
    .eq('verification_status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as SpeciesReviewRow[]
}

export async function setSpeciesStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('platform_species_records')
    .update({ verification_status: status })
    .eq('id', id)
  if (error) throw error
  await writeCmsAudit({ action: status, entity: 'platform_species_records', entityId: id })
}

export type GuideReviewRow = {
  id: string
  title: string | null
  verification_status: string
  created_at: string
  user_id: string
}

export async function listPendingGuides(limit = 50): Promise<GuideReviewRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('platform_experience_guides')
    .select('id,title,verification_status,created_at,user_id')
    .eq('verification_status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as GuideReviewRow[]
}

export async function setGuideStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('platform_experience_guides')
    .update({ verification_status: status })
    .eq('id', id)
  if (error) throw error
  await writeCmsAudit({ action: status, entity: 'platform_experience_guides', entityId: id })
}
