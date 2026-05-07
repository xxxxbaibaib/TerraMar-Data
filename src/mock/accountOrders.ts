import type { OrderStatusSlug } from '../lib/account/orderStatus'

/** 科考活动课程订单（与 programOrdersStore 持久化结构一致） */
export type MockCourseOrder = {
  id: string
  programTitle: string
  programSlug: string
  travelDate: string
  amountCny: number
  status: OrderStatusSlug
  createdAt: string
}

export function orderStatusCounts(orders: MockCourseOrder[]): Record<OrderStatusSlug | 'all', number> {
  const base: Record<OrderStatusSlug, number> = {
    pending_payment: 0,
    pending_fulfillment: 0,
    pending_receipt: 0,
    to_review: 0,
    refund_after_sale: 0,
  }
  for (const o of orders) {
    base[o.status] += 1
  }
  return { all: orders.length, ...base }
}
