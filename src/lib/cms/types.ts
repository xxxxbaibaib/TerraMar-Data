export type CmsStatus = 'draft' | 'published' | 'archived'

export type HomePageBlocks = {
  eyebrow: string
  headline: string
  subtitle: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

export type AboutPageBlocks = {
  heroTitle: string
  heroSubtitle: string
  visionTitle: string
  visionBody: string
}

export type SiteSettingsRow = {
  id: number
  brand_name: string
  tagline: string
  service_region: string
  phone: string
  wechat: string
  email: string
  business_email: string
  logo_url: string
  updated_at?: string
}

export type SitePageRow = {
  key: string
  title: string
  status: CmsStatus
  blocks: Record<string, unknown>
  updated_at?: string
  published_at?: string | null
}

export type TeamMemberRow = {
  id: string
  name: string
  role: string
  bio: string
  image_url: string
  sort_order: number
  status: CmsStatus
  published_at?: string | null
  updated_at?: string
}

export type MediaAssetRow = {
  id: string
  bucket: string
  path: string
  public_url: string
  kind: 'image' | 'video' | 'other'
  alt: string
  created_at?: string
}

export type CmsProgramRow = {
  id: string
  slug: string
  title: string
  status: CmsStatus
  payload: Record<string, unknown>
  sort_order: number
  published_at?: string | null
  updated_at?: string
}

export type CmsResourceRow = {
  id: string
  slug: string
  title: string
  category: string
  summary: string
  article_date: string | null
  paragraphs: string[]
  video_url: string | null
  status: CmsStatus
  sort_order: number
  published_at?: string | null
  updated_at?: string
}

export type HeroMediaRow = {
  page_key: string
  label: string
  storage_bucket: string
  storage_path: string
  public_url: string
  updated_at?: string
}

export type CmsAuditRow = {
  id: string
  actor_id: string | null
  action: string
  entity: string
  entity_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

export const DEFAULT_HOME_BLOCKS: HomePageBlocks = {
  eyebrow: 'Learning with the living world',
  headline: '让保护被看见，让自然可感知，让参与有意义。',
  subtitle: '清华团队成立，致力于国家公园自然教育体系研究，文化传播，社区能力建设。',
  primaryCtaLabel: '查看近期活动',
  primaryCtaHref: '/programs',
  secondaryCtaLabel: '了解我们的使命',
  secondaryCtaHref: '/about#mission',
}

export const DEFAULT_ABOUT_BLOCKS: AboutPageBlocks = {
  heroTitle: '关于我们',
  heroSubtitle: 'TerraMar 山海自然科考致力于让更多人理解保护地、理解生命，并参与到真实的自然保护行动中。',
  visionTitle: '品牌愿景',
  visionBody:
    '我们坚信，一家真正成功的自然教育机构，其价值不应仅以营收和利润衡量，更应以它唤醒了多少人对自然的热爱、改变了多少儿童的生命轨迹、贡献了多少保护地的科研数据、带动了多少社区的发展来定义。这正是本机构存在的根本意义。',
}

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettingsRow, 'id' | 'updated_at'> = {
  brand_name: 'TerraMar Expeditions 山海自然科考',
  tagline: '让保护被看见，让自然可感知，让参与有意义。',
  service_region: '长三角优先',
  phone: '138-0000-0000',
  wechat: 'TerraMarEdu',
  email: 'hello@terramar.example',
  business_email: 'partnership@terramar.example',
  logo_url: '/logo-brand.png',
}
