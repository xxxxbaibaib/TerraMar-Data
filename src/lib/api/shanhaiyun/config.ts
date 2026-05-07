/**
 * 山海云数据平台 — 前端集成开关与 Base URL。
 * 契约见 docs/API_Shanhaiyun_User_Membership_contract_v0.md
 */

export function isShanhaiyunApiEnabled(): boolean {
  return import.meta.env.VITE_SHANHAIYUN_API_ENABLED === 'true'
}

/** 已配置且已启用时返回去尾斜杠的 origin；否则空字符串 */
export function getShanhaiyunApiBaseUrl(): string {
  const raw = import.meta.env.VITE_SHANHAIYUN_API_BASE_URL ?? ''
  return raw.replace(/\/+$/, '')
}
