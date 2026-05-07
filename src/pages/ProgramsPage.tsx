import { useEffect, useMemo, useState } from 'react'
import { ProgramCard } from '../components/common/ProgramCard'
import { MapHeroShell } from '../components/map/MapHeroShell'
import { trackEvent } from '../lib/analytics'
import { programs } from '../mock/programs'
import type { ProgramIntensity, ProgramType } from '../mock/types'
import { Link } from 'react-router-dom'
import { networkJoinPath } from '../lib/joinRouting'

type TimeFilter = 'all' | 'thisMonth' | 'nextMonth'

export function ProgramsPage() {
  useEffect(() => {
    trackEvent('view_program_list')
  }, [])

  const [type, setType] = useState<'all' | ProgramType>('all')
  const [audience, setAudience] = useState<
    'all' | '亲子' | '银发' | '身心疗愈群体' | '志愿者' | '公民科学家'
  >('all')
  const [intensity, setIntensity] = useState<'all' | ProgramIntensity>('all')
  const [location, setLocation] = useState<'all' | '钱江源' | '杭州' | '城市自然基地'>('all')
  const [theme, setTheme] = useState<'all' | '森林' | '溪流' | '观鸟' | '昆虫' | '植物' | '自然疗愈' | '科考'>('all')
  const [time, setTime] = useState<TimeFilter>('all')

  const filtered = useMemo(() => {
    trackEvent('filter_programs', { type, audience, intensity, location, theme, time })
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return programs.filter((program) => {
      if (type !== 'all' && program.type !== type) return false
      if (audience !== 'all' && !program.audienceTags.includes(audience)) return false
      if (intensity !== 'all' && program.intensity !== intensity) return false
      if (location !== 'all' && !program.locationName.includes(location)) return false
      if (theme !== 'all' && !program.themeTags.includes(theme)) return false

      if (time === 'all') return true

      const start = new Date(program.startDate)
      const isThisMonth = start.getMonth() === month && start.getFullYear() === year
      const isNextMonth =
        start.getMonth() === (month + 1) % 12 &&
        start.getFullYear() === (month === 11 ? year + 1 : year)

      return time === 'thisMonth' ? isThisMonth : isNextMonth
    })
  }, [type, audience, intensity, location, theme, time])

  return (
    <>
      <MapHeroShell
        page="programs"
        title="山海云自然教育数据平台"
        subtitle="查看参与群体网络、来源热力与活动地分布，按人群与主题快速筛选。"
        cta={{ label: '查看活动列表', to: '/programs' }}
        secondaryCta={{ label: '加入自然教育网络', to: networkJoinPath }}
      />

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page">

      <div className="mt-6 grid gap-3 rounded-[22px] border-2 border-[rgba(47,75,58,0.62)] bg-[rgba(18,43,33,0.88)] p-5 shadow-[0_0_0_1px_rgba(47,75,58,0.28),3px_4px_0_rgba(16,35,27,0.24)] md:grid-cols-3 lg:grid-cols-6">
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          活动类型
          <select value={type} onChange={(e) => setType(e.target.value as 'all' | ProgramType)} className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none">
            <option value="all">全部</option>
            <option value="half_day">半日活动</option>
            <option value="weekend">周末营</option>
            <option value="camp">深度营</option>
            <option value="adult_healing">成人疗愈</option>
            <option value="senior">银发疗愈</option>
            <option value="citizen_science">公民科学</option>
          </select>
        </label>
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          适合人群
          <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none">
            <option value="all">全部</option>
            <option value="亲子">亲子</option>
            <option value="银发">银发</option>
            <option value="身心疗愈群体">身心疗愈群体</option>
            <option value="志愿者">志愿者</option>
            <option value="公民科学家">公民科学家</option>
          </select>
        </label>
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          强度
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as 'all' | ProgramIntensity)}
            className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none"
          >
            <option value="all">全部</option>
            <option value="low">低强度</option>
            <option value="medium">中强度</option>
            <option value="high">高强度</option>
          </select>
        </label>
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          地点
          <select value={location} onChange={(e) => setLocation(e.target.value as typeof location)} className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none">
            <option value="all">全部</option>
            <option value="钱江源">钱江源</option>
            <option value="杭州">杭州</option>
            <option value="城市自然基地">城市自然基地</option>
          </select>
        </label>
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          主题
          <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)} className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none">
            <option value="all">全部</option>
            <option value="森林">森林</option>
            <option value="溪流">溪流</option>
            <option value="观鸟">观鸟</option>
            <option value="昆虫">昆虫</option>
            <option value="植物">植物</option>
            <option value="自然疗愈">自然疗愈</option>
            <option value="科考">科考</option>
          </select>
        </label>
        <label className="rounded-[14px] border border-[rgba(206,221,210,0.26)] bg-[rgba(13,33,25,0.62)] p-2 text-center text-sm font-medium text-[#DCE8DF]">
          时间
          <select value={time} onChange={(e) => setTime(e.target.value as TimeFilter)} className="field-input mt-1 border border-[rgba(206,221,210,0.36)] bg-[rgba(10,28,21,0.74)] px-3 text-center text-[#EAF3EC] shadow-none">
            <option value="all">全部</option>
            <option value="thisMonth">本月</option>
            <option value="nextMonth">下月</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-6 bg-[rgba(255,251,245,0.88)] p-6">
          <p className="text-[var(--text-secondary)]">暂无匹配活动，请尝试清空筛选。</p>
          <button
            type="button"
            onClick={() => {
              setType('all')
              setAudience('all')
              setIntensity('all')
              setLocation('all')
              setTheme('all')
              setTime('all')
            }}
            className="btn-secondary mt-3"
          >
            清空筛选
          </button>
          <Link to="/" className="btn-secondary ml-3">
            订阅下期活动
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
      </div>
      </section>
    </>
  )
}
