import { useState } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'

const FAQ = [
  { q: '如何退改课程订单？', a: '请在订单详情发起售后或联系客服；正式规则以用户协议为准。' },
  { q: '演示数据会丢失吗？', a: '会。清除站点数据或更换浏览器后，本机演示账号与订单将重置。' },
]

export function AccountSupportPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div>
      <AccountBreadcrumb current="客服帮助" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">客服与帮助</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">常见问题、联络方式与工单（演示）。</p>

      <section className="card mt-8 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">常见问题</h2>
        <ul className="mt-4 divide-y divide-[rgba(47,79,58,0.08)] rounded-xl border border-[rgba(47,79,58,0.08)]">
          {FAQ.map((item, i) => (
            <li key={item.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]"
                aria-expanded={open === i}
                onClick={() => setOpen((v) => (v === i ? null : i))}
              >
                {item.q}
                <span className="text-[var(--text-tertiary)]">{open === i ? '−' : '+'}</span>
              </button>
              {open === i ? <p className="border-t border-[rgba(47,79,58,0.06)] px-4 py-3 text-sm text-[var(--text-secondary)]">{item.a}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">联系客服</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          建议正式环境配置企业微信 / 工单系统。演示联系邮箱：{' '}
          <a href="mailto:service@terramar.com" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
            service@terramar.com
          </a>
        </p>
        <button type="button" className="btn-secondary mt-4 inline-flex text-sm" onClick={() => alert('演示：客服二维码占位')}>
          唤起客服（演示）
        </button>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">我的工单</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">暂无工单（演示）。</p>
        <button type="button" className="btn-primary mt-4 inline-flex text-sm" onClick={() => alert('演示：新建工单表单占位')}>
          新建工单
        </button>
      </section>
    </div>
  )
}
