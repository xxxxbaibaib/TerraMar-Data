import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { SpeciesObservation } from '../../mock/map/mapTypes'
import { notifyFootprintSourcesChanged } from '../../lib/account/footprintSourcesEvent'
import { trackEvent } from '../../lib/analytics'
import { useAuth } from '../../lib/auth/AuthContext'
import type { CloudPrimaryRole } from '../../lib/auth/types'
import { isMockAuthMode } from '../../lib/supabase/env'
import { submitSpeciesObservationToSupabase } from '../../lib/map/speciesRecordsRemote'

interface MapUploadEntryProps {
  onSubmitSuccess: (observation: SpeciesObservation) => void
}

const MAX_DATA_URL_CHARS = 1_200_000

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function nowParts() {
  const d = new Date()
  return {
    year: String(d.getFullYear()),
    month: pad2(d.getMonth() + 1),
    day: pad2(d.getDate()),
    hour: pad2(d.getHours()),
  }
}

/** 由年、月、日、时（本地）生成 ISO 字符串；非法则返回 null */
function buildObservedIso(year: string, month: string, day: string, hour: string): string | null {
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  const h = parseInt(hour, 10)
  if (![y, m, d, h].every((n) => Number.isFinite(n))) return null
  if (m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23) return null
  const dt = new Date(y, m - 1, d, h, 0, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt.toISOString()
}

function observerTypeFromCloudRole(role: CloudPrimaryRole): SpeciesObservation['observerType'] {
  if (role === 'citizen_scientist') return 'research_partner'
  if (role === 'volunteer') return 'volunteer'
  return 'volunteer'
}

export function MapUploadEntry({ onSubmitSuccess }: MapUploadEntryProps) {
  const { user, isAuthenticated, recordSpeciesUploadContribution } = useAuth()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const init = nowParts()

  const [open, setOpen] = useState(false)
  const [speciesNameCn, setSpeciesNameCn] = useState('')
  const [topic, setTopic] = useState<SpeciesObservation['topic']>('birds')
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [day, setDay] = useState(init.day)
  const [hour, setHour] = useState(init.hour)
  const [lng, setLng] = useState('120.18')
  const [lat, setLat] = useState('30.25')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [photoHint, setPhotoHint] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setPhotoDataUrl(null)
    setPhotoFile(null)
    setPhotoName(null)
    setPhotoHint(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePhotoPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPhotoHint('请选择图片文件（JPEG/PNG/HEIC 等）。')
      trackEvent('species_upload_photo_invalid_type')
      return
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview)
    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
    setPhotoFile(file)
    setPhotoName(file.name)
    setPhotoDataUrl(null)
    setPhotoHint('正在加载图片…')

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return
      if (result.length <= MAX_DATA_URL_CHARS) {
        setPhotoDataUrl(result)
        setPhotoHint(null)
      } else {
        setPhotoDataUrl(null)
        setPhotoHint('图片较大，提交记录时不附带原图。')
      }
    }
    reader.onerror = () => {
      setPhotoDataUrl(null)
      setPhotoHint('无法读取图片数据。')
    }
    reader.readAsDataURL(file)
  }

  const fillBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint('当前浏览器不支持定位。')
      trackEvent('species_upload_browser_geo_fail', { reason: 'unsupported' })
      return
    }
    setGeoBusy(true)
    setGeoHint(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLng(String(Math.round(pos.coords.longitude * 1e6) / 1e6))
        setLat(String(Math.round(pos.coords.latitude * 1e6) / 1e6))
        setGeoBusy(false)
        setGeoHint('已填入您当前位置（浏览器定位）。')
        trackEvent('species_upload_browser_geo_success')
      },
      (err) => {
        setGeoBusy(false)
        const map: Record<number, string> = {
          1: '已拒绝定位，可在设置中开启后重试。',
          2: '暂时无法获取位置。',
          3: '定位超时，请重试。',
        }
        setGeoHint(map[err.code] ?? '无法获取位置，请手动填写或确认 HTTPS / localhost。')
        trackEvent('species_upload_browser_geo_fail', { code: err.code })
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    const observedIso = buildObservedIso(year, month, day, hour)
    if (!speciesNameCn.trim() || !observedIso) {
      setStatus('error')
      trackEvent('submit_species_mock_fail', { reason: 'required_missing' })
      return
    }

    const lngNum = Number(lng)
    const latNum = Number(lat)
    if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) {
      setStatus('error')
      trackEvent('submit_species_mock_fail', { reason: 'coords_invalid' })
      return
    }

    const observerType =
      isAuthenticated && user
        ? observerTypeFromCloudRole(user.primaryRole)
        : 'volunteer'

    const useRemote = !isMockAuthMode()

    if (useRemote) {
      if (!isAuthenticated || !user) {
        setStatus('error')
        setSubmitError('已连接 Supabase 时须先登录，物种记录将写入数据库与 Storage。')
        trackEvent('submit_species_remote_fail', { reason: 'not_authenticated' })
        return
      }
      setSubmitBusy(true)
      try {
        const { id } = await submitSpeciesObservationToSupabase({
          speciesNameCn: speciesNameCn.trim(),
          topic,
          observedAt: observedIso,
          lat: latNum,
          lng: lngNum,
          imageFile: photoFile,
        })
        const observation: SpeciesObservation = {
          id,
          speciesNameCn: speciesNameCn.trim(),
          topic,
          observedAt: observedIso,
          location: {
            id: `loc-${id}`,
            lng: lngNum,
            lat: latNum,
          },
          observerUserId: user.id,
          observerType,
          verificationStatus: 'pending_review',
          ...(photoDataUrl ? { imageUrl: photoDataUrl } : {}),
        }
        const key = 'terramar_species_mock_records'
        const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as SpeciesObservation[]
        localStorage.setItem(key, JSON.stringify([observation, ...existing]))
        notifyFootprintSourcesChanged()
        onSubmitSuccess(observation)
        if (user.membershipType === 'individual') {
          void recordSpeciesUploadContribution(1)
        }
        setStatus('success')
        setSpeciesNameCn('')
        const next = nowParts()
        setYear(next.year)
        setMonth(next.month)
        setDay(next.day)
        setHour(next.hour)
        setGeoHint(null)
        clearPhoto()
        trackEvent('submit_species_remote', {
          topic,
          hasImage: Boolean(photoFile),
          membershipType: user.membershipType,
          primaryRole: user.primaryRole,
        })
      } catch (e) {
        setStatus('error')
        setSubmitError(e instanceof Error ? e.message : '提交失败，请稍后重试。')
        trackEvent('submit_species_remote_fail', { reason: 'exception' })
      } finally {
        setSubmitBusy(false)
      }
      return
    }

    const observation: SpeciesObservation = {
      id: `obs-${Date.now()}`,
      speciesNameCn: speciesNameCn.trim(),
      topic,
      observedAt: observedIso,
      location: {
        id: `loc-${Date.now()}`,
        lng: lngNum,
        lat: latNum,
      },
      ...(isAuthenticated && user ? { observerUserId: user.id } : {}),
      observerType,
      verificationStatus: 'pending_review',
      ...(photoDataUrl ? { imageUrl: photoDataUrl } : {}),
    }

    const key = 'terramar_species_mock_records'
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as SpeciesObservation[]
    localStorage.setItem(key, JSON.stringify([observation, ...existing]))
    notifyFootprintSourcesChanged()
    onSubmitSuccess(observation)
    if (isAuthenticated && user?.membershipType === 'individual') {
      void recordSpeciesUploadContribution(1)
    }
    setStatus('success')
    setSpeciesNameCn('')
    const next = nowParts()
    setYear(next.year)
    setMonth(next.month)
    setDay(next.day)
    setHour(next.hour)
    setGeoHint(null)
    clearPhoto()
    trackEvent('submit_species_mock', {
      topic,
      hasImage: Boolean(photoDataUrl),
      loggedIn: isAuthenticated,
      membershipType: user?.membershipType,
      primaryRole: user?.primaryRole,
    })
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-black/25 p-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            const next = !prev
            if (!next) {
              setStatus('idle')
              setSubmitError(null)
            }
            return next
          })
          trackEvent('open_species_upload')
        }}
        className="rounded-[999px] border border-white/50 bg-white/20 px-3 py-2 text-xs text-white hover:bg-white/30"
      >
        上传物种记录
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 grid gap-2 text-xs text-white">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handlePhotoPick}
          />
          <label
            htmlFor={fileInputId}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/40 bg-black/20 px-3 py-4 text-center text-white/90 hover:border-white/60 hover:bg-black/30"
          >
            <span className="text-[11px] font-medium">点击选择照片</span>
            <span className="text-[10px] text-white/65">支持 JPEG / PNG 等常见格式</span>
          </label>
          {photoName ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-2 py-1.5">
              <span className="max-w-[200px] truncate text-[11px] text-white/85" title={photoName}>
                {photoName}
              </span>
              <button type="button" onClick={clearPhoto} className="text-[11px] text-rose-200 underline-offset-2 hover:underline">
                清除
              </button>
            </div>
          ) : null}
          {photoPreview ? (
            <div className="overflow-hidden rounded-lg border border-white/25">
              <img src={photoPreview} alt="" className="max-h-32 w-full object-cover" />
            </div>
          ) : null}
          {photoHint ? <p className="text-[11px] leading-snug text-white/75">{photoHint}</p> : null}

          <input
            value={speciesNameCn}
            onChange={(event) => setSpeciesNameCn(event.target.value)}
            placeholder="物种名称"
            className="h-9 rounded-lg border border-white/30 bg-black/25 px-2 text-white outline-none"
          />
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value as SpeciesObservation['topic'])}
            className="h-9 rounded-lg border border-white/30 bg-black/25 px-2 text-white outline-none"
          >
            <option value="birds">鸟类</option>
            <option value="insects">昆虫</option>
            <option value="plants">植物</option>
            <option value="mammals">哺乳动物</option>
          </select>
          <div className="rounded-lg border border-white/25 bg-black/15 p-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/55">观测时间（本地）</p>
            <div className="grid grid-cols-4 gap-1.5">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/55">年</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-8 w-full min-w-0 rounded border border-white/30 bg-black/30 px-1.5 text-center text-[11px] text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/55">月</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-8 w-full min-w-0 rounded border border-white/30 bg-black/30 px-1.5 text-center text-[11px] text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/55">日</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-8 w-full min-w-0 rounded border border-white/30 bg-black/30 px-1.5 text-center text-[11px] text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/55">时</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="h-8 w-full min-w-0 rounded border border-white/30 bg-black/30 px-1.5 text-center text-[11px] text-white outline-none"
                />
              </label>
            </div>
            <p className="mt-1 text-[10px] text-white/50">24 小时制；分钟默认 00</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={lng} onChange={(event) => setLng(event.target.value)} placeholder="经度" className="h-9 rounded-lg border border-white/30 bg-black/25 px-2 text-white outline-none" />
            <input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="纬度" className="h-9 rounded-lg border border-white/30 bg-black/25 px-2 text-white outline-none" />
          </div>
          <button
            type="button"
            disabled={geoBusy}
            onClick={fillBrowserLocation}
            className="rounded-lg border border-white/45 bg-white/15 px-3 py-2 text-[11px] font-medium text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {geoBusy ? '正在定位…' : '一键填入当前位置'}
          </button>
          {geoHint ? <p className="text-[11px] leading-snug text-white/70">{geoHint}</p> : null}
          <button
            type="submit"
            disabled={submitBusy}
            className="rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-[#1f3328] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitBusy ? '提交中…' : isMockAuthMode() ? '提交（本地演示）' : '提交至数据库'}
          </button>
          {status === 'success' && (
            <p className="text-[#c4f5bd]">
              {isMockAuthMode()
                ? '提交成功，记录已加入待核验列表（本地）。'
                : '提交成功，记录已写入数据库，审核通过后将出现在科学地图叠加层。'}
            </p>
          )}
          {status === 'error' && (
            <p className="text-[#ffd3d3]">
              {submitError ??
                '请填写物种名称、合法的观测年月日与时，并检查经纬度格式。'}
            </p>
          )}
          <p className="text-[11px] text-white/70">请勿上传受保护物种敏感巢址精确位置。</p>
          {!isAuthenticated ? (
            <p className="text-[11px] text-amber-100/90">
              {isMockAuthMode()
                ? '登录山海云后提交可关联账户；公民科学家主身份下每次成功提交会计入物种记录条数（演示）。'
                : '已连接数据库：请先登录后再提交，记录将写入 platform_species_records，图片将上传至 Storage（species pictures 桶）。'}
            </p>
          ) : user?.membershipType === 'organization' ? (
            <p className="text-[11px] text-white/75">机构账号提交记录不累计个人贡献等级（演示）。</p>
          ) : user?.primaryRole === 'citizen_scientist' ? (
            <p className="text-[11px] text-emerald-100/95">
              当前为公民科学家：每次成功提交会计入「我的账户」物种记录条数并参与升级（演示）。
            </p>
          ) : (
            <p className="text-[11px] text-amber-100/90">
              当前主身份为{user?.primaryRole === 'visitor' ? '游客' : '志愿者'}
              ：物种上传仍保存至本地列表，但不计入公民科学家轨；请在「我的账户」切换为公民科学家后再提交以累计条数（演示）。
            </p>
          )}
        </form>
      )}
    </div>
  )
}
