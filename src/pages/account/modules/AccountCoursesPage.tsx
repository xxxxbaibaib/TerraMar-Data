import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { useAuth } from '../../../lib/auth/AuthContext'
import { useProgramOrders } from '../../../hooks/useProgramOrders'
import { useResourceProgressMap } from '../../../hooks/useResourceProgressMap'
import { combinedResourceProgress } from '../../../lib/resources/resourceProgressStore'
import { programs } from '../../../mock/programs'
import { resources } from '../../../mock/resources'

export function AccountCoursesPage() {
  const { user } = useAuth()
  const { orders } = useProgramOrders(user?.id)
  const { progressBySlug } = useResourceProgressMap(user?.id)

  const purchasedPrograms = useMemo(() => {
    if (!user) return []
    return programs.filter((p) => orders.some((o) => o.programSlug === p.slug))
  }, [orders, user])

  const startedResources = useMemo(() => {
    if (!user) return []
    return resources.filter((r) => {
      const raw = progressBySlug[r.slug] ?? { textPct: 0, videoPct: 0, updatedAt: '' }
      return combinedResourceProgress(Boolean(r.videoUrl), raw) > 0
    })
  }, [progressBySlug, user])

  const emptyAll = purchasedPrograms.length === 0 && startedResources.length === 0

  if (!user) return null

  return (
    <div>
      <AccountBreadcrumb current="我的课程" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">我的课程</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        仅展示已在科考活动下单的课程，以及已在资源中心打开阅读过的条目；未购买或未阅读的内容不会出现在此列表。
      </p>

      {emptyAll ? (
        <div className="card mt-10 p-10 text-center text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
          <p>这里还没有课程记录。</p>
          <p className="mt-2">去「科考活动」下单，或在「资源中心」打开任意文章即可在此看到对应内容。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="btn-primary inline-flex text-sm" to="/programs">
              科考活动
            </Link>
            <Link className="btn-secondary inline-flex text-sm" to="/resources">
              资源中心
            </Link>
          </div>
        </div>
      ) : null}

      {!emptyAll && purchasedPrograms.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">科考活动 · 自然教育课程</h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">以下均为已购买（与「我的订单」一致）。</p>
          <ul className="mt-4 space-y-4">
            {purchasedPrograms.map((p) => {
              const order = orders.find((o) => o.programSlug === p.slug)
              const instructor = p.instructors[0]
              return (
                <li
                  key={p.id}
                  className="card flex flex-col gap-4 p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[rgba(47,79,58,0.1)]">
                    <img src={p.heroImageUrl} alt={`${p.title} 封面`} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)]">{p.title}</p>
                      <span className="rounded-full bg-[rgba(47,79,58,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-deep)]">
                        已购买
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      讲师：{instructor ? `${instructor.name}（${instructor.title}）` : '山海导师团（占位）'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:shrink-0">
                    {order ? (
                      <Link to={`/account/orders/${order.id}`} className="tm-btn tm-btn-secondary inline-flex justify-center text-sm">
                        查看订单
                      </Link>
                    ) : null}
                    <Link to={`/programs/${p.slug}`} className="btn-primary inline-flex min-h-11 justify-center text-sm">
                      查看活动
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : !emptyAll ? (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">科考活动 · 自然教育课程</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">暂无已购买的科考活动课程。</p>
          <Link className="btn-primary mt-4 inline-flex text-sm" to="/programs">
            去逛逛活动
          </Link>
        </section>
      ) : null}

      {!emptyAll && startedResources.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">资源中心 · 在线课程</h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">以下为您已打开阅读过的文章；进度在阅读页实时更新。</p>
          <ul className="mt-4 space-y-4">
            {startedResources.map((r) => {
              const raw = progressBySlug[r.slug] ?? { textPct: 0, videoPct: 0, updatedAt: '' }
              const progress = combinedResourceProgress(Boolean(r.videoUrl), raw)
              const done = progress >= 100
              return (
                <li
                  key={r.id}
                  className="card flex flex-col gap-4 p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center"
                >
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-[rgba(47,79,58,0.1)] text-xs text-[var(--text-tertiary)]">
                    封面
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{r.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      专栏：{r.category} · 自学单元
                      {r.videoUrl ? ' · 含视频' : ''}
                    </p>
                    <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]">
                      <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">进度 {Math.round(progress)}%</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:shrink-0">
                    {done ? (
                      <button type="button" className="tm-btn tm-btn-secondary text-sm" onClick={() => alert('演示：学习证明占位')}>
                        查看证书
                      </button>
                    ) : (
                      <Link to={`/resources/${r.slug}`} className="btn-primary inline-flex min-h-11 justify-center text-sm">
                        继续学习
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : !emptyAll ? (
        <section className="mt-12">
          <h2 className="text-base font-semibold text-[var(--brand-deep)]">资源中心 · 在线课程</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">暂无已阅读的资源条目；在资源中心打开任意文章即可在此出现。</p>
          <Link className="btn-primary mt-4 inline-flex text-sm" to="/resources">
            去资源中心
          </Link>
        </section>
      ) : null}
    </div>
  )
}
