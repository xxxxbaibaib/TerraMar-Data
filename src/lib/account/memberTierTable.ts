/** 个人会员累计积分 → Lv1–Lv10（演示规则，与 PRD 对齐） */

export type MemberLevelRow = {
  level: number
  name: string
  imagery: string
  /** 达到该等级称号所需的累计积分下限 */
  minTotalPoints: number
}

/** 各档「累计分」下限即 PRD 表格第四列（Lv1 从 0 起算） */
export const MEMBER_LEVEL_ROWS: readonly MemberLevelRow[] = [
  { level: 1, name: '种子', imagery: '埋下热爱自然的种子', minTotalPoints: 0 },
  { level: 2, name: '嫩芽', imagery: '破土而出，对世界充满好奇', minTotalPoints: 50 },
  { level: 3, name: '露珠', imagery: '初涉自然，纯净清澈', minTotalPoints: 250 },
  { level: 4, name: '溪流', imagery: '开始汇聚点滴知识', minTotalPoints: 1250 },
  { level: 5, name: '林木', imagery: '扎根生长，形成认知体系', minTotalPoints: 5000 },
  { level: 6, name: '江河', imagery: '知识汇成河流，影响渐广', minTotalPoints: 10000 },
  { level: 7, name: '山川', imagery: '坚毅守护，成为生态屏障', minTotalPoints: 20000 },
  { level: 8, name: '湖泊', imagery: '沉稳积淀，滋养社群', minTotalPoints: 40000 },
  { level: 9, name: '海洋', imagery: '包容万物，智慧深远', minTotalPoints: 60000 },
  { level: 10, name: '星辰', imagery: '指引他人，照亮自然教育之路', minTotalPoints: 100000 },
] as const

/** 占位数组：LEVEL_MIN_TOTAL_POINTS[L] = MEMBER_LEVEL_ROWS[L - 1].minTotalPoints，便于按等级号索引 */
export const LEVEL_MIN_TOTAL_POINTS = [
  0,
  ...MEMBER_LEVEL_ROWS.map((r) => r.minTotalPoints),
] as const

export const MEMBER_MAX_LEVEL_TOTAL_POINTS = MEMBER_LEVEL_ROWS[9].minTotalPoints

export function memberLevelFromTotalPoints(totalPoints: number): number {
  const p = Math.max(0, Math.floor(totalPoints))
  for (let L = 10; L >= 1; L--) {
    if (p >= MEMBER_LEVEL_ROWS[L - 1].minTotalPoints) return L
  }
  return 1
}

/** 升到下一等级所需的累计积分；已满级返回 null */
export function memberNextLevelTotalPointsThreshold(currentLevel: number): number | null {
  if (currentLevel >= 10) return null
  return MEMBER_LEVEL_ROWS[currentLevel].minTotalPoints
}

/** 当前等级在积分轴上的起点（含本级） */
export function memberLevelStartTotalPoints(level: number): number {
  const L = Math.min(10, Math.max(1, Math.floor(level)))
  return MEMBER_LEVEL_ROWS[L - 1].minTotalPoints
}

/** 向下一级推进的完成度 0–100；已满级为 100 */
export function memberProgressPercentTowardNextLevel(totalPoints: number, currentLevel: number): number {
  if (currentLevel >= 10) return 100
  const start = memberLevelStartTotalPoints(currentLevel)
  const next = memberNextLevelTotalPointsThreshold(currentLevel)
  if (next == null) return 100
  const span = next - start
  if (span <= 0) return 100
  const p = Math.max(0, Math.floor(totalPoints))
  const pct = ((p - start) / span) * 100
  return Math.max(0, Math.min(100, pct))
}

export function memberRowForLevel(level: number): MemberLevelRow {
  const safe = Math.min(10, Math.max(1, Math.floor(level)))
  return MEMBER_LEVEL_ROWS[safe - 1] ?? MEMBER_LEVEL_ROWS[0]
}

/** 积分获取规则（演示数值；未单独定价的项已标注占位） */
export const MEMBER_POINTS_RULES = {
  explorationCoursePerSession: 20,
  volunteerHour: 15,
  speciesRecord: 2,
  inviteFriendSuccess: 5,
  /** 参与志愿/公益类登记或演示 +1 次（占位，待运营确认） */
  welfareActivityParticipation: 20,
  /** 单篇资料学完（占位，待运营确认） */
  resourceArticleComplete: 10,
} as const
