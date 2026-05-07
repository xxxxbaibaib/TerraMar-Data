import type { User } from '@supabase/supabase-js'

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** 是否为常见 E.164 / 国内手机号形态（宽松，用于从 identity `sub` 辨认） */
function looksLikePhone(raw: string): boolean {
  const t = raw.replace(/\s/g, '')
  if (t.length < 8) return false
  return /^\+?\d[\d-]{6,}\d$/.test(t)
}

/**
 * Auth 用户「注册/登录时绑定」的手机号：优先 `user.phone`，其次手机 OTP identity、`user_metadata.phone`。
 */
export function authRegistrationPhone(au: User | null | undefined): string {
  if (!au) return ''
  const direct = str(au.phone)
  if (direct) return direct

  const meta = au.user_metadata as Record<string, unknown> | undefined
  const fromMeta = str(meta?.phone) || str(meta?.mobile) || str(meta?.phone_number)
  if (fromMeta) return fromMeta

  const phoneIdentity = au.identities?.find((i) => i.provider === 'phone')
  const d = phoneIdentity?.identity_data as Record<string, unknown> | undefined
  if (d) {
    const cand = str(d.phone) || str(d.phone_number) || str(d.sub)
    if (cand && looksLikePhone(cand)) return cand.replace(/\s/g, '')
  }
  return ''
}

/**
 * Auth 用户「注册/登录时绑定」的邮箱：优先 `user.email`，其次各 OAuth / email identity 的 `identity_data.email`。
 */
export function authRegistrationEmail(au: User | null | undefined): string {
  if (!au) return ''
  const direct = str(au.email)
  if (direct) return direct

  for (const id of au.identities ?? []) {
    const d = id.identity_data as Record<string, unknown> | undefined
    if (!d) continue
    const e = str(d.email) || str(d.email_address)
    if (e && e.includes('@')) return e
  }
  return ''
}
