import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, viteSupabaseAnonKey, viteSupabaseUrl } from './env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  }
  if (!client) {
    client = createClient(viteSupabaseUrl(), viteSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
