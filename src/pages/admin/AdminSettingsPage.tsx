import { useEffect, useState } from 'react'
import { fetchSiteSettings, saveSiteSettings } from '../../lib/cms/siteContent'
import { uploadCmsImage } from '../../lib/cms/mediaRemote'
import type { SiteSettingsRow } from '../../lib/cms/types'

export function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettingsRow | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchSiteSettings().then(setForm)
  }, [])

  if (!form) return <p className="text-sm text-[var(--text-secondary)]">加载中…</p>

  const set = (key: keyof SiteSettingsRow, value: string) => setForm({ ...form, [key]: value })

  const onSave = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const saved = await saveSiteSettings(form)
      setForm(saved)
      setMsg('已保存，官网页脚将立即使用新内容。')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const onLogo = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const asset = await uploadCmsImage(file, '站点 Logo')
      setForm({ ...form, logo_url: asset.public_url })
      setMsg('Logo 已上传，请再点保存。')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--brand-deep)]">站点设置</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ['brand_name', '品牌名称'],
            ['tagline', '标语'],
            ['service_region', '服务区域'],
            ['phone', '手机'],
            ['wechat', '微信'],
            ['email', '邮箱'],
            ['business_email', '商务邮箱'],
            ['logo_url', 'Logo URL'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="font-medium text-[var(--brand-deep)]">{label}</span>
            <input
              className="field-input mt-1"
              value={String(form[key] ?? '')}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="block text-sm">
        <span className="font-medium text-[var(--brand-deep)]">上传 Logo</span>
        <input className="mt-1 block w-full text-sm" type="file" accept="image/*" onChange={(e) => void onLogo(e.target.files?.[0] ?? null)} />
      </label>
      {form.logo_url ? <img src={form.logo_url} alt="logo preview" className="h-16 w-16 rounded-full bg-white object-contain" /> : null}
      <button type="button" className="tm-btn tm-btn-primary" disabled={busy} onClick={() => void onSave()}>
        保存
      </button>
      {msg ? <p className="text-sm text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  )
}
