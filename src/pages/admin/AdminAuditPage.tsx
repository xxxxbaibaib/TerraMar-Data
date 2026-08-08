import { useEffect, useState } from 'react'
import { listCmsAudit } from '../../lib/cms/audit'
import type { CmsAuditRow } from '../../lib/cms/types'

export function AdminAuditPage() {
  const [rows, setRows] = useState<CmsAuditRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void listCmsAudit()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : '加载失败'))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--brand-deep)]">操作日志</h2>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-[rgba(47,79,58,0.1)] px-3 py-2">
            <p className="font-medium text-[var(--brand-deep)]">
              {r.action} · {r.entity}
              {r.entity_id ? ` · ${r.entity_id}` : ''}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{new Date(r.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
