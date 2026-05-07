import { Link } from 'react-router-dom'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { useAuth } from '../../../lib/auth/AuthContext'
import { MEMBER_POINTS_RULES, memberRowForLevel } from '../../../lib/account/memberTierTable'

function TaskRow(props: {
  title: string
  subtitle: string
  done: number
  cap: number
  href: string
  cta: string
  disabled?: boolean
}) {
  const pct = props.cap <= 0 ? 0 : Math.min(100, (props.done / props.cap) * 100)
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[rgba(47,79,58,0.1)] bg-[#fffaf2] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{props.title}</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{props.subtitle}</p>
        <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]">
          <div className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {props.disabled ? (
        <span className="text-sm text-[var(--text-tertiary)]">已完成</span>
      ) : (
        <Link to={props.href} className="btn-secondary inline-flex shrink-0 justify-center text-sm">
          {props.cta}
        </Link>
      )}
    </li>
  )
}

export function AccountTasksPage() {
  const { user } = useAuth()
  if (!user) return null

  const tier = memberRowForLevel(user.level)
  const t = user.taskProgressInLevel ?? { exploration: 0, welfare: 0, species: 0, resource: 0 }
  const cap = 2

  return (
    <div>
      <AccountBreadcrumb current="任务中心" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">任务中心</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        当前等级 <strong className="text-[var(--text-primary)]">Lv{user.level}</strong>「{tier.name}」· 每档需完成科考活动、公益行动、物种记录、资料学习各{' '}
        <strong>2</strong> 次（演示计数，升级后清零）。
      </p>

      <section className="card mt-6 p-5 shadow-[var(--shadow-soft)] md:p-6">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">积分怎么来（演示）</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          <li>
            科考活动课程参与：每次 +{MEMBER_POINTS_RULES.explorationCoursePerSession} 分；已连接数据库时于「提交活动报名表」或活动详情页「完成本节学习」写入{' '}
            <code className="rounded bg-[rgba(47,79,58,0.08)] px-1 text-[var(--text-primary)]">profiles</code>
            （非仅点击下单）。
          </li>
          <li>志愿时长：每小时 +{MEMBER_POINTS_RULES.volunteerHour} 分</li>
          <li>公民科学物种上传：每条 +{MEMBER_POINTS_RULES.speciesRecord} 分</li>
          <li>参与志愿 / 公益行动（含本页对应任务轨）：每次 +{MEMBER_POINTS_RULES.welfareActivityParticipation} 分（占位）</li>
          <li>资料中心单篇学完：每篇 +{MEMBER_POINTS_RULES.resourceArticleComplete} 分（占位，每 slug 仅一次）</li>
          <li>邀请好友成功：每次 +{MEMBER_POINTS_RULES.inviteFriendSuccess} 分（不计入本级八类次数）</li>
        </ul>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">科考活动（2 次）</h2>
        <ul className="mt-4 space-y-4">
          <TaskRow
            title="完成第 1 次科考活动课程学习"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.explorationCoursePerSession} 分 · 本档 ${Math.min(1, t.exploration)}/1`}
            done={Math.min(1, t.exploration)}
            cap={1}
            href="/programs"
            cta="去完成"
            disabled={t.exploration >= 1}
          />
          <TaskRow
            title="完成第 2 次科考活动课程学习"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.explorationCoursePerSession} 分 · 本档 ${Math.min(1, Math.max(0, t.exploration - 1))}/1`}
            done={Math.min(1, Math.max(0, t.exploration - 1))}
            cap={1}
            href="/programs"
            cta="去完成"
            disabled={t.exploration >= 2}
          />
        </ul>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">公益行动（2 次）</h2>
        <ul className="mt-4 space-y-4">
          <TaskRow
            title="参与第 1 次公益 / 志愿相关行动"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.welfareActivityParticipation} 分 · 本档 ${Math.min(1, t.welfare)}/1`}
            done={Math.min(1, t.welfare)}
            cap={1}
            href="/impact"
            cta="去找活动"
            disabled={t.welfare >= 1}
          />
          <TaskRow
            title="参与第 2 次公益 / 志愿相关行动"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.welfareActivityParticipation} 分 · 本档 ${Math.min(1, Math.max(0, t.welfare - 1))}/1`}
            done={Math.min(1, Math.max(0, t.welfare - 1))}
            cap={1}
            href="/join-network/personal"
            cta="去登记"
            disabled={t.welfare >= 2}
          />
        </ul>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">物种记录（2 次）</h2>
        <ul className="mt-4 space-y-4">
          <TaskRow
            title="上传第 1 条有效物种记录"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.speciesRecord} 分 · 本档 ${Math.min(1, t.species)}/1`}
            done={Math.min(1, t.species)}
            cap={1}
            href="/science"
            cta="去上传"
            disabled={t.species >= 1}
          />
          <TaskRow
            title="上传第 2 条有效物种记录"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.speciesRecord} 分 · 本档 ${Math.min(1, Math.max(0, t.species - 1))}/1`}
            done={Math.min(1, Math.max(0, t.species - 1))}
            cap={1}
            href="/science"
            cta="去上传"
            disabled={t.species >= 2}
          />
        </ul>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">累计已提交 {user.speciesRecordsSubmittedCount} 条（全局，不按等级清零）。</p>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">资料中心学习（2 次）</h2>
        <ul className="mt-4 space-y-4">
          <TaskRow
            title="学完 1 篇资料（进度 100%）"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.resourceArticleComplete} 分 · 本档 ${Math.min(1, t.resource)}/1`}
            done={Math.min(1, t.resource)}
            cap={1}
            href="/resources"
            cta="去学习"
            disabled={t.resource >= 1}
          />
          <TaskRow
            title="再学完 1 篇资料（进度 100%）"
            subtitle={`奖励 +${MEMBER_POINTS_RULES.resourceArticleComplete} 分 · 本档 ${Math.min(1, Math.max(0, t.resource - 1))}/1`}
            done={Math.min(1, Math.max(0, t.resource - 1))}
            cap={1}
            href="/resources"
            cta="去学习"
            disabled={t.resource >= 2}
          />
        </ul>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          资源课程完成演示计数 {user.resourceCoursesCompletedCount}；与阅读页「单篇学完」积分可并行（演示）。
        </p>
      </section>

      <p className="mt-6 text-xs text-[var(--text-tertiary)]">本档任务合计进度：科考 {t.exploration}/{cap} · 公益 {t.welfare}/{cap} · 物种档内 {t.species}/{cap} · 资料 {t.resource}/{cap}</p>
    </div>
  )
}
