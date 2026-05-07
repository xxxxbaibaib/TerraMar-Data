import { getShanhaiyunApiBaseUrl, isShanhaiyunApiEnabled } from './config'

export class ShanhaiyunApiDisabledError extends Error {
  constructor(message = '山海云 API 未启用：请在环境中设置 VITE_SHANHAIYUN_API_ENABLED=true') {
    super(message)
    this.name = 'ShanhaiyunApiDisabledError'
  }
}

export type ShanhaiyunRequestOptions = RequestInit & {
  accessToken?: string
  idempotencyKey?: string
}

/**
 * 对 `{BASE}/v1{path}` 发起 fetch。启用开关且配置 Base URL 后方可调用。
 * 具体业务封装（登录、留资、观测）在 P1 按契约逐步实现。
 */
export async function shanhaiyunRequest<T>(path: string, init: ShanhaiyunRequestOptions = {}): Promise<T> {
  if (!isShanhaiyunApiEnabled()) {
    throw new ShanhaiyunApiDisabledError()
  }
  const base = getShanhaiyunApiBaseUrl()
  if (!base) {
    throw new Error('已启用山海云 API，但未配置 VITE_SHANHAIYUN_API_BASE_URL')
  }

  const url = `${base}/v1${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init.headers)
  if (init.accessToken) {
    headers.set('Authorization', `Bearer ${init.accessToken}`)
  }
  if (init.idempotencyKey) {
    headers.set('Idempotency-Key', init.idempotencyKey)
  }

  const { accessToken: _a, idempotencyKey: _i, ...rest } = init
  const res = await fetch(url, { ...rest, headers })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shanhaiyun API HTTP ${res.status}: ${body.slice(0, 500)}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}
