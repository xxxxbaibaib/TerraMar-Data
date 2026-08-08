import { useEffect, useState } from 'react'
import { listProgramsAdmin, upsertProgram } from '../../lib/cms/programsRemote'
import type { CmsProgramRow, CmsStatus } from '../../lib/cms/types'

export function AdminProgramsPage() {
  const [rows, setRows] = useState<CmsProgramRow[]>([])
  const [edit, setEdit] = useState<{
    id?: string
    slug: string
    title: string
    sort_order: number
    json: string
  } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => setRows(await listProgramsAdmin())
  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [])

  const save = async (status: CmsStatus) => {
    if (!edit) return
    try {
      const payload = JSON.parse(edit.json) as Record<string, unknown>
      await upsertProgram({
        id: edit.id,
        slug: edit.slug,
        title: edit.title,
        sort_order: edit.sort_order,
        status,
        payload,
      })
      setEdit(null)
      await reload()
      setMsg(status === 'published' ? '已发布' : '已保存草稿')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败（请检查 JSON）')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--brand-deep)]">科考活动</h2>
        <button
          type="button"
          className="tm-btn tm-btn-primary"
          onClick={() =>
            setEdit({
              slug: '',
              title: '',
              sort_order: 100,
              json: JSON.stringify(
                {
                  type: 'weekend',
                  brief: '',
                  heroImageUrl: '',
                  themeTags: [],
                  locationName: '',
                  startDate: '',
                  endDate: '',
                  durationText: '',
                  audienceTags: [],
                  intensity: 'low',
                  highlights: [],
                  itinerary: [],
                  included: [],
                  excluded: [],
                  safetyNotes: [],
                  faq: [],
                  instructors: [],
                },
                null,
                2,
              ),
            })
          }
        >
          新增
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(47,79,58,0.12)] px-3 py-2">
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
                  sort_order: r.sort_order,
                  json: JSON.stringify(r.payload, null, 2),
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
          <label className="block text-sm">
            slug
            <input className="field-input mt-1" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
          </label>
          <label className="block text-sm">
            title
            <input className="field-input mt-1" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          </label>
          <label className="block text-sm">
            payload JSON
            <textarea className="field-textarea mt-1 font-mono text-xs" rows={16} value={edit.json} onChange={(e) => setEdit({ ...edit, json: e.target.value })} />
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
