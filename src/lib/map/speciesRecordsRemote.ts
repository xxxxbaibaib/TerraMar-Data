import { getSupabaseClient } from '../supabase/client'

/** 与迁移 `20250615120000_platform_six_tables_replace.sql` 及 Storage RLS 一致 */
export const SPECIES_PICTURES_BUCKET = 'species pictures'

function fileExtensionForStorage(file: File): string {
  const n = file.name.toLowerCase()
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg'
  const mime = file.type.toLowerCase()
  if (mime === 'image/png') return 'png'
  return 'jpg'
}

/**
 * 登录用户提交物种记录：可选上传图片到 Storage（路径首段为 user id），再写入 `platform_species_records`。
 */
export async function submitSpeciesObservationToSupabase(input: {
  speciesNameCn: string
  topic: string
  observedAt: string
  lat: number
  lng: number
  imageFile: File | null
}): Promise<{ id: string }> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('请先登录后再提交物种记录。')

  let imageStorageBucket: string | null = null
  let imageStoragePath: string | null = null

  if (input.imageFile && input.imageFile.size > 0) {
    if (!input.imageFile.type.startsWith('image/')) {
      throw new Error('仅支持上传图片（JPEG / PNG）。')
    }
    const ext = fileExtensionForStorage(input.imageFile)
    const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(SPECIES_PICTURES_BUCKET)
      .upload(objectPath, input.imageFile, {
        contentType: input.imageFile.type || 'image/jpeg',
        upsert: false,
      })
    if (upErr) throw new Error(`图片上传失败：${upErr.message}`)
    imageStorageBucket = SPECIES_PICTURES_BUCKET
    imageStoragePath = objectPath
  }

  const idempotencyKey = crypto.randomUUID()
  const { data, error } = await supabase
    .from('platform_species_records')
    .insert({
      observer_user_id: user.id,
      species_name_cn: input.speciesNameCn.trim(),
      observed_at: input.observedAt,
      location: { lat: input.lat, lng: input.lng },
      latitude: input.lat,
      longitude: input.lng,
      verification_status: 'pending_review',
      image_storage_bucket: imageStorageBucket,
      image_storage_path: imageStoragePath,
      notes: `分类:${input.topic}`,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { id: (data as { id: string }).id }
}
