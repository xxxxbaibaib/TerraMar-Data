/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 设为 `true` 时启用山海云 API 客户端（未实现写路径前仍应配合业务层降级） */
  readonly VITE_SHANHAIYUN_API_ENABLED?: string
  /** 例如 `https://api.shanhaiyun.example`（无尾斜杠） */
  readonly VITE_SHANHAIYUN_API_BASE_URL?: string
  /** Supabase 项目 URL，如 `https://xxxx.supabase.co` */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon（公开）密钥，仅用于浏览器 */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 首屏背景视频所在 Storage bucket，默认 `background video` */
  readonly VITE_SUPABASE_HERO_VIDEO_BUCKET?: string
  /** Storage 签名 URL（会过期）；未设时回退 getPublicUrl 或 /assets/ */
  readonly VITE_HERO_VIDEO_URL_HOME?: string
  readonly VITE_HERO_VIDEO_URL_PROGRAMS?: string
  readonly VITE_HERO_VIDEO_URL_COOPERATION?: string
  readonly VITE_HERO_VIDEO_URL_IMPACT?: string
  readonly VITE_HERO_VIDEO_URL_SCIENCE?: string
  /** 设为 `true` 时强制使用本地 mock 登录与 localStorage 订单，即使已配置 Supabase */
  readonly VITE_USE_MOCK_AUTH?: string
  /** Geoapify Places API Key；设置后周边兴趣点优先走 Places，失败则回退 Overpass */
  readonly VITE_GEOAPIFY_API_KEY?: string
  /** Places 端点根 URL，默认 `https://api.geoapify.com/v2/places`（勿带 query） */
  readonly VITE_GEOAPIFY_PLACES_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
