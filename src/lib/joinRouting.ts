import { CITIZEN_SCIENCE_ENTRY } from './citizenScienceLeads'
import { SHANHAIYUN_VOLUNTEER_ENTRY } from './shanhaiyunVolunteerLeads'

/** URL 查询参数名：与「加入自然教育活动 / 网络」对应 */
export const JOIN_INTENT_QUERY = 'intent' as const

export const activityJoinPath = '/join-network?intent=activity' as const
export const networkJoinPath = '/join-network?intent=network' as const
export const shanhaiJoinPath = '/join-network?intent=shanhai' as const

/** 注册/演示档案用的加入意图（由 intent 或 entry 推导） */
export type CloudJoinIntent = 'activity' | 'network' | 'volunteer' | 'citizen_science' | 'shanhai'

export function resolveCloudJoinIntent(
  intent: string | null,
  entry: string | null,
): CloudJoinIntent | null {
  if (intent === 'activity') return 'activity'
  if (intent === 'network') return 'network'
  if (intent === 'shanhai') return 'shanhai'
  if (entry === SHANHAIYUN_VOLUNTEER_ENTRY) return 'volunteer'
  if (entry === CITIZEN_SCIENCE_ENTRY) return 'citizen_science'
  return null
}

/**
 * 仅允许站内相对路径作为登录后回跳，防止开放重定向。
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    return null
  }
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path.includes('://')) return null
  if (path.includes('\\')) return null
  if (path.length > 2048) return null
  return path
}

export function buildAuthHref(
  base: '/login' | '/register',
  params: { next?: string | null; intent?: string | null; entry?: string | null },
): string {
  const sp = new URLSearchParams()
  const safe = safeNextPath(params.next)
  if (safe) sp.set('next', safe)
  if (params.intent) sp.set(JOIN_INTENT_QUERY, params.intent)
  if (params.entry) sp.set('entry', params.entry)
  const q = sp.toString()
  return q ? `${base}?${q}` : base
}

export function joinReturnPath(pathname: string, search: string): string {
  return `${pathname}${search}` || '/'
}
