import { getSupabaseClient } from '../supabase/client'
import { resolveAuthUserForProfileWrites } from '../supabase/resolveAuthUserForProfileWrites'

type ProgressPatch = {
  textPct: number
  videoPct: number
  completedOnce: boolean
}

/**
 * 将资源阅读进度写入 `resource_progress`（与本地 store 双写，失败仅打日志）。
 */
export async function upsertResourceProgressRemote(
  userId: string,
  resourceSlug: string,
  patch: ProgressPatch,
): Promise<void> {
  const supabase = getSupabaseClient()
  const user = await resolveAuthUserForProfileWrites(supabase)
  if (!user || user.id !== userId) return

  const { error } = await supabase.from('resource_progress').upsert(
    {
      user_id: userId,
      resource_slug: resourceSlug,
      text_pct: Math.max(0, Math.min(100, patch.textPct)),
      video_pct: Math.max(0, Math.min(100, patch.videoPct)),
      completed_once: patch.completedOnce,
    },
    { onConflict: 'user_id,resource_slug' },
  )
  if (error) throw new Error(error.message)
}
