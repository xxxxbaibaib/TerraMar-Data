/** 资源文章阅读/视频进度（按用户 + slug，本机持久化） */

export const RESOURCE_PROGRESS_EVENT = 'terramar-resource-progress'

const ROOT_KEY = 'terramar_resource_progress_v1'

export type SlugProgress = {
  /** 正文滚动达成度 0–100 */
  textPct: number
  /** 内嵌视频观看度 0–100；无视频时保持 100 表示不参与拉低 */
  videoPct: number
  updatedAt: string
}

type RootShape = Record<string, Record<string, SlugProgress>>

function readRoot(): RootShape {
  try {
    const raw = localStorage.getItem(ROOT_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as RootShape
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function writeRoot(data: RootShape) {
  localStorage.setItem(ROOT_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(RESOURCE_PROGRESS_EVENT))
}

function migrateSlug(p: SlugProgress): SlugProgress {
  return {
    textPct: Math.max(0, Math.min(100, p.textPct ?? 0)),
    videoPct: Math.max(0, Math.min(100, p.videoPct ?? 0)),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  }
}

export function getSlugProgress(userId: string, slug: string): SlugProgress {
  const root = readRoot()
  const raw = root[userId]?.[slug]
  if (!raw) return { textPct: 0, videoPct: 0, updatedAt: '' }
  return migrateSlug(raw)
}

/** hasVideo=false 时仅看 textPct；有视频时按权重合并 */
export function combinedResourceProgress(hasVideo: boolean, p: SlugProgress): number {
  const t = Math.max(0, Math.min(100, p.textPct))
  if (!hasVideo) return Math.round(t)
  const v = Math.max(0, Math.min(100, p.videoPct))
  return Math.round(Math.min(100, t * 0.45 + v * 0.55))
}

export function setResourceTextProgress(userId: string, slug: string, textPct: number) {
  const root = readRoot()
  const prev = root[userId]?.[slug] ?? { textPct: 0, videoPct: 0, updatedAt: '' }
  const next: SlugProgress = {
    ...prev,
    textPct: Math.max(prev.textPct, Math.max(0, Math.min(100, textPct))),
    updatedAt: new Date().toISOString(),
  }
  const userMap = { ...(root[userId] ?? {}), [slug]: next }
  writeRoot({ ...root, [userId]: userMap })
}

export function setResourceVideoProgress(userId: string, slug: string, videoPct: number) {
  const root = readRoot()
  const prev = root[userId]?.[slug] ?? { textPct: 0, videoPct: 0, updatedAt: '' }
  const next: SlugProgress = {
    ...prev,
    videoPct: Math.max(prev.videoPct, Math.max(0, Math.min(100, videoPct))),
    updatedAt: new Date().toISOString(),
  }
  const userMap = { ...(root[userId] ?? {}), [slug]: next }
  writeRoot({ ...root, [userId]: userMap })
}

export function readAllResourceProgressForUser(userId: string): Record<string, SlugProgress> {
  return { ...(readRoot()[userId] ?? {}) }
}
