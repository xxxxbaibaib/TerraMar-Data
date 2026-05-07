import type { CloudUserRecord } from './types'
import {
  memberLevelFromTotalPoints,
  memberNextLevelTotalPointsThreshold,
  memberProgressPercentTowardNextLevel,
} from '../account/memberTierTable'

/**
 * 个人会员：等级由「累计积分 totalPoints」决定（Lv1–Lv10）；
 * levelPoints 与 totalPoints 同步，便于界面沿用既有字段。
 * 机构账号：不参与积分轨，保留已存 level / levelPoints。
 */
export function computeLevelFromUser(u: CloudUserRecord): { level: number; levelPoints: number } {
  if (u.membershipType === 'organization') {
    return {
      level: Math.min(10, Math.max(1, Math.floor(u.level))),
      levelPoints: Math.max(0, Math.floor(u.levelPoints)),
    }
  }
  const total = Math.max(0, Math.floor(u.totalPoints ?? 0))
  return {
    level: memberLevelFromTotalPoints(total),
    levelPoints: total,
  }
}

export function memberNextLevelPointsThresholdFromUser(u: CloudUserRecord): number | null {
  if (u.membershipType === 'organization') return null
  return memberNextLevelTotalPointsThreshold(u.level)
}

export function memberPointsGapToNextLevel(u: CloudUserRecord): number {
  if (u.membershipType === 'organization') return 0
  const next = memberNextLevelPointsThresholdFromUser(u)
  if (next == null) return 0
  const cur = Math.max(0, Math.floor(u.totalPoints ?? 0))
  return Math.max(0, next - cur)
}

export function memberProgressPercentToNextLevelFromUser(u: CloudUserRecord): number {
  if (u.membershipType === 'organization') return 100
  const total = Math.max(0, Math.floor(u.totalPoints ?? 0))
  return memberProgressPercentTowardNextLevel(total, u.level)
}
