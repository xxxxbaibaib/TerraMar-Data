import { useEffect, useState } from 'react'
import { listResourcesAdmin, upsertResource } from '../../lib/cms/resourcesRemote'
import type { CmsResourceRow, CmsStatus } from '../../lib/cms/types'

export function AdminResourcesPage() {
  const [rows, setRows] = useState<CmsResourceRow[]>([])
  const [edit, setEdit] = useState<{
    id?: string
    slug: string
    title: string
    category: string
    summary: string
    article_date: string
    paragraphsText: string
    video_url: string
    sort_order: number
  } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => setRows(await listResourcesAdmin())
  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [])

  const save = async (status: CmsStatus) => {
    if (!edit) return
    try {
      await upsertResource({
        id: edit.id,
        slug: edit.slug,
        title: edit.title,
        category: edit.category,
        summary: edit.summary,
        article_date: edit.article_date || null,
        paragraphs: edit.paragraphsText
          .split(/\n\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean),
        video_url: edit.video_url || null,
        sort_order: edit.sort_order,
        status,
      })
      setEdit(null)
      await reload()
      setMsg(status === 'published' ? '已发布' : '已保存草稿')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--brand-deep)]">资源中心</h2>
        <button
          type="button"
          className="tm-btn tm-btn-primary"
          onClick={() =>
            setEdit({
              slug: '',
              title: '',
              category: '',
              summary: '',
              article_date: '',
              paragraphsText: '',
              video_url: '',
              sort_order: 100,
            })
          }
        >
          新增
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <div>
              <p className="font-medium text-[var(--brand-deep)]">{r.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {r.slug} · {r.status}
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-[var(--brand-primary)]"
              onClick={() =>
                setEdit({
                  id: r.id,
                  slug: r.slug,
                  title: r.title,
                  category: r.category,
                  summary: r.summary,
                  article_date: r.article_date ?? '',
                  paragraphsText: (r.paragraphs ?? []).join('\n\n'),
                  video_url: r.video_url ?? '',
                  sort_order: r.sort_order,
                })
              }
            >
              编辑
            </button>
          </div>
        ))}
      </div>
      {edit ? (
        <div className="space-y-3 rounded-2xl border bg-[#fffaf2] p-4">
          {(['slug', 'title', 'category', 'summary', 'article_date', 'video_url'] as const).map((k) => (
            <label key={k} className="block text-sm">
              {k}
              <input className="field-input mt-1" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
            </label>
          ))}
          <label className="block text-sm">
            正文段落（空行分隔）
            <textarea className="field-textarea mt-1" rows={10} value={edit.paragraphsText} onChange={(e) => setEdit({ ...edit, paragraphsText: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <button type="button" className="tm-btn tm-btn-secondary" onClick={() => void save('draft')}>
              草稿
            </button>
            <button type="button" className="tm-btn tm-btn-primary" onClick={() => void save('published')}>
              发布
            </button>
            <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setEdit(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
