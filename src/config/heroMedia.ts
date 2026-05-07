import type { MapPageType } from '../mock/map/mapTypes'
import { getSupabaseClient } from '../lib/supabase/client'
import { isSupabaseConfigured } from '../lib/supabase/env'

/**
 * Storage 中存放首屏视频的 bucket 名称（与 `getPublicUrl` 回退方案一致）。
 * 若已配置 `VITE_HERO_VIDEO_URL_*` 签名直链，则优先使用（见 `.env`）。
 */
const HERO_VIDEO_BUCKET = import.meta.env.VITE_SUPABASE_HERO_VIDEO_BUCKET ?? 'background video'

function normalizeEnvUrl(raw: string | undefined): string | undefined {
  if (raw == null) return undefined
  let s = String(raw).trim()
  if (s.length === 0) return undefined
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s.length ? s : undefined
}

/**
 * 优先使用 `.env` 中的签名 URL；否则在已配置 Supabase 时用 `getPublicUrl`；否则本地 `/assets/`。
 */
function heroUrlWithOverride(fileName: string, envOverride: string | undefined): string {
  const override = normalizeEnvUrl(envOverride)
  if (override) return override
  if (!isSupabaseConfigured()) {
    return `/assets/${fileName}`
  }
  const { data } = getSupabaseClient().storage.from(HERO_VIDEO_BUCKET).getPublicUrl(fileName)
  return data.publicUrl
}

/** 首页首屏 */
export const HERO_HOME_VIDEO_SRC = heroUrlWithOverride(
  'Video-1777349956294.mp4',
  import.meta.env.VITE_HERO_VIDEO_URL_HOME,
)

/** 可选封面图（本地 `public/hero-home.png`） */
export const HERO_HOME_POSTER: string | undefined = undefined

/** 地图 Hero：科考活动 / 合作共建 / 公益行动 / 科研与公民科学 */
export const heroMapVideoByPage: Record<MapPageType, string> = {
  programs: heroUrlWithOverride('Video-1777350701136.mp4', import.meta.env.VITE_HERO_VIDEO_URL_PROGRAMS),
  cooperation: heroUrlWithOverride('Video-1777350338781.mp4', import.meta.env.VITE_HERO_VIDEO_URL_COOPERATION),
  impact: heroUrlWithOverride('Video-1777360155117.mp4', import.meta.env.VITE_HERO_VIDEO_URL_IMPACT),
  science: heroUrlWithOverride('Video-1777361552225.mp4', import.meta.env.VITE_HERO_VIDEO_URL_SCIENCE),
}
