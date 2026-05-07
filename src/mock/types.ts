export type ProgramIntensity = 'low' | 'medium' | 'high'

export type ProgramType = 'half_day' | 'weekend' | 'camp' | 'adult_healing' | 'senior' | 'citizen_science'

export interface Program {
  id: string
  slug: string
  title: string
  type: ProgramType
  themeTags: string[]
  locationName: string
  startDate: string
  endDate: string
  durationText: string
  audienceTags: string[]
  intensity: ProgramIntensity
  priceFrom?: number
  priceTo?: number
  spotsTotal?: number
  spotsLeft?: number
  heroImageUrl: string
  brief: string
  highlights: string[]
  itinerary: { dayLabel: string; title: string; content: string }[]
  included: string[]
  excluded: string[]
  safetyNotes: string[]
  faq: { q: string; a: string }[]
  instructors: { name: string; title: string; bio: string }[]
}

export interface ResourceArticle {
  id: string
  title: string
  slug: string
  category: string
  date: string
  summary: string
  /** 正文段落（用于阅读进度滚动测算） */
  paragraphs?: string[]
  /** 可选内嵌视频（演示），与正文共同计入学习进度 */
  videoUrl?: string | null
}

export interface PartnerItem {
  id: string
  title: string
  deliverables: string[]
}

export type ImpactProgramTagTone = 'sky' | 'sage' | 'amber' | 'lavender' | 'mint' | 'rose'

/** 公益页「项目卡片」展示数据（与地图节点生成解耦） */
export interface ImpactProgramCard {
  id: string
  title: string
  summary: string
  /** 卡片顶部配图 */
  image: string
  tags: { text: string; tone: ImpactProgramTagTone }[]
  cta: { label: string; href: string }
}

export interface ScienceProject {
  id: string
  slug: string
  title: string
  topic: 'birds' | 'insects' | 'plants' | 'mammals'
  summary: string
  /** 列表卡片顶部配图 */
  image: string
  tags: { text: string; tone: ImpactProgramTagTone }[]
  cta: { label: string; href: string }
  studyArea?: string
  partnerOrgs?: string[]
  methods?: string[]
  dataMetrics?: { label: string; value: string }[]
  participationLevel?: 'beginner' | 'trained' | 'advanced'
  reportUrl?: string
}
