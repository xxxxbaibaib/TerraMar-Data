import { useEffect, useState } from 'react'
import { listHeroMediaAdmin, refreshHeroPublicUrls, uploadHeroVideo, saveHeroMedia } from '../../lib/cms/heroMediaRemote'
import type { HeroMediaRow } from '../../lib/cms/types'

export function AdminHeroesPage() {
  const [rows, setRows] = useState<HeroMediaRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => setRows(await listHeroMediaAdmin())
  useEffect(() => {
    void reload().catch((e) => setMsg(e instanceof Error ? e.message : '加载失败'))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-[var(--brand-deep)]">背景视频</h2>
        <button
          type="button"
          className="tm-btn tm-btn-secondary"
          onClick={() =>
            void refreshHeroPublicUrls()
              .then((n) => {
                setMsg(`已刷新 ${n} 条 public URL`)
                return reload()
              })
              .catch((e) => setMsg(e instanceof Error ? e.message : '失败'))
          }
        >
          刷新全部 public URL
        </button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">优先使用 Storage public URL，避免签名链接过期后需改 .env 并重新部署。</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.page_key} className="rounded-xl border border-[rgba(47,79,58,0.12)] p-3">
            <p className="font-semibold text-[var(--brand-deep)]">
              {r.label || r.page_key} <span className="text-xs font-normal">({r.page_key})</span>
            </p>
            <p className="mt-1 break-all text-xs text-[var(--text-secondary)]">{r.public_url || r.storage_path || '未配置'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="text-sm">
                上传替换
                <input
                  type="file"
                  accept="video/mp4,video/*"
                  className="mt-1 block text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    void uploadHeroVideo(r.page_key, f, r.label || r.page_key)
                      .then(() => {
                        setMsg(`${r.page_key} 已更新`)
                        return reload()
                      })
                      .catch((err) => setMsg(err instanceof Error ? err.message : '上传失败'))
                  }}
                />
              </label>
              <button
                type="button"
                className="tm-btn tm-btn-secondary self-end"
                onClick={() =>
                  void saveHeroMedia({
                    page_key: r.page_key,
                    label: r.label,
                    storage_bucket: r.storage_bucket,
                    storage_path: r.storage_path,
                    public_url: '',
                  })
                    .then(() => reload())
                    .then(() => setMsg(`${r.page_key} URL 已刷新`))
                }
              >
                仅刷新 URL
              </button>
            </div>
          </div>
        ))}
      </div>
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
