import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { trackEvent } from '../../lib/analytics'
import { useAuth } from '../../lib/auth/AuthContext'
import { submitLead, type LeadStructuredContact, type LeadType } from '../../lib/leads'
import { isMockAuthMode } from '../../lib/supabase/env'

export type CooperationUploadGeo = {
  lat: number
  lng: number
  accuracyMeters?: number
  capturedAt: string
}

/** `person`：姓名 + 联系方式；`organization`：机构名称、机构人数 + 联系方式（合作咨询等） */
export type LeadFormVariant = 'person' | 'organization'

interface LeadFormProps {
  leadType: LeadType
  sourcePath: string
  title: string
  submitEventSuccess: string
  submitEventFail: string
  extra?: Record<string, unknown>
  withPrivacyConsent?: boolean
  variant?: LeadFormVariant
  /** 为 false 时不渲染标题（由页面在旁侧等处展示），表单仍带 `aria-label={title}` */
  showTitle?: boolean
  /** 合作咨询：附件上传 + 浏览器定位；汇总写入 `extra.cooperationUpload` */
  captureLocationAndFiles?: boolean
  /** 若设置则覆盖默认说明文案（如加入网络页） */
  introOverride?: string
  /** 合作加入网络等：在管道 contact 之外写入经纬度与 POI 名称列 */
  structuredGeo?: { latitude: number; longitude: number; poiLabel?: string | null } | null
  /** 线索与 `onAfterLeadSubmit` 均成功完成后调用（用于宿主页切换为全页成功态等） */
  onSubmitSuccess?: () => void
  /** 线索写入成功后调用（如同步 `platform_co_building_units`）；失败不应阻断已成功写入的线索 */
  onAfterLeadSubmit?: (ctx: {
    leadType: LeadType
    sourcePath: string
    name: string
    contact: string
    message: string
    orgHeadcount: string
    phone: string
    wechat: string
    email: string
  }) => void | Promise<void>
}

