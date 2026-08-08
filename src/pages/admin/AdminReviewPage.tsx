import { useEffect, useState } from 'react'
import {
  listPendingGuides,
  listPendingSpecies,
  setGuideStatus,
  setSpeciesStatus,
  type GuideReviewRow,
  type SpeciesReviewRow,
} from '../../lib/cms/opsRemote'

export function AdminReviewPage() {
  const [species, setSpecies] = useState<SpeciesReviewRow[]>([])
  const [guides, setGuides] = useState<GuideReviewRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => {
    const [s, g] = await Promise.all([listPendingSpecies().catch(() => []), listPendingGuides().catch(() => [])])
    setSpecies(s)
    setGuides(g)
  }

  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--brand-deep)]">内容审核</h2>
      <section>
        <h3 className="font-medium text-[var(--brand-deep)]">待审物种记录</h3>
        <div className="mt-2 space-y-2">
          {species.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">暂无</p> : null}
          {species.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{r.common_name || r.scientific_name || r.id}</p>
                <p className="text-xs text-[var(--text-secondary)]">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={() => void setSpeciesStatus(r.id, 'approved').then(reload)}
                >
                  通过
                </button>
                <button
                  type="button"
                  className="tm-btn tm-btn-secondary"
                  onClick={() => void setSpeciesStatus(r.id, 'rejected').then(reload)}
                >
                  驳回
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-medium text-[var(--brand-deep)]">待审攻略</h3>
        <div className="mt-2 space-y-2">
          {guides.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">暂无</p> : null}
          {guides.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{r.title || r.id}</p>
                <p className="text-xs text-[var(--text-secondary)]">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="tm-btn tm-btn-primary" onClick={() => void setGuideStatus(r.id, 'approved').then(reload)}>
                  通过
                </button>
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => void setGuideStatus(r.id, 'rejected').then(reload)}>
                  驳回
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
