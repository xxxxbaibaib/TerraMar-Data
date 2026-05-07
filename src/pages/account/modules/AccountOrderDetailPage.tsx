import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { ORDER_STATUS_LABEL } from '../../../lib/account/orderStatus'
import { startProgramOrderPayAsync } from '../../../lib/account/programOrdersStore'
import { useAuth } from '../../../lib/auth/AuthContext'
import { useProgramOrders } from '../../../hooks/useProgramOrders'

export function AccountOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { user } = useAuth()
  const { orders, reload } = useProgramOrders(user?.id)
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const order = user && orderId ? orders.find((o) => o.id === orderId) : undefined

  if (!order || !user) {
    return (
      <div>
        <AccountBreadcrumb current="订单详情" />
        <p className="text-[var(--text-secondary)]">未找到该订单。</p>
        <Link to="/account/orders" className="mt-4 inline-block text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
          返回订单列表
        </Link>
      </div>
    )
  }

  return (
    <div>
      <nav className="mb-6 text-sm text-[var(--text-secondary)]">
        <Link to="/account" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
          仪表板
        </Link>
        <span className="mx-2">/</span>
        <Link to="/account/orders" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
          我的订单
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-primary)]">订单详情</span>
      </nav>
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">{order.programTitle}</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        订单号 {order.id} · {ORDER_STATUS_LABEL[order.status]}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">活动与行程</h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            集合地点、行前说明与课表在正式环境由订单详情接口返回；此处为占位文案。
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
            <li>出行日期：{order.travelDate}</li>
            <li>服务承诺：安全预案、师生比、保险说明（运营配置）</li>
          </ul>
        </section>
        <section className="card space-y-4 p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">费用明细</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">原价</dt>
              <dd>¥{Math.max(order.amountCny, 299)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">优惠</dt>
              <dd>-¥{Math.max(0, Math.max(order.amountCny, 299) - order.amountCny)}</dd>
            </div>
            <div className="flex justify-between border-t border-[rgba(47,79,58,0.08)] pt-2 font-medium">
              <dt>实付</dt>
              <dd>¥{order.amountCny}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">状态时间轴（演示）</h2>
        <ol className="mt-4 space-y-3 border-l-2 border-[rgba(47,79,58,0.15)] pl-4 text-sm">
          <li>
            <span className="font-medium text-[var(--text-primary)]">下单</span> · {order.createdAt}
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">支付 / 资料</span> · 视状态而定
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">出行与评价</span> · 待后端回写
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={`/programs/${order.programSlug}`} className="btn-secondary inline-flex text-sm">
            查看活动页
          </Link>
          {order.status === 'pending_payment' ? (
            <>
              <button
                type="button"
                className="btn-primary inline-flex text-sm disabled:opacity-60"
                disabled={payBusy}
                onClick={() => {
                  setPayError(null)
                  void (async () => {
                    setPayBusy(true)
                    try {
                      const r = await startProgramOrderPayAsync(user.id, order.id)
                      if (r.kind === 'mock_completed') await reload()
                    } catch (e) {
                      setPayError(e instanceof Error ? e.message : '无法发起支付')
                      setPayBusy(false)
                    }
                  })()
                }}
              >
                {payBusy ? '正在跳转…' : '去支付'}
              </button>
              {payError ? <p className="mt-2 w-full text-sm text-red-700">{payError}</p> : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
