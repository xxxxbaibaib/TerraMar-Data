import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import { useAuth } from '../lib/auth/AuthContext'
import { upsertMemberEngagement } from '../lib/account/memberEngagementsRemote'
import { buildAuthHref } from '../lib/joinRouting'
import { createProgramOrderAsync } from '../lib/account/programOrdersStore'
import { isMockAuthMode } from '../lib/supabase/env'
import { programs } from '../mock/programs'

export function ProgramDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, recordCourseCompleted } = useAuth()
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const program = programs.find((item) => item.slug === slug)

  useEffect(() => {
    if (!slug) return
    trackEvent('view_program_detail', { slug })
  }, [slug])

  if (!program) return <Navigate to="/programs" replace />

  return (
    <>
      <section className="relative -mt-6 flex min-h-screen w-full items-end overflow-hidden pt-24">
        <img src={program.heroImageUrl} alt={program.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(18,28,22,0.3)] via-[rgba(18,28,22,0.5)] to-[rgba(18,28,22,0.7)]" />
        <div className="container-page relative z-10 pb-16 text-white">
          <h1 className="text-4xl font-semibold md:text-6xl">{program.title}</h1>
          <p className="mt-3 max-w-3xl text-white/90">{program.brief}</p>
          <p className="mt-2 text-sm text-white/80">
            {program.locationName} ｜ {program.durationText} ｜ {program.startDate} - {program.endDate}
          </p>
        </div>
      </section>

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="space-y-6">
          <section className="card border border-[rgba(160,130,60,0.22)] bg-[rgba(255,248,230,0.45)] p-6">
            <h2 className="text-lg font-medium text-[var(--brand-deep)]">学习进度（演示）</h2>
            {!isAuthenticated || !user ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                <Link to="/login" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
                  登录
                </Link>
                后，在「我的账户」将主身份选为「游客」；已连接数据库时，科考活动积分写入云端{' '}
                <code className="rounded bg-[rgba(160,130,60,0.12)] px-1 text-xs">profiles</code>
                ，否则演示数据在本机浏览器。
              </p>
            ) : user.membershipType !== 'individual' ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">机构账号不参与个人课程轨演示。</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  已连接数据库时：购买后<strong className="font-medium text-[var(--text-primary)]">提交报名信息表成功</strong>
                  即计为完成 1 次科考活动课程学习并写入积分与任务进度；也可在此点击按钮补记一次（演示，+20 分）。
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-4"
                  onClick={async () => {
                    await recordCourseCompleted(1)
                    trackEvent('demo_course_complete', { slug: program.slug })
                    if (!isMockAuthMode() && user.membershipType === 'individual') {
                      try {
                        await upsertMemberEngagement({
                          userId: user.id,
                          domain: 'natural_education_program',
                          catalogSlug: program.slug,
                          status: 'completed',
                          metadata: { source: 'program_detail' },
                        })
                      } catch (e) {
                        console.warn('[TerraMar] platform_exploration_enrollments', e)
                      }
                    }
                  }}
                >
                  完成本节学习（演示，+20 分）
                </button>
              </>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">活动亮点</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
              {program.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">行程概览</h2>
            <div className="mt-3 space-y-3">
              {program.itinerary.map((item) => (
                <div key={item.dayLabel}>
                  <p className="font-medium">{item.dayLabel} · {item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.content}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">安全说明</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
              {program.safetyNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">费用说明</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium">费用包含</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                  {program.included.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium">费用不含</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                  {program.excluded.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-semibold">常见问题 FAQ</h2>
            <div className="mt-3 space-y-3">
              {program.faq.map((item) => (
                <details key={item.q} className="rounded-xl border border-[rgba(47,79,58,0.12)] bg-[rgba(255,251,245,0.72)] p-3">
                  <summary className="cursor-pointer font-medium">{item.q}</summary>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <article className="card p-6">
            <h2 className="text-lg font-medium">报名信息</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              价格：¥{program.priceFrom} - ¥{program.priceTo}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">剩余名额：{program.spotsLeft} / {program.spotsTotal}</p>
          </article>

          <article className="card border border-[rgba(47,79,58,0.12)] p-6">
            <h2 className="text-lg font-medium text-[var(--brand-deep)]">提交购买（演示）</h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              点击下单后，订单将出现在「我的订单」；支付为演示流程，不会连接真实支付网关。同一活动仅允许一笔待付款订单。个人会员在已连接数据库时，科考活动积分于
              <strong className="font-medium text-[var(--text-primary)]">报名表提交成功</strong>
              后写入 <code className="rounded bg-[rgba(47,79,58,0.08)] px-1">profiles</code>，非仅下单瞬间。
            </p>
            {!isAuthenticated || !user ? (
              <Link
                to={buildAuthHref('/login', { next: `/programs/${program.slug}` })}
                className="btn-primary mt-4 inline-flex w-full justify-center text-sm"
              >
                登录后下单
              </Link>
            ) : user.membershipType !== 'individual' ? (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">机构账号请通过商务或线下签约渠道报名。</p>
            ) : (
              <>
                {purchaseError ? <p className="mt-3 text-xs text-red-800">{purchaseError}</p> : null}
                <button
                  type="button"
                  className="btn-primary mt-4 w-full text-sm"
                  onClick={() => {
                    setPurchaseError(null)
                    void (async () => {
                      try {
                        const order = await createProgramOrderAsync(user.id, program)
                        trackEvent('program_place_order_demo', { slug: program.slug })
                        navigate(
                          `/programs/${program.slug}/enrollment?orderId=${encodeURIComponent(order.id)}`,
                        )
                      } catch (e) {
                        if (e instanceof Error && e.message === 'PENDING_PAYMENT_EXISTS') {
                          setPurchaseError('该活动已有待付款订单，请先在「我的订单」中处理。')
                        } else {
                          setPurchaseError('下单失败，请稍后重试。')
                        }
                      }
                    })()
                  }}
                >
                  提交购买下单
                </button>
              </>
            )}
          </article>
        </aside>
      </div>
      </section>
    </>
  )
}
