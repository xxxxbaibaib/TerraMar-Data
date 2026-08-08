import { useEffect, useState } from 'react'
import { archiveTeamMember, listTeamMembersAdmin, upsertTeamMember } from '../../lib/cms/teamRemote'
import { uploadCmsImage } from '../../lib/cms/mediaRemote'
import type { CmsStatus, TeamMemberRow } from '../../lib/cms/types'

const empty: Omit<TeamMemberRow, 'id'> = {
  name: '',
  role: '',
  bio: '',
  image_url: '',
  sort_order: 100,
  status: 'draft',
}

export function AdminTeamPage() {
  const [rows, setRows] = useState<TeamMemberRow[]>([])
  const [edit, setEdit] = useState<Partial<TeamMemberRow> & { name: string; role: string; bio: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => setRows(await listTeamMembersAdmin())

  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [])

  const save = async (status: CmsStatus) => {
    if (!edit) return
    setMsg(null)
    try {
      await upsertTeamMember({ ...edit, status })
      setEdit(null)
      await reload()
      setMsg(status === 'published' ? '已发布' : '已保存')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-[var(--brand-deep)]">团队介绍</h2>
        <button type="button" className="tm-btn tm-btn-primary" onClick={() => setEdit({ ...empty })}>
          新增成员
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-[rgba(47,79,58,0.12)] p-3">
            <img src={r.image_url || '/logo-brand.png'} alt="" className="h-14 w-14 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--brand-deep)]">
                {r.name} <span className="text-xs font-normal text-[var(--text-secondary)]">· {r.status}</span>
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{r.role}</p>
            </div>
            <button type="button" className="text-sm text-[var(--brand-primary)]" onClick={() => setEdit(r)}>
              编辑
            </button>
            <button
              type="button"
              className="text-sm text-red-700"
              onClick={() => void archiveTeamMember(r.id).then(reload)}
            >
              下架
            </button>
          </div>
        ))}
      </div>

      {edit ? (
        <div className="space-y-3 rounded-2xl border border-[rgba(47,79,58,0.18)] bg-[#fffaf2] p-4">
          <h3 className="font-semibold text-[var(--brand-deep)]">{edit.id ? '编辑成员' : '新增成员'}</h3>
          {(['name', 'role', 'image_url'] as const).map((k) => (
            <label key={k} className="block text-sm">
              <span className="font-medium">{k}</span>
              <input
                className="field-input mt-1"
                value={String(edit[k] ?? '')}
                onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="font-medium">bio</span>
            <textarea
              className="field-textarea mt-1"
              rows={5}
              value={edit.bio}
              onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">sort_order</span>
            <input
              className="field-input mt-1"
              type="number"
              value={edit.sort_order ?? 0}
              onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">上传头像</span>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                void uploadCmsImage(f, edit.name || 'avatar').then((a) => setEdit({ ...edit, image_url: a.public_url }))
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="tm-btn tm-btn-secondary" onClick={() => void save('draft')}>
              保存草稿
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
