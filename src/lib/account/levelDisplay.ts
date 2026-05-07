import { memberRowForLevel } from './memberTierTable'

/** 会员等级中文名（Lv1–Lv10 · 自然意象） */
export function levelTierLabel(level: number): string {
  return memberRowForLevel(level).name
}

export function levelTierImagery(level: number): string {
  return memberRowForLevel(level).imagery
}
