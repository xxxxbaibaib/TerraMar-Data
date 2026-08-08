import { useEffect, useState } from 'react'
import { listMediaAssets, uploadCmsImage } from '../../lib/cms/mediaRemote'
import type { MediaAssetRow } from '../../lib/cms/types'

export function AdminMediaPage() {
  const [rows, setRows] = useState<MediaAssetRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const reload = () => void listMediaAssets().then(setRows).catch((e) => setMsg(String(e.message ?? e)))

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--brand-deep)]">媒体库</h2>
      <label className="block text-sm">
        <span className="font-medium">上传图片</span>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            void uploadCmsImage(f)
              .then(() => {
                setMsg('上传成功')
                reload()
              })
              .catch((err) => setMsg(err instanceof Error ? err.message : '上传失败'))
          }}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {rows.map((r) => (
          <figure key={r.id} className="rounded-xl border border-[rgba(47,79,58,0.12)] p-2">
            {r.kind === 'image' ? (
              <img src={r.public_url} alt={r.alt} className="aspect-square w-full rounded-lg object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-lg bg-black/5 text-xs">video</div>
            )}
            <figcaption className="mt-2 break-all text-[11px] text-[var(--text-secondary)]">{r.public_url}</figcaption>
          </figure>
        ))}
      </div>
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
