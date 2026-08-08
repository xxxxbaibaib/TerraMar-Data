import { getSupabaseClient } from '../supabase/client'
import { isSupabaseConfigured } from '../supabase/env'
import { writeCmsAudit } from './audit'
import type { HeroMediaRow } from './types'

const HERO_BUCKET = 'background video'

export async function listHeroMediaAdmin(): Promise<HeroMediaRow[]> {
  const { data, error } = await getSupabaseClient().from('hero_media').select('*').order('page_key')
  if (error) throw error
  return (data ?? []) as HeroMediaRow[]
}

export async function fetchHeroPublicUrlMap(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {}
  try {
    const { data, error } = await getSupabaseClient().from('hero_media').select('page_key,public_url,storage_bucket,storage_path')
    if (error || !data) return {}
    const out: Record<string, string> = {}
    for (const row of data as HeroMediaRow[]) {
      if (row.public_url?.trim()) {
        out[row.page_key] = row.public_url.trim()
        continue
      }
      if (row.storage_path) {
        const { data: pub } = getSupabaseClient().storage.from(row.storage_bucket || HERO_BUCKET).getPublicUrl(row.storage_path)
        out[row.page_key] = pub.publicUrl
      }
    }
    return out
  } catch {
    return {}
  }
}

export async function saveHeroMedia(row: Pick<HeroMediaRow, 'page_key' | 'label' | 'storage_bucket' | 'storage_path' | 'public_url'>): Promise<HeroMediaRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let public_url = row.public_url
  if (!public_url && row.storage_path) {
    const { data: pub } = supabase.storage.from(row.storage_bucket || HERO_BUCKET).getPublicUrl(row.storage_path)
    public_url = pub.publicUrl
  }
  const { data, error } = await supabase
    .from('hero_media')
    .upsert(
      {
        page_key: row.page_key,
        label: row.label,
        storage_bucket: row.storage_bucket || HERO_BUCKET,
        storage_path: row.storage_path,
        public_url,
        updated_by: user?.id ?? null,
      },
      { onConflict: 'page_key' },
    )
    .select('*')
    .single()
  if (error) throw error
  await writeCmsAudit({ action: 'save', entity: 'hero_media', entityId: row.page_key })
  return data as HeroMediaRow
}

export async function uploadHeroVideo(pageKey: string, file: File, label: string): Promise<HeroMediaRow> {
  const supabase = getSupabaseClient()
  const path = `cms-${pageKey}-${Date.now()}.mp4`
  const { error: upErr } = await supabase.storage.from(HERO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'video/mp4',
  })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from(HERO_BUCKET).getPublicUrl(path)
  return saveHeroMedia({
    page_key: pageKey,
    label,
    storage_bucket: HERO_BUCKET,
    storage_path: path,
    public_url: pub.publicUrl,
  })
}

/** 用现有 storage_path 刷新 public_url（去掉签名依赖） */
export async function refreshHeroPublicUrls(): Promise<number> {
  const rows = await listHeroMediaAdmin()
  let n = 0
  for (const row of rows) {
    if (!row.storage_path) continue
    await saveHeroMedia({
      page_key: row.page_key,
      label: row.label,
      storage_bucket: row.storage_bucket || HERO_BUCKET,
      storage_path: row.storage_path,
      public_url: '',
    })
    n += 1
  }
  return n
}
