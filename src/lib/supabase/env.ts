/** 去掉末尾斜杠与误写的 `/rest/v1`，与 `createClient` 要求一致 */
export function viteSupabaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL
  if (raw == null || typeof raw !== 'string') return ''
  let u = raw.trim().replace(/\/+$/, '')
  u = u.replace(/\/rest\/v1$/i, '')
  return u
}

export function viteSupabaseAnonKey(): string {
  const raw = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (raw == null || typeof raw !== 'string') return ''
  return raw.trim()
}

/** 解析 JWT payload 中的 role（不校验签名，仅用于区分 anon / service_role） */
function jwtPayloadRole(jwt: string): string | null {
  const parts = jwt.split('.')
  if (parts.length < 2) return null
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad) b64 += '='.repeat(4 - pad)
    const json = JSON.parse(atob(b64)) as { role?: string }
    return typeof json.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

/** Supabase URL + anon key 齐全，且浏览器端禁止使用 service_role */
export function isSupabaseConfigured(): boolean {
  const url = viteSupabaseUrl()
  const key = viteSupabaseAnonKey()
  if (!url || !key) return false
  const role = jwtPayloadRole(key)
  if (role === 'service_role') {
    if (import.meta.env.DEV) {
      console.error(
        '[TerraMar] VITE_SUPABASE_ANON_KEY 为 service_role：浏览器必须使用 Dashboard → API 里的「anon」「public」密钥，否则将退回本地 mock 登录。',
      )
    }
    return false
  }
  return true
}

/**
 * 使用本地 mock auth + localStorage 订单/线索。
 * `VITE_USE_MOCK_AUTH=true` 时即使配了 Supabase 也强制 mock。
 */
export function isMockAuthMode(): boolean {
  if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') return true
  return !isSupabaseConfigured()
}

export function logAuthBackendModeOnce(): void {
  if (!import.meta.env.DEV) return
  if ((globalThis as { __terramarAuthLogged?: boolean }).__terramarAuthLogged) return
  ;(globalThis as { __terramarAuthLogged?: boolean }).__terramarAuthLogged = true
  if (isMockAuthMode()) {
    const hasUrl = viteSupabaseUrl().length > 0
    const hasKey = viteSupabaseAnonKey().length > 0
    console.info(
      '[TerraMar] 当前为「本地 mock」登录：',
      import.meta.env.VITE_USE_MOCK_AUTH === 'true'
        ? '因 VITE_USE_MOCK_AUTH=true'
        : !hasUrl || !hasKey
          ? '因缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY（或 anon 无效）'
          : '请查看上方红色报错',
      '· 修改 .env.local 后需重启 npm run dev',
    )
  } else {
    console.info('[TerraMar] 当前为「Supabase」登录，URL:', viteSupabaseUrl())
  }
}
