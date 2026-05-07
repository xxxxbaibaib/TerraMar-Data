import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapHeroShell } from '../components/map/MapHeroShell'
import { trackEvent } from '../lib/analytics'
import { shanhaiyunVolunteerJoinPathWithProject } from '../lib/shanhaiyunVolunteerLeads'
import { impactMetrics } from '../mock/metrics'
import { impactProgramCards } from '../mock/impactProjects'
import type { ImpactProgramTagTone } from '../mock/types'
import { isSupabaseConfigured } from '../lib/supabase/env'
import { fetchWelfareEnrollmentKpisAsMapMetrics } from '../lib/map/mapWelfareKpisRemote'
import type { WelfareProjectSlug } from '../lib/impact/welfareProjectSlugs'

/** 底部「参与公益行动」通栏卡背景 */
const IMPACT_VOLUNTEER_CTA_BG =
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2000&q=80'

const TAG_TONE_CLASS: Record<ImpactProgramTagTone, string> = {
  sky: 'bg-[#E3F2FD] text-[#1565C0] ring-1 ring-[#BBDEFB]/70',
  sage: 'bg-[#E8F5E9] text-[#2E7D32] ring-1 ring-[#C8E6C9]/80',
  amber: 'bg-[#FFF3E0] text-[#E65100] ring-1 ring-[#FFE0B2]/80',
  lavender: 'bg-[#EDE7F6] text-[#5E35B1] ring-1 ring-[#D1C4E9]/70',
  mint: 'bg-[#E0F2F1] text-[#00695C] ring-1 ring-[#B2DFDB]/70',
  rose: 'bg-[#FCE4EC] text-[#AD1457] ring-1 ring-[#F8BBD0]/70',
}

/** 大图卡片顺序与 RPC metric_key 对齐（见 get_public_welfare_enrollment_kpis） */
const IMPACT_CARD_METRIC_KEYS = ['service_people', 'schools', 'volunteers', 'communities'] as const

export function ImpactPage() {
  const navigate = useNavigate()
  const [showProjectGate, setShowProjectGate] = useState(false)
  const [metricValues, setMetricValues] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    trackEvent('view_impact')
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    void fetchWelfareEnrollmentKpisAsMapMetrics()
      .then((rows) => {
        if (cancelled || rows.length === 0) return
        const map: Record<string, string> = {}
        for (const r of rows) {
          map[r.key] = String(r.value)
        }
        setMetricValues(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const openGate = useCallback(() => {
    setShowProjectGate(true)
    trackEvent('impact_welfare_project_gate_open')
  }, [])

  const pickProject = useCallback(
    (slug: WelfareProjectSlug) => {
      trackEvent('impact_welfare_project_picked', { slug })
      setShowProjectGate(false)
      navigate(shanhaiyunVolunteerJoinPathWithProject(slug))
    },
    [navigate],
  )

  return (
    <>
      <MapHeroShell
        page="impact"
        title="山海云公益平台"
        subtitle="记录栖息地、社区、学校覆盖网络与公益触达热区，连接更多在地行动。"
        cta={{ label: '参与公益行动', to: '/impact' }}
        ctaOnClick={openGate}
      />

      <section className="section-shell bg-[var(--bg-base)]">
        <div className="container-page">
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {impactMetrics.map((item, idx) => {
              const key = IMPACT_CARD_METRIC_KEYS[idx]
              const live = key && metricValues?.[key]
              return (
                <article key={item.label} className="relative overflow-hidden rounded-[24px] shadow-[0_12px_40px_rgba(15,29,22,0.12)]">
                  <img src={item.image} alt="" className="h-[280px] w-full object-cover md:h-[300px]" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,16,0.88)] via-[rgba(12,20,16,0.32)] to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-none tracking-tight">{live ?? item.value}</p>
                    <p className="mt-2 text-base font-semibold leading-snug text-white/95">{item.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/78">
                      {live ? '数据来自平台公益报名统计（platform_welfare_enrollments）' : item.subtitle}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
            {metricValues
              ? '指标与地图底部 KPI 同源，由报名记录聚合。'
              : '口径说明：示范期累计值；连接 Supabase 且已执行最新迁移后显示实时报名聚合。'}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {impactProgramCards.map((project) => (
              <article
                key={project.id}
                className="flex flex-col overflow-hidden rounded-[20px] border border-[rgba(46,125,50,0.14)] bg-[#fffaf2] shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
              >
                <div className="relative h-44 w-full shrink-0 sm:h-48">
                  <img src={project.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">{project.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{project.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#2E7D32]" aria-hidden />
                    <span className="text-[#2E7D32]">进行中</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={`${project.id}-${tag.text}`}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${TAG_TONE_CLASS[tag.tone]}`}
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-1 flex-col justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => pickProject(project.id as WelfareProjectSlug)}
                      className="inline-flex min-h-10 w-fit items-center justify-center rounded-full border-2 border-[#3B8C3A] bg-transparent px-5 py-2 text-sm font-medium text-[#2E7D32] transition hover:bg-[#3B8C3A] hover:text-[#f8f2e8] hover:shadow-sm"
                    >
                      {project.cta.label}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <div className="relative col-span-1 overflow-hidden rounded-[20px] border border-[rgba(47,79,58,0.14)] shadow-[var(--shadow-soft)] md:col-span-2">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${IMPACT_VOLUNTEER_CTA_BG})` }}
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,251,245,0.94)_0%,rgba(255,251,245,0.88)_42%,rgba(236,228,207,0.9)_100%)]"
                aria-hidden
              />
              <div className="relative z-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
                <p className="max-w-3xl text-center text-sm leading-relaxed text-[var(--text-primary)] sm:text-left">
                  参与山海云公益志愿行动：请先选择公益项目，再进入统一登记流程（已登录时数据写入线索与公益参与表）。
                </p>
                <div className="flex shrink-0 justify-center sm:justify-end">
                  <button type="button" onClick={openGate} className="btn-primary inline-flex">
                    参与公益行动
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showProjectGate ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impact-gate-title"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="impact-gate-title" className="font-serif text-xl font-semibold text-[var(--brand-deep)]">
                请选择公益项目
              </h2>
              <button type="button" className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-deep)]" onClick={() => setShowProjectGate(false)}>
                关闭
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">选择后将进入信息登记；须登录后提交方可写入数据库。</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {impactProgramCards.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => pickProject(project.id as WelfareProjectSlug)}
                  className="flex flex-col overflow-hidden rounded-xl border border-[rgba(47,79,58,0.15)] bg-[#fffaf2] text-left shadow-sm transition hover:border-[var(--brand-deep)] hover:shadow-md"
                >
                  <div className="relative h-32 w-full shrink-0">
                    <img src={project.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-[var(--brand-deep)]">{project.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{project.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
