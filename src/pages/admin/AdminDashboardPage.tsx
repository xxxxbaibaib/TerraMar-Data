import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { seedProgramsFromMock } from '../../lib/cms/programsRemote'
import { seedResourcesFromMock } from '../../lib/cms/resourcesRemote'
import { refreshHeroPublicUrls } from '../../lib/cms/heroMediaRemote'

const cards = [
  { to: '/admin/pages', title: '页面文案', desc: '首页 / 关于我们 Hero 与愿景' },
  { to: '/admin/team', title: '团队介绍', desc: '增删改成员、头像与简介' },
  { to: '/admin/programs', title: '科考活动', desc: '活动目录与详情 payload' },
  { to: '/admin/resources', title: '资源中心', desc: '文章列表与正文段落' },
  { to: '/admin/heroes', title: '背景视频', desc: '各页 Hero 媒体与 public URL' },
  { to: '/admin/leads', title: '线索跟进', desc: '表单提交线索列表' },
]

export function AdminDashboardPage() {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMsg(null)
  }, [])

  const runSeed = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const p = await seedProgramsFromMock()
      const r = await seedResourcesFromMock()
      const h = await refreshHeroPublicUrls()
      setMsg(`已导入活动 ${p} 条、资源 ${r} 条；刷新 Hero URL ${h} 条（已有数据则跳过导入）。`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '初始化失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--brand-deep)]">仪表盘</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          编辑后点「发布」，官网刷新即可看到，无需重新部署。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-2xl border border-[rgba(47,79,58,0.12)] bg-[#fffaf2] p-4 transition hover:border-[var(--brand-deep)]"
          >
            <p className="font-semibold text-[var(--brand-deep)]">{c.title}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{c.desc}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-[rgba(47,79,58,0.25)] p-4">
        <p className="text-sm font-medium text-[var(--brand-deep)]">首次使用：从 mock 导入活动 / 资源，并刷新 Hero public URL</p>
        <button type="button" className="tm-btn tm-btn-primary mt-3" disabled={busy} onClick={() => void runSeed()}>
          {busy ? '处理中…' : '一键初始化目录数据'}
        </button>
        {msg ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{msg}</p> : null}
      </div>
    </div>
  )
}
