import md5 from 'npm:md5@2.3.0'

/** 订单金额（元，整数）→ 易支付 money 字符串，如 299 → "299.00" */
export function formatMoneyCny(amountCny: number): string {
  const n = Math.round(Number(amountCny))
  if (!Number.isFinite(n) || n < 0) return '0.00'
  return `${n}.00`
}

/**
 * 与 skill/python/pay.txt 第 17 行一致：固定键顺序，原始值拼接，末尾拼接商户 key 后 MD5。
 * 注意：参与签名的为解码后的明文，与最终 URL 的 encode 无关。
 */
export function buildCreatePaySignString(params: {
  money: string
  name: string
  notify_url: string
  out_trade_no: string
  pid: string
  return_url: string
  sitename: string
  type: string
}): string {
  const { money, name, notify_url, out_trade_no, pid, return_url, sitename, type } = params
  return (
    `money=${money}&name=${name}&notify_url=${notify_url}&out_trade_no=${out_trade_no}` +
    `&pid=${pid}&return_url=${return_url}&sitename=${sitename}&type=${type}`
  )
}

export function md5SignCreatePay(signString: string, merchantKey: string): string {
  return md5(signString + merchantKey)
}

/** z-pay.cn GET 跳转收银台 */
export function buildSubmitPayUrl(
  params: {
    money: string
    name: string
    notify_url: string
    out_trade_no: string
    pid: string
    return_url: string
    sitename: string
    type: string
  },
  merchantKey: string,
): string {
  const signString = buildCreatePaySignString(params)
  const sign = md5SignCreatePay(signString, merchantKey)
  const q = new URLSearchParams({
    money: params.money,
    name: params.name,
    notify_url: params.notify_url,
    out_trade_no: params.out_trade_no,
    pid: params.pid,
    return_url: params.return_url,
    sitename: params.sitename,
    type: params.type,
    sign,
    sign_type: 'MD5',
  })
  return `https://z-pay.cn/submit.php?${q.toString()}`
}

/**
 * 异步通知验签：常见易支付实现为 ASCII 键排序，排除 sign、sign_type 与空值，
 * 拼接 k=v&... 后直连商户 key，再 MD5 小写比对（与发起支付的固定序签不同）。
 */
export function verifyNotifySign(raw: Record<string, string>, merchantKey: string): boolean {
  const sign = (raw.sign ?? '').toLowerCase()
  if (!sign) return false
  const keys = Object.keys(raw).filter(
    (k) => k !== 'sign' && k !== 'sign_type' && raw[k] !== undefined && raw[k] !== '',
  )
  keys.sort((a, b) => a.localeCompare(b))
  const signStr = keys.map((k) => `${k}=${raw[k]}`).join('&') + merchantKey
  return md5(signStr).toLowerCase() === sign
}

export function parseMoneyEqualsAmount(moneyStr: string, amountCny: number): boolean {
  const m = Number.parseFloat(String(moneyStr).trim())
  if (!Number.isFinite(m)) return false
  const expected = Math.round(Number(amountCny))
  return Math.abs(m - expected) < 0.001
}
