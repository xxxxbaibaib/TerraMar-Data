import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { buildAuthHref, shanhaiJoinPath } from '../lib/joinRouting'
import { trackEvent } from '../lib/analytics'
import { HERO_HOME_POSTER, HERO_HOME_VIDEO_SRC } from '../config/heroMedia'
import { programs } from '../mock/programs'
import { resources } from '../mock/resources'
import { useAuth } from '../lib/auth/AuthContext'
import { isMockAuthMode } from '../lib/supabase/env'
import {
  fetchExistingLeadForShanhaiyunChannel,
  SHANHAIYUN_CHANNEL,
} from '../lib/account/shanhaiyunProfileSnapshotRemote'

export function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const mockMode = isMockAuthMode()
  const recentSliderRef = useRef<HTMLDivElement | null>(null)
  const featuredResources = resources.slice(0, 3)
  const [shanhaiPrecheck, setShanhaiPrecheck] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [personalJoinedShanhai, setPersonalJoinedShanhai] = useState(false)

  useEffect(() => {
    trackEvent('view_home')
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id || mockMode) {
      setShanhaiPrecheck('ready')
      setPersonalJoinedShanhai(false)
      return
    }
    let cancelled = false
    setShanhaiPrecheck('loading')
    void Promise.all([
      fetchExistingLeadForShanhaiyunChannel(user.id, SHANHAIYUN_CHANNEL.shanhai),
      fetchExistingLeadForShanhaiyunChannel(user.id, SHANHAIYUN_CHANNEL.join_network_personal),
    ])
      .then(([shanLead, networkPersonalLead]) => {
        if (cancelled) return
        setPersonalJoinedShanhai(Boolean(shanLead || networkPersonalLead))
        setShanhaiPrecheck('ready')
      })
      .catch(() => {
        if (cancelled) return
        setPersonalJoinedShanhai(false)
        setShanhaiPrecheck('ready')
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, mockMode])

  const needShanhaiPrecheck = Boolean(!mockMode && isAuthenticated && user?.id)
  const shanhaiPrecheckBusy = needShanhaiPrecheck && (shanhaiPrecheck === 'idle' || shanhaiPrecheck === 'loading')

  return (
    <div className="space-y-20 pb-10">
      <section className="relative -mt-6 min-h-screen w-full overflow-hidden" id="mission">
        <div className="absolute inset-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            {...(HERO_HOME_POSTER ? { poster: HERO_HOME_POSTER } : {})}
            onError={() => {
              console.warn('[TerraMar] 首页背景视频加载失败，请检查 Storage 桶是否 Public、文件名是否与 bucket 内一致。当前地址:', HERO_HOME_VIDEO_SRC)
            }}
          >
            <source src={HERO_HOME_VIDEO_SRC} type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(22,36,29,0.28)] via-[rgba(22,36,29,0.42)] to-[rgba(22,36,29,0.62)]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-24">
            <div className="max-w-4xl text-center text-[#F8F7F2]">
              <p className="mx-auto mb-4 inline-flex rounded-[999px] border border-white/40 bg-white/15 px-4 py-1 text-base backdrop-blur">
                Learning with the living world
              </p>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">让保护被看见，让自然可感知，让参与有意义。</h1>
              <p className="mx-auto mt-5 max-w-3xl text-sm text-[#F8F7F2]/90 md:text-base">
                TerraMar 以保护地为课堂，以生态系统为教材，以社区故事为连接，设计面向儿童、家庭、学校、公众与合作机构的自然教育、公益行动与公民科学项目。
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/programs"
                  onClick={() => trackEvent('click_home_primary_cta', { sourcePath: '/' })}
                  className="inline-flex min-h-11 items-center justify-center rounded-[999px] bg-white/95 px-6 py-3 text-sm font-medium text-[#1F3328] hover:-translate-y-0.5 hover:bg-white"
                >
                  查看近期活动
                </Link>
                <Link
                  to="/about#mission"
                  className="inline-flex min-h-11 items-center justify-center rounded-[999px] border border-white/45 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
                >
                  了解我们的使命
                </Link>
              </div>
              <p className="mt-5 text-xs text-[#F8F7F2]/85 md:text-sm">依托保护地真实场景的自然教育机构 ｜ 保护地 · 社区 · 公益 · 公民科学</p>
            </div>
        </div>
      </section>

      <div className="bg-[var(--bg-base)]">
      <section className="container-page section-shell">
        <h2 className="section-title text-center uppercase tracking-[0.02em]">我们的影响，不止于课程</h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-[var(--text-secondary)] md:text-base">
          以钱江源示范项目与“城市—保护地”双核计划为起点，我们持续把自然教育转化为可衡量的公共价值。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              metric: '3,600+',
              label: '儿童生命轨迹被改变',
              period: '累计服务青少年人次',
              image:
                'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80',
            },
            {
              metric: '12,500 亩',
              label: '保护地栖息地课程覆盖面积',
              period: '保护地教育场景覆盖',
              image:
                'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80',
            },
            {
              metric: '48 个',
              label: '社区共建与在地发展项目',
              period: '社区/学校协同项目',
              image:
                'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
            },
            {
              metric: '21,000+',
              label: '公民科学物种记录条目',
              period: '观察记录与数据入库',
              image:
                'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80',
            },
          ].map((item) => (
            <article key={item.label} className="relative overflow-hidden rounded-[24px]">
              <img src={item.image} alt={item.label} className="h-[320px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,16,0.82)] via-[rgba(12,20,16,0.28)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-4xl font-semibold leading-none">{item.metric}</p>
                <p className="mt-2 text-base font-semibold text-white/95">{item.label}</p>
                <p className="mt-1 text-xs text-white/80">{item.period}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">口径说明：示范期累计值（含课程参与、合作项目与公民科学记录）。</p>
      </section>

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page">
        <h2 className="section-title text-center">如何加入活动项目</h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-[var(--text-secondary)] md:text-base">
          依托“保护地导向、在地协同、公民科学参与”的路径，从活动体验走向生态理解与长期行动。
        </p>
        <div className="mt-6 grid gap-3 md:h-[min(60vw,760px)] md:max-h-[760px] md:grid-cols-3 md:grid-rows-2 md:[aspect-ratio:5/3]">
          {[
            {
              to: '/programs',
              title: '科考活动',
              desc: '选择适合你的主题与人群，完成报名后进入活动日历。',
              event: 'programs',
              image:
                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
              layout: 'md:col-span-2 md:row-span-1 min-h-[180px] md:min-h-0',
            },
            {
              to: '/science',
              title: '科研与公民科学',
              desc: '上传观察记录、加入数据任务，让每次出行都形成科学积累。',
              event: 'science',
              image:
                'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80',
              layout: 'md:col-span-1 md:row-span-2 min-h-[180px] md:min-h-0',
            },
            {
              to: '/cooperation',
              title: '合作共建',
              desc: '学校、保护地与机构可发起共建需求，快速对接项目团队。',
              event: 'cooperation',
              image:
                'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
              layout: 'md:col-span-1 md:row-span-1 min-h-[180px] md:min-h-0',
            },
            {
              to: '/impact',
              title: '公益行动',
              desc: '加入在地项目与志愿行动，持续追踪你的公益贡献记录。',
              event: 'impact',
              image:
                'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80',
              layout: 'md:col-span-1 md:row-span-1 min-h-[180px] md:min-h-0',
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => trackEvent('click_home_entry_card', { target: item.event })}
              className={`group relative overflow-hidden rounded-[18px] border border-white/35 ${item.layout}`}
            >
              <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(14,24,19,0.82)] via-[rgba(14,24,19,0.35)] to-[rgba(14,24,19,0.08)]" />
              <div className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs text-[var(--brand-primary)]">
                ↗
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-white/85">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      </section>

      <section className="section-shell">
        <div className="mx-2 overflow-hidden rounded-[28px] bg-[var(--brand-deep)] px-4 py-10 text-white md:mx-4 md:px-8 md:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[clamp(2rem,3vw,3rem)] font-semibold uppercase leading-[1.1] tracking-[0.01em]">近期活动</h2>
            <p className="mt-2 text-sm text-white/80 md:text-base">从保护地真实场景出发，连接体验、生态理解与长期行动。</p>
          </div>

          <div ref={recentSliderRef} className="mx-auto mt-4 flex w-full max-w-[1700px] snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {programs.map((program) => (
              <article className="w-[88%] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/15 bg-[rgba(13,26,20,0.55)] md:w-[calc((100%-2rem)/3)]" key={program.id}>
                <img src={program.heroImageUrl} alt={program.title} className="h-48 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <p className="text-xs text-white/75">{program.locationName}</p>
                  <h3 className="text-xl font-semibold leading-snug text-white">{program.title}</h3>
                  <p className="text-sm text-white/80">{program.brief}</p>
                  <div className="flex items-center justify-between pt-2 text-xs text-white/75">
                    <span>
                      ¥{program.priceFrom} - ¥{program.priceTo}
                    </span>
                    <span>剩余 {program.spotsLeft} 席</span>
                  </div>
                  <Link
                    to={`/programs/${program.slug}`}
                    onClick={() => trackEvent('click_program_card', { slug: program.slug })}
                    className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[999px] bg-white/90 px-4 py-2 text-sm font-medium text-[#1c3225] hover:bg-white"
                  >
                    查看详情
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Link to="/programs" className="btn-primary">
              查看全部活动
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page">
        <div className="relative mb-6">
          <div className="text-center">
            <h2 className="section-title">浏览我们的文章和资源</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">围绕保护地教育、社区共建与公民科学，持续输出可复用的方法与案例。</p>
          </div>
          <Link to="/resources" className="mt-3 inline-flex text-sm text-[var(--brand-primary)] hover:opacity-80 md:absolute md:bottom-0 md:right-0 md:mt-0">
            查看全部资源
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredResources.map((item, index) => (
            <Link key={item.id} to="/resources" className="group block cursor-pointer">
              <article className="overflow-hidden rounded-[22px]">
                <div className="relative">
                  <img
                    src={
                      index === 0
                        ? 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80'
                        : index === 1
                          ? 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1200&q=80'
                          : 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={item.title}
                    className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute right-3 top-3 rounded-[999px] bg-[rgba(18,49,40,0.9)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {index === 0 ? 'News' : index === 1 ? 'Resources' : 'Articles'}
                  </span>
                </div>
                <div className="flex min-h-[94px] flex-col justify-between pt-3">
                  <h3 className="text-[1.18rem] font-semibold uppercase leading-snug text-[var(--brand-primary)]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>

        <div className="relative mt-14 overflow-hidden rounded-[24px] md:mt-20">
          <img
            src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1800&q=80"
            alt="钱江源自然教育项目"
            className="h-[220px] w-full object-cover md:h-[260px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,29,22,0.82),rgba(15,29,22,0.45),rgba(15,29,22,0.62))]" />
          <div className="absolute inset-0 flex items-center justify-between gap-4 p-6 md:p-10">
            <div className="mx-auto max-w-3xl text-center text-white">
              <h2 className="text-[clamp(1.8rem,3vw,3rem)] font-semibold uppercase leading-[1.1]">钱江源：首个示范目的地</h2>
              <p className="mt-2 text-sm text-white/85 md:text-base">
                以国家公园与自然保护地为课堂，串联课程体验、公益行动与公民科学记录，形成长期可复制的自然教育示范模型。
              </p>
            </div>
            <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 items-center gap-2 md:flex">
              <Link to="/cooperation" className="inline-flex min-h-10 items-center justify-center rounded-[999px] border border-white/30 bg-transparent px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-white/10">
                联系合作
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page section-shell">
        {needShanhaiPrecheck && shanhaiPrecheck === 'ready' && personalJoinedShanhai ? (
          <article className="trust-card mx-auto max-w-2xl space-y-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--brand-deep)]">您已加入山海</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              当前账号已存在加入山海或自然教育网络·个人登记记录，无需重复提交。
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/account" className="btn-primary inline-flex text-sm">
                查看我的账户
              </Link>
              <Link to="/cooperation" className="btn-secondary inline-flex text-sm">
                合作共建
              </Link>
            </div>
          </article>
        ) : (
          <article className="card card-hover mx-auto max-w-2xl bg-[linear-gradient(145deg,#fbf7ef,#efe7d9)] p-7">
            <h2 className="section-title text-[clamp(1.3rem,2vw,2rem)]">加入山海</h2>
            <p className="section-subtle mt-2">
              与「加入自然教育网络」「参与公益行动」等入口一致：先完成定位与协作参考点选择，再在基本信息中填写资料；<strong className="font-medium text-[var(--text-primary)]">未登录时需填写登录账号与密码</strong>
              ，提交后即完成山海云注册并与本站登录、注册同步（演示数据写入本机浏览器）。
            </p>
            {shanhaiPrecheckBusy ? (
              <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">
                正在校验是否已登记…
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to={shanhaiJoinPath}
                className={`btn-primary inline-flex justify-center ${shanhaiPrecheckBusy ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={shanhaiPrecheckBusy}
                onClick={() => {
                  if (shanhaiPrecheckBusy) return
                  trackEvent('home_join_shanhai_start')
                }}
              >
                开始加入山海
              </Link>
              <Link
                to={buildAuthHref('/login', { next: '/account' })}
                className={`btn-secondary inline-flex justify-center text-sm ${shanhaiPrecheckBusy ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={shanhaiPrecheckBusy}
                onClick={() => {
                  if (shanhaiPrecheckBusy) return
                  trackEvent('home_join_shanhai_login')
                }}
              >
                已有账号，登录山海云
              </Link>
            </div>
          </article>
        )}
      </section>

      </div>
    </div>
  )
}
