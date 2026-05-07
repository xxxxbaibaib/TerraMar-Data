import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildSubmitPayUrl, formatMoneyCny } from '../_shared/zpay.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { orderId?: string; payType?: string }
  try {
    body = (await req.json()) as { orderId?: string; payType?: string }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const orderId = body.orderId?.trim()
  if (!orderId) {
    return new Response(JSON.stringify({ error: 'orderId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payType = (body.payType?.trim() || 'alipay').slice(0, 32)

  const pid = Deno.env.get('ZPAY_PID') ?? ''
  const key = Deno.env.get('ZPAY_KEY') ?? ''
  const sitePublic = (Deno.env.get('PUBLIC_SITE_URL') ?? '').replace(/\/$/, '')
  const sitename = Deno.env.get('ZPAY_SITENAME') ?? 'TerraMar'

  if (!pid || !key || !sitePublic) {
    console.error('create-pay-session: missing ZPAY_PID, ZPAY_KEY, or PUBLIC_SITE_URL')
    return new Response(JSON.stringify({ error: 'Payment is not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const notifyUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/pay-notify`
  const returnUrl = `${sitePublic}/account/orders/${orderId}`

  const { data: row, error: selErr } = await supabaseUser
    .from('orders')
    .select('id, user_id, program_title, amount_cny, status')
    .eq('id', orderId)
    .maybeSingle()

  if (selErr) {
    console.error(selErr)
    return new Response(JSON.stringify({ error: 'Order lookup failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!row || row.user_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (row.status !== 'pending_payment') {
    return new Response(JSON.stringify({ error: 'Order is not awaiting payment' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const money = formatMoneyCny(row.amount_cny as number)
  const name = String(row.program_title ?? '订单')

  const payUrl = buildSubmitPayUrl(
    {
      money,
      name,
      notify_url: notifyUrl,
      out_trade_no: row.id as string,
      pid,
      return_url: returnUrl,
      sitename,
      type: payType,
    },
    key,
  )

  return new Response(JSON.stringify({ payUrl }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
