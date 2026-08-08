import type { MapPageType } from '../mock/map/mapTypes'
import { getSupabaseClient } from '../lib/supabase/client'
import { isSupabaseConfigured } from '../lib/supabase/env'

/**
 * Storage 中存放首屏视频的 bucket。
 * 运行时优先读 `hero_media` 表的 public_url（见 useHeroVideoSrc）；
 * 此处提供构建期/同步回退：Storage public URL → 可选 env → 本地 /assets。
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

/** 优先 Storage public URL，再回退 env（兼容旧配置），最后本地 assets */
function heroUrlWithOverride(fileName: string, envOverride: string | undefined): string {
  if (isSupabaseConfigured()) {
    try {
      const { data } = getSupabaseClient().storage.from(HERO_VIDEO_BUCKET).getPublicUrl(fileName)
      if (data.publicUrl) return data.publicUrl
    } catch {
      /* fall through */
    }
  }
  const override = normalizeEnvUrl(envOverride)
  if (override) return override
  return `/assets/${fileName}`
}

/** 首页首屏（同步回退；页面请用 useHomeHeroVideoSrc） */
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
