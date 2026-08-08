import { useEffect, useState } from 'react'
import { listLeadsAdmin, type LeadAdminRow } from '../../lib/cms/opsRemote'

export function AdminLeadsPage() {
  const [rows, setRows] = useState<LeadAdminRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void listLeadsAdmin()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : '加载失败'))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--brand-deep)]">线索</h2>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[var(--text-secondary)]">
              <th className="py-2 pr-3">时间</th>
              <th className="py-2 pr-3">类型</th>
              <th className="py-2 pr-3">姓名</th>
              <th className="py-2 pr-3">联系方式</th>
              <th className="py-2 pr-3">来源</th>
              <th className="py-2">留言</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-black/5 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 pr-3">{r.lead_type}</td>
                <td className="py-2 pr-3">{r.name}</td>
                <td className="py-2 pr-3">{r.contact}</td>
                <td className="py-2 pr-3">{r.source_path}</td>
                <td className="py-2 max-w-xs">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
