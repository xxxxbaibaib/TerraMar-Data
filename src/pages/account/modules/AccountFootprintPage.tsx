import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { useAuth } from '../../../lib/auth/AuthContext'
import { filterFootprintByYearMonth } from '../../../lib/account/footprintTimeline'
import { useFootprintTimeline } from '../../../hooks/useFootprintTimeline'

const YEARS = ['all', '2026', '2025', '2024'] as const

export function AccountFootprintPage() {
  const { user } = useAuth()
  const { items } = useFootprintTimeline(user)
  const [year, setYear] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')

  const filtered = useMemo(() => filterFootprintByYearMonth(items, year, month), [items, year, month])

  if (!user) return null

  return (
    <div>
      <AccountBreadcrumb current="我的足迹" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">我的足迹</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        仅汇总与科考活动（下单/报名）、合作共建（咨询/入网登记）、公益行动（志愿登记）、公民科学（登记/物种上传）相关的记录；联系方式需与当前账号登录键（手机/邮箱）匹配。
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <label className="text-xs text-[var(--text-tertiary)]">
          <span className="mb-1 block">年份</span>
          <select
            className="tm-input h-11 min-w-[120px] text-sm"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y === 'all' ? '全部' : `${y}年`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text-tertiary)]">
          <span className="mb-1 block">月份</span>
          <select
            className="tm-input h-11 min-w-[120px] text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="all">
              全年
            </option>
            {Array.from({ length: 12 }, (_, i) => {
              const v = String(i + 1).padStart(2, '0')
              return (
                <option key={v} value={v}>
                  {i + 1} 月
                </option>
              )
            })}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <div className="card mt-10 p-10 text-center text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
          <p>暂无足迹。完成科考活动下单、提交合作/入网登记、公益志愿或公民科学登记，或在地图上传物种记录后，将在此按时间展示。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="btn-primary inline-flex text-sm" to="/programs">
              科考活动
            </Link>
            <Link className="btn-secondary inline-flex text-sm" to="/cooperation">
              合作共建
            </Link>
            <Link className="btn-secondary inline-flex text-sm" to="/impact">
              公益行动
            </Link>
            <Link className="btn-secondary inline-flex text-sm" to="/science">
              公民科学
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--text-secondary)]">当前筛选条件下没有记录，请调整年份或月份。</p>
      ) : (
        <ol className="relative mt-10 border-l border-[rgba(47,79,58,0.15)] pl-6">
          {filtered.map((it) => (
            <li key={it.id} className="mb-8 last:mb-0">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-[var(--brand-primary)] bg-[var(--bg-surface)]" />
              <p className="text-xs text-[var(--text-tertiary)]">
                {it.date} · {it.kind}
              </p>
              <Link
                to={it.href}
                className="mt-1 block text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline"
              >
                {it.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
