import { notifyFootprintSourcesChanged } from './footprintSourcesEvent'
import type { MockCourseOrder } from '../../mock/accountOrders'
import type { OrderStatusSlug } from './orderStatus'
import type { Program } from '../../mock/types'
import * as programOrdersRemote from './programOrdersRemote'
import { isMockAuthMode } from '../supabase/env'

export const PROGRAM_ORDERS_EVENT = 'terramar-program-orders'

function storageKey(userId: string) {
  return `terramar_program_orders_${userId}`
}

/** localStorage 分桶读取（仅 mock 模式或遗留读路径） */
export function readProgramOrdersFromLocal(userId: string): MockCourseOrder[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const list = JSON.parse(raw) as MockCourseOrder[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeProgramOrdersLocal(userId: string, orders: MockCourseOrder[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(orders))
  window.dispatchEvent(new Event(PROGRAM_ORDERS_EVENT))
  notifyFootprintSourcesChanged()
}

export async function loadProgramOrders(userId: string): Promise<MockCourseOrder[]> {
  if (isMockAuthMode()) return readProgramOrdersFromLocal(userId)
  return programOrdersRemote.fetchOrdersForUser(userId)
}

export async function hasPendingPaymentForSlugAsync(userId: string, slug: string): Promise<boolean> {
  if (isMockAuthMode()) {
    return readProgramOrdersFromLocal(userId).some((o) => o.programSlug === slug && o.status === 'pending_payment')
  }
  return programOrdersRemote.hasPendingPaymentForSlugRemote(userId, slug)
}

export async function createProgramOrderAsync(userId: string, program: Program): Promise<MockCourseOrder> {
  if (isMockAuthMode()) {
    if (await hasPendingPaymentForSlugAsync(userId, program.slug)) {
      throw new Error('PENDING_PAYMENT_EXISTS')
    }
    const orders = readProgramOrdersFromLocal(userId)
    const amountCny = Math.round(program.priceFrom ?? program.priceTo ?? 0)
    const order: MockCourseOrder = {
      id: `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      programTitle: program.title,
      programSlug: program.slug,
      travelDate: program.startDate,
      amountCny: Number.isFinite(amountCny) ? amountCny : 0,
      status: 'pending_payment',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    writeProgramOrdersLocal(userId, [order, ...orders])
    return order
  }
  return programOrdersRemote.createOrderRemote(userId, program)
}

export type ProgramOrderPayStartResult = { kind: 'redirect' } | { kind: 'mock_completed' }

/** 待付款订单跳转 z-pay；mock 模式仍为本地演示到账 */
export async function startProgramOrderPayAsync(
  userId: string,
  orderId: string,
  payType?: string,
): Promise<ProgramOrderPayStartResult> {
  if (isMockAuthMode()) {
    await updateProgramOrderStatusAsync(userId, orderId, 'pending_fulfillment')
    return { kind: 'mock_completed' }
  }
  const payUrl = await programOrdersRemote.createPaySessionRemote(orderId, payType)
  window.location.href = payUrl
  return { kind: 'redirect' }
}

export async function updateProgramOrderStatusAsync(
  userId: string,
  orderId: string,
  status: OrderStatusSlug,
): Promise<void> {
  if (isMockAuthMode()) {
    const orders = readProgramOrdersFromLocal(userId)
    const idx = orders.findIndex((o) => o.id === orderId)
    if (idx === -1) return
    const next = [...orders]
    next[idx] = { ...next[idx], status }
    writeProgramOrdersLocal(userId, next)
    return
  }
  await programOrdersRemote.updateOrderStatusRemote(userId, orderId, status)
}

/** 是否已为该科考活动下单（任意状态） */
export async function hasOrderForProgramSlugAsync(userId: string, slug: string): Promise<boolean> {
  const orders = await loadProgramOrders(userId)
  return orders.some((o) => o.programSlug === slug)
}
