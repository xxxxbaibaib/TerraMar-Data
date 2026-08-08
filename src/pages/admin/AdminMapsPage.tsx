import { useEffect, useState } from 'react'
import { listMapLocationsAdmin, upsertMapLocation, type MapLocationAdminRow } from '../../lib/cms/opsRemote'

export function AdminMapsPage() {
  const [page, setPage] = useState('programs')
  const [rows, setRows] = useState<MapLocationAdminRow[]>([])
  const [edit, setEdit] = useState<MapLocationAdminRow | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => setRows(await listMapLocationsAdmin(page))
  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [page])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-semibold text-[var(--brand-deep)]">地图点位</h2>
        {['programs', 'cooperation', 'impact', 'science'].map((p) => (
          <button key={p} type="button" className={`rounded-full px-3 py-1 text-sm ${page === p ? 'bg-[var(--brand-deep)] text-white' : 'bg-black/5'}`} onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-[var(--brand-deep)]">{r.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {r.id} · {r.lat}, {r.lng}
              </p>
            </div>
            <button type="button" className="text-[var(--brand-primary)]" onClick={() => setEdit({ ...r })}>
              编辑
            </button>
          </div>
        ))}
      </div>
      {edit ? (
        <div className="space-y-2 rounded-2xl border bg-[#fffaf2] p-4">
          {(['title', 'lat', 'lng', 'sort_order'] as const).map((k) => (
            <label key={k} className="block text-sm">
              {k}
              <input
                className="field-input mt-1"
                value={String(edit[k] ?? '')}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    [k]: k === 'title' ? e.target.value : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={() =>
                void upsertMapLocation(edit)
                  .then(() => {
                    setEdit(null)
                    setMsg('已保存')
                    return reload()
                  })
                  .catch((e) => setMsg(e instanceof Error ? e.message : '失败'))
              }
            >
              保存
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
