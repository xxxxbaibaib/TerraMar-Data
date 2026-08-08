import { useEffect, useState } from 'react'
import {
  fetchSitePageAdmin,
  parseAboutBlocks,
  parseHomeBlocks,
  saveSitePage,
} from '../../lib/cms/siteContent'
import type { AboutPageBlocks, CmsStatus, HomePageBlocks } from '../../lib/cms/types'

export function AdminPagesPage() {
  const [tab, setTab] = useState<'home' | 'about'>('home')
  const [home, setHome] = useState<HomePageBlocks | null>(null)
  const [about, setAbout] = useState<AboutPageBlocks | null>(null)
  const [status, setStatus] = useState<CmsStatus>('published')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const h = await fetchSitePageAdmin('home')
      const a = await fetchSitePageAdmin('about')
      setHome(parseHomeBlocks((h?.blocks as Record<string, unknown>) ?? {}))
      setAbout(parseAboutBlocks((a?.blocks as Record<string, unknown>) ?? {}))
      setStatus((tab === 'home' ? h?.status : a?.status) ?? 'published')
    })()
  }, [tab])

  const save = async (next: CmsStatus) => {
    if (!home || !about) return
    setBusy(true)
    setMsg(null)
    try {
      if (tab === 'home') {
        await saveSitePage('home', { title: '首页', blocks: home, status: next })
      } else {
        await saveSitePage('about', { title: '关于我们', blocks: about, status: next })
      }
      setStatus(next)
      setMsg(next === 'published' ? '已发布到官网' : '已保存为草稿')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  if (!home || !about) return <p className="text-sm">加载中…</p>

  const fields =
    tab === 'home'
      ? (Object.keys(home) as (keyof HomePageBlocks)[]).map((key) => ({
          key,
          label: key,
          value: home[key],
          onChange: (v: string) => setHome({ ...home, [key]: v }),
        }))
      : (Object.keys(about) as (keyof AboutPageBlocks)[]).map((key) => ({
          key,
          label: key,
          value: about[key],
          onChange: (v: string) => setAbout({ ...about, [key]: v }),
        }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-semibold text-[var(--brand-deep)]">页面文案</h2>
        <button type="button" className={`rounded-full px-3 py-1 text-sm ${tab === 'home' ? 'bg-[var(--brand-deep)] text-white' : 'bg-black/5'}`} onClick={() => setTab('home')}>
          首页
        </button>
        <button type="button" className={`rounded-full px-3 py-1 text-sm ${tab === 'about' ? 'bg-[var(--brand-deep)] text-white' : 'bg-black/5'}`} onClick={() => setTab('about')}>
          关于我们
        </button>
        <span className="text-xs text-[var(--text-secondary)]">状态：{status}</span>
      </div>
      <div className="grid gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="font-medium text-[var(--brand-deep)]">{f.label}</span>
            {f.value.length > 80 ? (
              <textarea className="field-textarea mt-1" rows={4} value={f.value} onChange={(e) => f.onChange(e.target.value)} />
            ) : (
              <input className="field-input mt-1" value={f.value} onChange={(e) => f.onChange(e.target.value)} />
            )}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="tm-btn tm-btn-secondary" disabled={busy} onClick={() => void save('draft')}>
          保存草稿
        </button>
        <button type="button" className="tm-btn tm-btn-primary" disabled={busy} onClick={() => void save('published')}>
          发布
        </button>
      </div>
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
