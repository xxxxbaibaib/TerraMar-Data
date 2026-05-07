import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseMoneyEqualsAmount, verifyNotifySign } from '../_shared/zpay.ts'

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function readBodyParams(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const ct = req.headers.get('content-type') ?? ''

  if (ct.includes('application/x-www-form-urlencoded') || req.method === 'POST') {
    try {
      const raw = await req.text()
      if (raw) {
        const sp = new URLSearchParams(raw)
        for (const [k, v] of sp.entries()) {
          out[k] = v
        }
      }
    } catch {
      // ignore
    }
  }

  const url = new URL(req.url)
  for (const [k, v] of url.searchParams.entries()) {
    if (out[k] === undefined) out[k] = v
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return textResponse('fail', 405)
  }

  const key = Deno.env.get('ZPAY_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  if (!key || !serviceKey || !supabaseUrl) {
    console.error('pay-notify: missing env')
    return textResponse('fail', 503)
  }

  const params = await readBodyParams(req)

  if (!verifyNotifySign(params, key)) {
    return textResponse('fail', 200)
  }

  if ((params.trade_status ?? '').toUpperCase() !== 'TRADE_SUCCESS') {
    return textResponse('fail', 200)
  }

  const outTradeNo = params.out_trade_no?.trim()
  const money = params.money
  const tradeNo = params.trade_no?.trim() ?? ''

  if (!outTradeNo || money === undefined) {
    return textResponse('fail', 200)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: row, error: selErr } = await admin
    .from('orders')
    .select('id, amount_cny, status')
    .eq('id', outTradeNo)
    .maybeSingle()

  if (selErr || !row) {
    console.error(selErr)
    return textResponse('fail', 200)
  }

  if (!parseMoneyEqualsAmount(money, row.amount_cny as number)) {
    return textResponse('fail', 200)
  }

  if (row.status === 'pending_fulfillment') {
    return textResponse('success', 200)
  }

  if (row.status !== 'pending_payment') {
    return textResponse('fail', 200)
  }

  const patch: Record<string, unknown> = {
    status: 'pending_fulfillment',
    payment_notified_at: new Date().toISOString(),
  }
  if (tradeNo) patch.zpay_trade_no = tradeNo

  const { error: upErr } = await admin.from('orders').update(patch).eq('id', outTradeNo).eq('status', 'pending_payment')

  if (upErr) {
    console.error(upErr)
    return textResponse('fail', 200)
  }

  return textResponse('success', 200)
})