export function LeadForm({
  leadType,
  sourcePath,
  title,
  submitEventSuccess,
  submitEventFail,
  extra,
  withPrivacyConsent = false,
  variant = 'person',
  showTitle = true,
  captureLocationAndFiles = false,
  introOverride,
  structuredGeo,
  onSubmitSuccess,
  onAfterLeadSubmit,
}: LeadFormProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [orgHeadcount, setOrgHeadcount] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)

  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([])
  const [geo, setGeo] = useState<CooperationUploadGeo | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const isOrg = variant === 'organization'

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位。')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setGeoLoading(false)
        trackEvent('cooperation_upload_geo_success', { sourcePath })
      },
      (err) => {
        const map: Record<number, string> = {
          1: '您已拒绝定位授权，可在浏览器设置中开启后重试。',
          2: '暂时无法获取位置（设备不可用）。',
          3: '定位超时，请重试或在信号较好处操作。',
        }
        setGeoError(map[err.code] ?? '无法获取位置，请稍后重试。')
        setGeoLoading(false)
        trackEvent('cooperation_upload_geo_fail', { sourcePath, code: err.code })
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const onFilesChange = (list: FileList | null) => {
    if (!list?.length) {
      setUploadedFileNames([])
      return
    }
    setUploadedFileNames(Array.from(list, (f) => f.name))
  }

  const clearUploadExtras = () => {
    setUploadedFileNames([])
    setGeo(null)
    setGeoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hasAnyContact = phone.trim() || wechat.trim() || email.trim()
    const orgOk = isOrg ? name.trim() && orgHeadcount.trim() : name.trim()
    if (!orgOk || !hasAnyContact || (withPrivacyConsent && !consent)) {
      setStatus('error')
      setSubmitErrorMessage(null)
      trackEvent(submitEventFail, { sourcePath, reason: 'required_fields_missing' })
      return
    }

    if (!isMockAuthMode() && !user) {
      setStatus('error')
      setSubmitErrorMessage('已连接 Supabase 时须先登录后再提交线索（RLS 要求 created_by_user_id = 当前用户）。')
      trackEvent(submitEventFail, { sourcePath, reason: 'not_authenticated' })
      return
    }

    const contact = isOrg
      ? [
          `机构人数:${orgHeadcount.trim()}`,
          `手机:${phone || '-'}`,
          `微信:${wechat || '-'}`,
          `邮箱:${email || '-'}`,
        ].join(' | ')
      : [`手机:${phone || '-'}`, `微信:${wechat || '-'}`, `邮箱:${email || '-'}`].join(' | ')

    const nextExtra: Record<string, unknown> = { ...(extra ?? {}) }
    if (captureLocationAndFiles) {
      const upload: Record<string, unknown> = {}
      if (geo) upload.geo = geo
      if (uploadedFileNames.length) upload.fileNames = [...uploadedFileNames]
      if (Object.keys(upload).length) nextExtra.cooperationUpload = upload
    }

    const structuredContact: LeadStructuredContact = {
      phone: phone.trim() || null,
      wechat: wechat.trim() || null,
      email: email.trim() || null,
      ...(isOrg ? { age: orgHeadcount.trim() || null } : {}),
      ...(structuredGeo
        ? {
            latitude: structuredGeo.latitude,
            longitude: structuredGeo.longitude,
            poi: structuredGeo.poiLabel?.trim() || null,
          }
        : {}),
    }

    setSubmitErrorMessage(null)
    try {
      await submitLead(
        {
          leadType,
          sourcePath,
          name: name.trim(),
          contact,
          message,
          extra: nextExtra,
          structuredContact,
        },
        { createdByUserId: user?.id ?? null },
      )
    } catch (e) {
      setStatus('error')
      setSubmitErrorMessage(e instanceof Error ? e.message : '提交失败，请稍后重试。')
      trackEvent(submitEventFail, { sourcePath, reason: 'submit_failed' })
      return
    }
    if (onAfterLeadSubmit) {
      try {
        await onAfterLeadSubmit({
          leadType,
          sourcePath,
          name: name.trim(),
          contact,
          message: message.trim(),
          orgHeadcount: orgHeadcount.trim(),
          phone: phone.trim(),
          wechat: wechat.trim(),
          email: email.trim(),
        })
      } catch (e) {
        console.warn('[TerraMar] onAfterLeadSubmit', e)
      }
    }
    setStatus('success')
    setSubmitErrorMessage(null)
    setName('')
    setOrgHeadcount('')
    setPhone('')
    setWechat('')
    setEmail('')
    setMessage('')
    clearUploadExtras()
    trackEvent(submitEventSuccess, { sourcePath, leadType })
    onSubmitSuccess?.()
  }

  const introDefault =
    variant === 'organization'
      ? '请留下贵机构名称、规模与对接方式，我们将在 1–3 个工作日内与您沟通合作需求。'
      : '留下你的联系方式，我们会把活动与自然通讯定向发送给你。'
  const introText = introOverride ?? introDefault

  const errorHint =
    variant === 'organization'
      ? withPrivacyConsent
        ? '请填写机构名称、机构人数与至少一种联系方式，并勾选隐私同意。'
        : '请填写机构名称、机构人数，并至少填写手机、微信或邮箱中的一项。'
      : withPrivacyConsent
        ? '请完成必填信息并勾选隐私同意。'
        : '请填写姓名，并至少填写手机、微信或邮箱中的一项。'

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={showTitle ? undefined : title}
      className="card card-hover space-y-4 bg-[linear-gradient(145deg,#fbf7ef,#efe7d9)] p-7"
    >
      {showTitle ? <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h3> : null}
      <p className="section-subtle">{introText}</p>
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        {isOrg ? '机构名称' : '姓名'}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field-input"
          placeholder={isOrg ? '请输入机构全称' : '请输入姓名'}
        />
      </label>
      {isOrg ? (
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          机构人数
          <input
            value={orgHeadcount}
            onChange={(event) => setOrgHeadcount(event.target.value)}
            className="field-input"
            placeholder="例如：20–50 人、约 200 人"
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        手机
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="field-input"
          placeholder="请输入手机号"
        />
      </label>
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        微信
        <input
          value={wechat}
          onChange={(event) => setWechat(event.target.value)}
          className="field-input"
          placeholder="请输入微信号"
        />
      </label>
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        邮箱
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field-input"
          placeholder="请输入邮箱地址"
        />
      </label>
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        备注（可选）
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="field-textarea"
          placeholder="输入你的需求或问题"
        />
      </label>
      {captureLocationAndFiles ? (
        <div className="space-y-3 border-t border-[rgba(47,79,58,0.12)] pt-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">资料上传与位置（可选）</p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            可附带方案、简介等文件；点击下方可记录当前大致坐标（需浏览器授权，仅随本条咨询一并保存）。
          </p>
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            上传文件
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="field-input cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[rgba(47,79,58,0.12)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--brand-deep)]"
              accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
              onChange={(e) => onFilesChange(e.target.files)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={geoLoading}
              onClick={requestGeo}
            >
              {geoLoading ? '正在定位…' : '获取当前位置'}
            </button>
          </div>
          <div
            className="rounded-xl border border-[rgba(47,79,58,0.1)] bg-[linear-gradient(145deg,#fbf7ef,#efe7d9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-[var(--brand-deep)]">上传信息</p>
            {geoError ? <p className="mt-2 text-sm text-rose-700">{geoError}</p> : null}
            {!geo && !geoError && uploadedFileNames.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">选择文件或获取位置后，将在此汇总。</p>
            ) : null}
            {geo ? (
              <dl className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--text-primary)]">纬度</dt>
                  <dd>{geo.lat.toFixed(6)}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--text-primary)]">经度</dt>
                  <dd>{geo.lng.toFixed(6)}</dd>
                </div>
                {geo.accuracyMeters != null ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-[var(--text-primary)]">精度（约）</dt>
                    <dd>{Math.round(geo.accuracyMeters)} m</dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--text-primary)]">采集时间</dt>
                  <dd>{new Date(geo.capturedAt).toLocaleString('zh-CN')}</dd>
                </div>
              </dl>
            ) : null}
            {uploadedFileNames.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">已选文件</p>
                <ul className="mt-1 list-inside list-disc text-sm text-[var(--text-secondary)]">
                  {uploadedFileNames.map((n, i) => (
                    <li key={`${n}-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <button type="submit" className="btn-primary mt-1 w-fit">
        提交
      </button>
      {withPrivacyConsent && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          我已阅读并同意隐私说明
        </label>
      )}
      {status === 'success' && <p className="text-sm text-[#4e7257]">已收到你的意向，我们会尽快与你联系。</p>}
      {status === 'error' && (
        <p className="text-sm text-rose-700">{submitErrorMessage ?? errorHint}</p>
      )}
    </form>
  )
}
