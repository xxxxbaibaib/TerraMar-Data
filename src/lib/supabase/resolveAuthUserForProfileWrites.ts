import type { SupabaseClient, User } from '@supabase/supabase-js'

/** PostgREST 写 profiles / resource_progress 前：getUser() 偶发空时用 session.user */
export async function resolveAuthUserForProfileWrites(supabase: SupabaseClient): Promise<User | null> {
  const { data: gu } = await supabase.auth.getUser()
  if (gu.user) return gu.user
  const { data: sess } = await supabase.auth.getSession()
  return sess.session?.user ?? null
}
