import { getSupabaseClient } from '../supabase/client'
import { isSupabaseConfigured } from '../supabase/env'
import { writeCmsAudit } from './audit'
import {
  DEFAULT_ABOUT_BLOCKS,
  DEFAULT_HOME_BLOCKS,
  DEFAULT_SITE_SETTINGS,
  type AboutPageBlocks,
  type CmsStatus,
  type HomePageBlocks,
  type SitePageRow,
  type SiteSettingsRow,
} from './types'

function asHomeBlocks(raw: Record<string, unknown> | null | undefined): HomePageBlocks {
  return { ...DEFAULT_HOME_BLOCKS, ...(raw as Partial<HomePageBlocks>) }
}

function asAboutBlocks(raw: Record<string, unknown> | null | undefined): AboutPageBlocks {
  return { ...DEFAULT_ABOUT_BLOCKS, ...(raw as Partial<AboutPageBlocks>) }
}

export async function fetchSiteSettings(): Promise<SiteSettingsRow> {
  if (!isSupabaseConfigured()) {
    return { id: 1, ...DEFAULT_SITE_SETTINGS }
  }
  try {
    const { data, error } = await getSupabaseClient().from('site_settings').select('*').eq('id', 1).maybeSingle()
    if (error || !data) return { id: 1, ...DEFAULT_SITE_SETTINGS }
    return data as SiteSettingsRow
  } catch {
    return { id: 1, ...DEFAULT_SITE_SETTINGS }
  }
}

export async function saveSiteSettings(patch: Partial<SiteSettingsRow>): Promise<SiteSettingsRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: 1, ...patch, updated_by: user?.id ?? null }, { onConflict: 'id' })
    .select('*')
    .single()
  if (error) throw error
  await writeCmsAudit({ action: 'save', entity: 'site_settings', entityId: '1', payload: patch as Record<string, unknown> })
  return data as SiteSettingsRow
}

export async function fetchPublishedHomeBlocks(): Promise<HomePageBlocks> {
  if (!isSupabaseConfigured()) return DEFAULT_HOME_BLOCKS
  try {
    const { data, error } = await getSupabaseClient()
      .from('site_pages')
      .select('blocks,status')
      .eq('key', 'home')
      .eq('status', 'published')
      .maybeSingle()
    if (error || !data) return DEFAULT_HOME_BLOCKS
    return asHomeBlocks(data.blocks as Record<string, unknown>)
  } catch {
    return DEFAULT_HOME_BLOCKS
  }
}

export async function fetchPublishedAboutBlocks(): Promise<AboutPageBlocks> {
  if (!isSupabaseConfigured()) return DEFAULT_ABOUT_BLOCKS
  try {
    const { data, error } = await getSupabaseClient()
      .from('site_pages')
      .select('blocks,status')
      .eq('key', 'about')
      .eq('status', 'published')
      .maybeSingle()
    if (error || !data) return DEFAULT_ABOUT_BLOCKS
    return asAboutBlocks(data.blocks as Record<string, unknown>)
  } catch {
    return DEFAULT_ABOUT_BLOCKS
  }
}

export async function fetchSitePageAdmin(key: string): Promise<SitePageRow | null> {
  const { data, error } = await getSupabaseClient().from('site_pages').select('*').eq('key', key).maybeSingle()
  if (error) throw error
  return data as SitePageRow | null
}

export async function saveSitePage(
  key: string,
  input: { title?: string; blocks: Record<string, unknown>; status: CmsStatus },
): Promise<SitePageRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const published_at = input.status === 'published' ? new Date().toISOString() : null
  const { data, error } = await supabase
    .from('site_pages')
    .upsert(
      {
        key,
        title: input.title ?? key,
        blocks: input.blocks,
        status: input.status,
        published_at,
        updated_by: user?.id ?? null,
      },
      { onConflict: 'key' },
    )
    .select('*')
    .single()
  if (error) throw error
  await writeCmsAudit({
    action: input.status === 'published' ? 'publish' : 'save',
    entity: 'site_pages',
    entityId: key,
    payload: { status: input.status },
  })
  return data as SitePageRow
}

export function parseHomeBlocks(blocks: Record<string, unknown>): HomePageBlocks {
  return asHomeBlocks(blocks)
}

export function parseAboutBlocks(blocks: Record<string, unknown>): AboutPageBlocks {
  return asAboutBlocks(blocks)
}
