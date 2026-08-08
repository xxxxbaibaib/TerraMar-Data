import { resources as mockResources } from '../../mock/resources'
import type { ResourceArticle } from '../../mock/types'
import { getSupabaseClient } from '../supabase/client'
import { isSupabaseConfigured } from '../supabase/env'
import { writeCmsAudit } from './audit'
import type { CmsResourceRow, CmsStatus } from './types'

function rowToArticle(row: CmsResourceRow): ResourceArticle {
  const paragraphs = Array.isArray(row.paragraphs) ? row.paragraphs : []
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.article_date ?? '',
    summary: row.summary,
    paragraphs,
    videoUrl: row.video_url,
  }
}

export async function fetchPublishedResources(): Promise<ResourceArticle[]> {
  if (!isSupabaseConfigured()) return mockResources
  try {
    const { data, error } = await getSupabaseClient()
      .from('cms_resource_articles')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return mockResources
    return (data as CmsResourceRow[]).map(rowToArticle)
  } catch {
    return mockResources
  }
}

export async function fetchPublishedResourceBySlug(slug: string): Promise<ResourceArticle | null> {
  const list = await fetchPublishedResources()
  return list.find((r) => r.slug === slug) ?? null
}

export async function listResourcesAdmin(): Promise<CmsResourceRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('cms_resource_articles')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...(r as CmsResourceRow),
    paragraphs: Array.isArray((r as CmsResourceRow).paragraphs)
      ? ((r as CmsResourceRow).paragraphs as string[])
      : [],
  }))
}

export async function upsertResource(input: {
  id?: string
  slug: string
  title: string
  category: string
  summary: string
  article_date?: string | null
  paragraphs: string[]
  video_url?: string | null
  status: CmsStatus
  sort_order?: number
}): Promise<CmsResourceRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const row = {
    id: input.id,
    slug: input.slug,
    title: input.title,
    category: input.category,
    summary: input.summary,
    article_date: input.article_date || null,
    paragraphs: input.paragraphs,
    video_url: input.video_url ?? null,
    status: input.status,
    sort_order: input.sort_order ?? 0,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
    updated_by: user?.id ?? null,
  }
  const q = input.id
    ? supabase.from('cms_resource_articles').update(row).eq('id', input.id)
    : supabase.from('cms_resource_articles').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw error
  await writeCmsAudit({
    action: input.status === 'published' ? 'publish' : 'save',
    entity: 'cms_resource_articles',
    entityId: (data as CmsResourceRow).id,
  })
  return data as CmsResourceRow
}

export async function seedResourcesFromMock(): Promise<number> {
  const existing = await listResourcesAdmin()
  if (existing.length) return 0
  let n = 0
  for (const [i, r] of mockResources.entries()) {
    await upsertResource({
      slug: r.slug,
      title: r.title,
      category: r.category,
      summary: r.summary,
      article_date: r.date || null,
      paragraphs: r.paragraphs ?? [],
      video_url: r.videoUrl ?? null,
      status: 'published',
      sort_order: (i + 1) * 10,
    })
    n += 1
  }
  return n
}
