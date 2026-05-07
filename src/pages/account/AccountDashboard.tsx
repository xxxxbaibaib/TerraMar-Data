import { Link } from 'react-router-dom'
import { AccountOrderQuickTiles } from '../../components/account/AccountOrderQuickTiles'
import { useAuth } from '../../lib/auth/AuthContext'
import { levelTierImagery, levelTierLabel } from '../../lib/account/levelDisplay'
import { ORDER_STATUS_LABEL } from '../../lib/account/orderStatus'
import {
  memberNextLevelPointsThresholdFromUser,
  memberPointsGapToNextLevel,
  memberProgressPercentToNextLevelFromUser,
} from '../../lib/auth/levelPolicy'
import { primaryRoleLabel } from '../../lib/auth/types'
import { useProgramOrders } from '../../hooks/useProgramOrders'
import { orderStatusCounts } from '../../mock/accountOrders'

export function AccountDashboard() {
  const { user } = useAuth()
  const { orders: programOrders } = useProgramOrders(user?.id)

  if (!user) return null

  const isOrg = user.membershipType === 'organization'
  const counts = orderStatusCounts(programOrders)
  const recent = [...programOrders].slice(0, 3)

  const nextAt = !isOrg ? memberNextLevelPointsThresholdFromUser(user) : null
  const gap = !isOrg ? memberPointsGapToNextLevel(user) : 0
  const fmtGap = String(Math.max(0, gap))
  const nextProgressPct = !isOrg ? memberProgressPercentToNextLevelFromUser(user) : 100

  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-deep)]/75">Dashboard · 仪表板</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">欢迎回来，{user.displayName}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isOrg
            ? '机构账号 · 单档 ORG_MEMBER（演示）'
            : `主身份：${primaryRoleLabel(user.primaryRole)} · 会员 ${levelTierLabel(user.level)}（Lv${user.level}）`}
        </p>
      </header>

      {/* 等级与权益 */}
      {!isOrg && (
        <section className="card p-5 shadow-[var(--shadow-soft)] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">等级与权益</p>
              <p className="mt-2 font-serif text-xl font-semibold text-[var(--brand-deep)]">
                {levelTierLabel(user.level)} <span className="text-base font-normal text-[var(--text-secondary)]">Lv{user.level}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                累计积分 <strong className="text-[var(--text-primary)]">{user.totalPoints}</strong>
                <span className="text-[var(--text-tertiary)]"> · </span>
                {levelTierImagery(user.level)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                科考活动 {user.coursesCompletedCount} 门 · 资源中心完成计数 {user.resourceCoursesCompletedCount} · 资料页学完另计积分
              </p>
              <ul className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-[rgba(47,79,58,0.08)] bg-[rgba(255,251,245,0.65)] p-3 text-sm text-[var(--text-secondary)] sm:grid-cols-3 sm:gap-3 sm:p-4">
                <li>
                  参加活动 <strong className="text-[var(--text-primary)]">{user.activitiesParticipatedCount}</strong> 次
                </li>
                <li>
                  志愿时长 <strong className="text-[var(--text-primary)]">{user.volunteerHoursTotal.toFixed(1)}</strong> 小时
                </li>
                <li>
                  物种记录 <strong className="text-[var(--text-primary)]">{user.speciesRecordsSubmittedCount}</strong> 条
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-[rgba(47,79,58,0.1)] bg-[rgba(255,251,245,0.8)] px-4 py-3 text-sm text-[var(--text-secondary)] md:max-w-sm">
              <p title="权益由运营配置，此处为占位">
                权益速览：优先报名、工作坊体验券等（悬停/详情见任务中心与正式环境配置）。
              </p>
            </div>
          </div>
          {user.level < 10 && nextAt != null ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>
                  下一档（Lv{user.level + 1}）还需约 {fmtGap} 积分（目标累计 {nextAt}）
                </span>
                <span>{Math.round(nextProgressPct)}%</span>
              </div>
              <div
                className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]"
                role="progressbar"
                aria-valuenow={Math.round(nextProgressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500 ease-out"
                  style={{ width: `${nextProgressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">已达会员 Lv10「星辰」。</p>
          )}
          <Link
            to="/account/tasks"
            className="btn-primary mt-5 inline-flex w-full justify-center sm:w-auto"
          >
            查看全部任务
          </Link>
        </section>
      )}

      {/* 订单快报 */}
      <section className="card p-5 shadow-[var(--shadow-soft)] md:p-6" aria-labelledby="dash-orders-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="dash-orders-heading" className="text-lg font-semibold text-[var(--brand-deep)]">
            订单快报
          </h2>
          <Link to="/account/orders" className="text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
            查看全部订单
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {(['all', 'pending_payment', 'pending_fulfillment', 'pending_receipt', 'to_review', 'refund_after_sale'] as const).map(
            (key) => (
              <Link
                key={key}
                to={key === 'all' ? '/account/orders' : `/account/orders?status=${key}`}
                className="rounded-xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] px-3 py-3 text-center transition hover:border-[rgba(47,79,58,0.2)]"
              >
                <p className="text-2xl font-semibold text-[var(--brand-deep)]">{counts[key]}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  {key === 'all' ? '全部' : ORDER_STATUS_LABEL[key]}
                </p>
              </Link>
            ),
          )}
        </div>
        <div className="mt-6">
          <p className="text-xs font-medium text-[var(--text-secondary)]">最近订单</p>
          <ul className="mt-2 divide-y divide-[rgba(47,79,58,0.08)] rounded-xl border border-[rgba(47,79,58,0.08)] bg-[rgba(255,251,245,0.6)]">
            {recent.map((o) => (
              <li key={o.id}>
                <Link to={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-[rgba(47,79,58,0.04)]">
                  <span className="font-medium text-[var(--text-primary)]">{o.programTitle}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {o.travelDate} · ¥{o.amountCny} · {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          <AccountOrderQuickTiles />
          <p className="mt-2 text-center text-[11px] text-[var(--text-tertiary)]">状态口径见 docs/PRD_Account_Personal_Center_v1.md</p>
        </div>
      </section>

      {/* 推荐任务 */}
      {!isOrg && (
        <section className="card p-5 shadow-[var(--shadow-soft)] md:p-6">
          <h2 className="text-lg font-semibold text-[var(--brand-deep)]">下一步挑战</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex flex-col gap-2 rounded-xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">完成一节自然课程</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">奖励经验 · 游客轨（科考活动 + 资源中心课程合计）</p>
                <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]">
                  <div className="h-full w-2/5 rounded-full bg-[var(--brand-primary)]" />
                </div>
              </div>
              <Link to="/programs" className="btn-secondary inline-flex justify-center text-sm">
                去完成
              </Link>
            </li>
            <li className="flex flex-col gap-2 rounded-xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">上传物种观察记录</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">公民科学轨 · 与地图演示联动</p>
                <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]">
                  <div className="h-full w-1/3 rounded-full bg-[var(--brand-primary)]" />
                </div>
              </div>
              <Link to="/science" className="btn-secondary inline-flex justify-center text-sm">
                去完成
              </Link>
            </li>
          </ul>
        </section>
      )}

      {/* 快捷入口 */}
      <section className="card p-5 shadow-[var(--shadow-soft)] md:p-6">
        <h2 className="text-lg font-semibold text-[var(--brand-deep)]">快捷入口</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            to="/account/courses"
            className="rounded-2xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 transition hover:border-[rgba(47,79,58,0.2)]"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">我的课程</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">在学 · 演示</p>
          </Link>
          <Link
            to="/account/footprint"
            className="rounded-2xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 transition hover:border-[rgba(47,79,58,0.2)]"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">我的足迹</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">最近活动占位</p>
          </Link>
          <Link
            to="/account/addresses"
            className="rounded-2xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 transition hover:border-[rgba(47,79,58,0.2)]"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">地址簿</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">默认地址 · 演示</p>
          </Link>
          <Link
            to="/account/wishlist"
            className="rounded-2xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 transition hover:border-[rgba(47,79,58,0.2)]"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">我的收藏</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">3 项（演示）</p>
          </Link>
          <Link
            to="/account/support"
            className="rounded-2xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 transition hover:border-[rgba(47,79,58,0.2)]"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">客服帮助</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">工单与 FAQ</p>
          </Link>
          {isOrg ? (
            <div className="rounded-2xl border border-dashed border-[rgba(47,79,58,0.2)] bg-[rgba(255,251,245,0.5)] p-4">
              <p className="text-sm font-semibold text-[var(--brand-deep)]">机构仪表板</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">正式环境对接机构后台</p>
            </div>
          ) : null}
        </div>
      </section>

      <p className="text-sm text-[var(--text-secondary)]">
        <Link className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline" to="/science">
          科研与地图
        </Link>
        {' · '}
        <Link className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline" to="/join-network/personal">
          加入网络
        </Link>
      </p>
    </div>
  )
}
