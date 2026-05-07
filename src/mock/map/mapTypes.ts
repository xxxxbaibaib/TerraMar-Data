export type MapPageType = 'programs' | 'cooperation' | 'impact' | 'science'

/** 合作共建地图：合作主体（一级） */
export type CooperationSubject = '政府' | '社会机构' | 'NGO'

/** 合作共建地图节点扩展字段（筛选：合作主体 → 主体类型 → 资源类型） */
export type CooperationNodeMeta = {
  /** 机构/项目展示名（抽屉「机构名称」） */
  partnerName: string
  cooperationSubject: CooperationSubject
  /** 二级主体类型，须与 cooperationSubject 对应枚举一致 */
  subjectSubtype: string
  /** 合作方向，与「资源类型」筛选项一一对应，可多选 */
  resourceTypes: string[]
}

export type GeoPoint = {
  id: string
  lng: number
  lat: number
  city?: string
  province?: string
}

export type MapNodeType =
  | 'activity_site'
  | 'source_city'
  | 'institution'
  | 'habitat'
  | 'community'
  | 'school'
  | 'species_record'

export type MapNode = {
  id: string
  page: MapPageType
  nodeType: MapNodeType
  name: string
  location: GeoPoint
  tags: string[]
  metrics?: { label: string; value: string | number }[]
  status?: 'planning' | 'active' | 'completed' | 'pending_review' | 'verified' | 'rejected'
  /** 仅 `page === 'cooperation'` 时使用，驱动三维筛选与抽屉 */
  cooperationMeta?: CooperationNodeMeta
}

export type MapEdge = {
  id: string
  page: MapPageType
  fromNodeId: string
  toNodeId: string
  relationType: 'participation_flow' | 'co_build' | 'service_coverage' | 'observation_route'
  strength?: number
  label?: string
}

export type MapMetric = {
  page: MapPageType
  key: string
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'flat'
}

export type SpeciesObservation = {
  id: string
  speciesNameCn: string
  speciesNameEn?: string
  topic: 'birds' | 'insects' | 'plants' | 'mammals'
  imageUrl?: string
  observedAt: string
  location: GeoPoint
  /** 山海云用户 id（演示 localStorage；正式环境由服务端写入） */
  observerUserId?: string
  observerType: 'family' | 'volunteer' | 'student' | 'research_partner'
  verificationStatus: 'pending_review' | 'verified' | 'rejected'
  sourceProjectSlug?: string
}

/** 筛选项：字符串表示 value 与展示文案相同；对象表示英文 value + 中文等展示文案 */
export type MapFilterOption = string | { value: string; label: string }

export type MapFilterConfig = {
  key: string
  label: string
  options: MapFilterOption[]
}

export function mapFilterOptionValue(option: MapFilterOption): string {
  return typeof option === 'string' ? option : option.value
}

export function mapFilterOptionLabel(option: MapFilterOption): string {
  return typeof option === 'string' ? option : option.label
}
