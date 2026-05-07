import type { MockCourseOrder } from '../../mock/accountOrders'
import type { Program } from '../../mock/types'
import { getSupabaseClient } from '../supabase/client'
import type { OrderStatusSlug } from './orderStatus'

type OrderRow = {
  id: string
  program_slug: string
  program_title: string
  travel_date: string
  amount_cny: number
  status: OrderStatusSlug
  created_at: string
}

function mapRowToOrder(row: OrderRow): MockCourseOrder {
  const created = row.created_at
  const day = created.slice(0, 10)
  return {
    id: row.id,
    programSlug: row.program_slug,
    programTitle: row.program_title,
    travelDate: row.travel_date,
    amountCny: row.amount_cny,
    status: row.status,
    createdAt: day,
  }
}

export async function fetchOrdersForUser(userId: string): Promise<MockCourseOrder[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, program_slug, program_title, travel_date, amount_cny, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRowToOrder(row as OrderRow))
}

export async function hasPendingPaymentForSlugRemote(userId: string, slug: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('program_slug', slug)
    .eq('status', 'pending_payment')
    .limit(1)

  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

export async function createOrderRemote(userId: string, program: Program): Promise<MockCourseOrder> {
  if (await hasPendingPaymentForSlugRemote(userId, program.slug)) {
    throw new Error('PENDING_PAYMENT_EXISTS')
  }

  const amountCny = Math.round(program.priceFrom ?? program.priceTo ?? 0)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      program_slug: program.slug,
      program_title: program.title,
      travel_date: program.startDate,
      amount_cny: Number.isFinite(amountCny) ? amountCny : 0,
      status: 'pending_payment',
    })
    .select('id, program_slug, program_title, travel_date, amount_cny, status, created_at')
    .single()

  if (error) throw new Error(error.message)
  return mapRowToOrder(data as OrderRow)
}

/** Edge Function：按库内金额生成 z-pay 跳转 URL（需已登录） */
export async function createPaySessionRemote(orderId: string, payType?: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('create-pay-session', {
    body: { orderId, payType },
  })
  if (error) throw new Error(error.message)
  const errMsg = (data as { error?: string } | null)?.error
  if (errMsg) throw new Error(errMsg)
  const payUrl = (data as { payUrl?: string } | null)?.payUrl
  if (!payUrl) throw new Error('支付地址缺失')
  return payUrl
}

export async function updateOrderStatusRemote(
  userId: string,
  orderId: string,
  status: OrderStatusSlug,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}
