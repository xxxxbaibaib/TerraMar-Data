import { getSupabaseClient } from '../supabase/client'
import { writeCmsAudit } from './audit'
import type { MediaAssetRow } from './types'

export const CMS_MEDIA_BUCKET = 'cms-media'

export async function listMediaAssets(limit = 80): Promise<MediaAssetRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as MediaAssetRow[]
}

export async function uploadCmsImage(file: File, alt = ''): Promise<MediaAssetRow> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `uploads/${user?.id ?? 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: upErr } = await supabase.storage.from(CMS_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(path)
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      bucket: CMS_MEDIA_BUCKET,
      path,
      public_url: pub.publicUrl,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      alt,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  await writeCmsAudit({ action: 'upload', entity: 'media_assets', entityId: (data as MediaAssetRow).id })
  return data as MediaAssetRow
}
