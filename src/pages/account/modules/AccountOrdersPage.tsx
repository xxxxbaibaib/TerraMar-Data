import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { ORDER_STATUS_LABEL, type OrderStatusSlug } from '../../../lib/account/orderStatus'
import { useAuth } from '../../../lib/auth/AuthContext'
import { useProgramOrders } from '../../../hooks/useProgramOrders'

const TABS: { slug: OrderStatusSlug | 'all'; label: string }[] = [
  { slug: 'all', label: '全部' },
  { slug: 'pending_payment', label: '待付款' },
  { slug: 'pending_fulfillment', label: '待发资料' },
  { slug: 'pending_receipt', label: '待开始' },
  { slug: 'to_review', label: '待评价' },
  { slug: 'refund_after_sale', label: '退款/售后' },
]

function matchesSearch(o: { programTitle: string; id: string }, q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return o.programTitle.toLowerCase().includes(s) || o.id.toLowerCase().includes(s)
}

export function AccountOrdersPage() {
  const { user } = useAuth()
  const { orders } = useProgramOrders(user?.id)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams()
  const raw = searchParams.get('status')
  const active: OrderStatusSlug | 'all' =
    raw && (Object.keys(ORDER_STATUS_LABEL) as string[]).includes(raw) ? (raw as OrderStatusSlug) : 'all'

  const filtered = useMemo(() => {
    const byStatus = active === 'all' ? orders : orders.filter((o) => o.status === active)
    return byStatus.filter((o) => matchesSearch(o, searchQuery))
  }, [orders, active, searchQuery])

  return (
    <div>
      <AccountBreadcrumb current="我的订单" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">我的订单（课程）</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        订单来自「科考活动」提交购买（演示，写入本机）；正式环境由山海云订单服务聚合。
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = active === tab.slug
          const href = tab.slug === 'all' ? '/account/orders' : `/account/orders?status=${tab.slug}`
          return (
            <Link
              key={tab.slug}
              to={href}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-[#f8f2e8]'
                  : 'border border-[rgba(47,79,58,0.12)] bg-[#fffaf2] text-[var(--text-primary)] hover:border-[rgba(47,79,58,0.22)]'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <label className="mt-4 block max-w-md">
        <span className="sr-only">搜索订单</span>
        <input
          className="tm-input"
          type="search"
          placeholder="搜索订单号或活动名（演示）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </label>

      <ul className="mt-8 space-y-4">
        {filtered.map((o) => (
          <li key={o.id}>
            <Link
              to={`/account/orders/${o.id}`}
              className="card flex flex-col gap-3 p-4 shadow-[var(--shadow-soft)] transition hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-primary)]">{o.programTitle}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  出行 {o.travelDate} · 订单 …{o.id.slice(-6)} · ¥{o.amountCny}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[rgba(47,79,58,0.1)] px-3 py-1 text-xs font-medium text-[var(--brand-deep)]">
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
                {o.status === 'pending_payment' ? (
                  <span className="text-xs font-medium text-[var(--brand-primary)]">去支付</span>
                ) : null}
                {o.status === 'to_review' ? (
                  <span className="text-xs font-medium text-[var(--brand-primary)]">写评价</span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {orders.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-sm text-[var(--text-secondary)]">
          <p>暂无订单。请在科考活动详情页点击「提交购买下单」创建演示订单。</p>
          <Link className="btn-primary mt-4 inline-flex" to="/programs">
            科考活动
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-sm text-[var(--text-secondary)]">
          <p>没有符合当前筛选或搜索条件的订单。</p>
          <Link className="btn-secondary mt-4 inline-flex text-sm" to="/account/orders">
            清除筛选
          </Link>
        </div>
      ) : null}
    </div>
  )
}
