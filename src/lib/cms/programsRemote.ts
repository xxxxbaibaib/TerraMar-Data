import { programs as mockPrograms } from '../../mock/programs'
import type { Program } from '../../mock/types'
import { getSupabaseClient } from '../supabase/client'
import { isSupabaseConfigured } from '../supabase/env'
import { writeCmsAudit } from './audit'
import type { CmsProgramRow, CmsStatus } from './types'

function rowToProgram(row: CmsProgramRow): Program {
  const p = row.payload as Partial<Program>
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: (p.type as Program['type']) ?? 'weekend',
    themeTags: p.themeTags ?? [],
    locationName: p.locationName ?? '',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    durationText: p.durationText ?? '',
    audienceTags: p.audienceTags ?? [],
    intensity: (p.intensity as Program['intensity']) ?? 'low',
    priceFrom: p.priceFrom,
    priceTo: p.priceTo,
    spotsTotal: p.spotsTotal,
    spotsLeft: p.spotsLeft,
    heroImageUrl: p.heroImageUrl ?? '',
    brief: p.brief ?? '',
    highlights: p.highlights ?? [],
    itinerary: p.itinerary ?? [],
    included: p.included ?? [],
    excluded: p.excluded ?? [],
    safetyNotes: p.safetyNotes ?? [],
    faq: p.faq ?? [],
    instructors: p.instructors ?? [],
  }
}

export async function fetchPublishedPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured()) return mockPrograms
  try {
    const { data, error } = await getSupabaseClient()
      .from('cms_programs')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return mockPrograms
    return (data as CmsProgramRow[]).map(rowToProgram)
  } catch {
    return mockPrograms
  }
}

export async function fetchPublishedProgramBySlug(slug: string): Promise<Program | null> {
  const list = await fetchPublishedPrograms()
  return list.find((p) => p.slug === slug) ?? null
}

export async function listProgramsAdmin(): Promise<CmsProgramRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('cms_programs')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as CmsProgramRow[]
}

export async function upsertProgram(input: {
  id?: string
  slug: string
  title: string
  status: CmsStatus
  payload: Record<string, unknown>
  sort_order?: number
}): Promise<CmsProgramRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const row = {
    id: input.id,
    slug: input.slug,
    title: input.title,
    status: input.status,
    payload: { ...input.payload, slug: input.slug, title: input.title },
    sort_order: input.sort_order ?? 0,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
    updated_by: user?.id ?? null,
  }
  const q = input.id
    ? supabase.from('cms_programs').update(row).eq('id', input.id)
    : supabase.from('cms_programs').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw error
  await writeCmsAudit({
    action: input.status === 'published' ? 'publish' : 'save',
    entity: 'cms_programs',
    entityId: (data as CmsProgramRow).id,
  })
  return data as CmsProgramRow
}

export async function seedProgramsFromMock(): Promise<number> {
  const existing = await listProgramsAdmin()
  if (existing.length) return 0
  let n = 0
  for (const [i, p] of mockPrograms.entries()) {
    await upsertProgram({
      slug: p.slug,
      title: p.title,
      status: 'published',
      sort_order: (i + 1) * 10,
      payload: { ...p },
    })
    n += 1
  }
  return n
}

export { rowToProgram }
