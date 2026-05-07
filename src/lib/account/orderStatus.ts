/** 课程订单五态（与 PRD_Account_Personal_Center_v1 一致） */
export const ORDER_STATUS_SLUGS = [
  'pending_payment',
  'pending_fulfillment',
  'pending_receipt',
  'to_review',
  'refund_after_sale',
] as const

export type OrderStatusSlug = (typeof ORDER_STATUS_SLUGS)[number]

export const ORDER_STATUS_LABEL: Record<OrderStatusSlug, string> = {
  pending_payment: '待付款',
  pending_fulfillment: '待发资料',
  pending_receipt: '待开始',
  to_review: '待评价',
  refund_after_sale: '退款/售后',
}

export const ORDER_QUICK_TILES: {
  status: OrderStatusSlug
  label: string
  hint: string
  icon: string
}[] = [
  { status: 'pending_payment', label: '待付款', hint: '报名待支付', icon: '付' },
  { status: 'pending_fulfillment', label: '待发资料', hint: '已付待发', icon: '资' },
  { status: 'pending_receipt', label: '待开始', hint: '签到/开营', icon: '营' },
  { status: 'to_review', label: '待评价', hint: '结营反馈', icon: '评' },
  { status: 'refund_after_sale', label: '退款/售后', hint: '退改申请', icon: '退' },
]
