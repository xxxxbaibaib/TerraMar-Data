import { isShanhaiyunApiEnabled } from './config'

export function useLocalLeadPersistenceFallback(): boolean {
  return !isShanhaiyunApiEnabled()
}

/** 开发态提示：开关已开但业务模块尚未改走云端写时便于排查 */
export function logPendingShanhaiyunIntegration(module: string): void {
  if (!import.meta.env.DEV) return
  if (!isShanhaiyunApiEnabled()) return
  // eslint-disable-next-line no-console
  console.info(`[shanhaiyun:${module}] API 已启用，P1 前仍使用浏览器演示存储`)
}
