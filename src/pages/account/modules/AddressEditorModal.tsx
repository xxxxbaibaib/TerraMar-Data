import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { haversineKm } from '../../../lib/geo'
import { useNearbyMapPois } from '../../../lib/geo/useNearbyMapPois'
import {
  buildJoinNetworkExtraPayload,
  joinPoiDisplayName,
  joinPoiSubtitle,
  type JoinNetworkPoiChoice,
} from '../../../lib/joinNetwork/poiChoice'
import {
  createUserShippingAddress,
  updateUserShippingAddress,
  type UserShippingAddressRow,
} from '../../../lib/account/userShippingAddresses'
import { useAuth } from '../../../lib/auth/AuthContext'

type UserGeo = { lat: number; lng: number; accuracyMeters?: number; capturedAt: string }

const MANUAL_POI_LABEL = '手动填写'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** 有值则为编辑 */
  initial: UserShippingAddressRow | null
}

export function AddressEditorModal({ open, onClose, onSaved, initial }: Props) {
  const { user } = useAuth()
  const [userGeo, setUserGeo] = useState<UserGeo | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selected, setSelected] = useState<JoinNetworkPoiChoice | null>(null)
  const nearby = useNearbyMapPois(userGeo)

  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [regionLine, setRegionLine] = useState('')
  const [detailLine, setDetailLine] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const mapNearbyChoices = useMemo((): JoinNetworkPoiChoice[] => {
    if (!userGeo) return []
    return nearby.pois.map((poi) => ({
      kind: 'map' as const,
      poi,
      distanceKm: haversineKm(userGeo.lat, userGeo.lng, poi.lat, poi.lng),
    }))
  }, [userGeo, nearby.pois])

  const resetForCreate = useCallback(() => {
    setUserGeo(null)
    setGeoError(null)
    setSelected(null)
    setRecipientName(user?.displayName?.trim() ?? '')
    setRecipientPhone(user?.profilePhone?.trim() ?? '')
    setRegionLine('')
    setDetailLine('')
    setIsDefault(false)
    setSubmitError(null)
  }, [user?.displayName, user?.profilePhone])

  const hydrateForEdit = useCallback((row: UserShippingAddressRow) => {
    setGeoError(null)
    setSubmitError(null)
    setRecipientName(row.recipient_name)
    setRecipientPhone(row.recipient_phone)
    setRegionLine(row.region_line)
    setDetailLine(row.detail_line)
    setIsDefault(row.is_default)
    if (row.latitude != null && row.longitude != null && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) {
      setUserGeo({
        lat: row.latitude,
        lng: row.longitude,
        capturedAt: row.updated_at,
      })
      setSelected({
        kind: 'map',
        poi: {
          id: `saved-${row.id}`,
          source: 'overpass',
          osmType: 'other',
          osmId: 0,
          name: row.poi_name?.trim() || '已选地点',
          lat: row.latitude,
          lng: row.longitude,
        },
        distanceKm: 0,
      })
    } else {
      setUserGeo(null)
      setSelected(null)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (initial) hydrateForEdit(initial)
    else resetForCreate()
  }, [open, initial, hydrateForEdit, resetForCreate])

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位。请使用支持地理位置的桌面或移动浏览器，并在 HTTPS 或 localhost 环境下打开。')
      setUserGeo(null)
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    setUserGeo(null)
    setSelected(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setGeoLoading(false)
      },
      (err) => {
        const map: Record<number, string> = {
          1: '您已拒绝定位授权，可在浏览器设置中开启后重试。',
          2: '暂时无法获取位置（设备不可用）。',
          3: '定位超时，请重试或在信号较好处操作。',
        }
        setGeoError(
          `${map[err.code] ?? '无法获取位置，请稍后重试。'} 若持续失败，请确认站点以 HTTPS 或 localhost 访问。`,
        )
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  const handleSelectPoi = (row: JoinNetworkPoiChoice) => {
    if (row.kind !== 'map') return
    setSelected(row)
    setDetailLine((prev) => (prev.trim() ? prev : `${joinPoiDisplayName(row)} 附近`))
    setSubmitError(null)
  }

  const clearSelectedPoi = () => {
    setSelected(null)
    setSubmitError(null)
  }

  const hasMapSelection =
    Boolean(userGeo) && selected?.kind === 'map' && Number.isFinite(selected.poi.lat) && Number.isFinite(selected.poi.lng)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setSubmitError('请填写收件人姓名与联系电话。')
      return
    }
    if (!regionLine.trim() && !detailLine.trim()) {
      setSubmitError('请填写省市区或详细地址。')
      return
    }

    let poiName: string | null
    let lat: number | null
    let lng: number | null
    let extra: Record<string, unknown> | null

    if (hasMapSelection && userGeo && selected?.kind === 'map') {
      poiName = joinPoiDisplayName(selected)
      lat = selected.poi.lat
      lng = selected.poi.lng
      extra = buildJoinNetworkExtraPayload(selected, userGeo).joinNetwork as Record<string, unknown>
    } else {
      poiName = MANUAL_POI_LABEL
      lat = null
      lng = null
      extra = null
    }

    setSubmitting(true)
    try {
      if (initial) {
        await updateUserShippingAddress(initial.id, {
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          region_line: regionLine.trim(),
          detail_line: detailLine.trim(),
          poi_name: poiName,
          latitude: lat,
          longitude: lng,
          location_extra: extra,
          is_default: isDefault,
        })
      } else {
        await createUserShippingAddress({
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          region_line: regionLine.trim(),
          detail_line: detailLine.trim(),
          poi_name: poiName,
          latitude: lat,
          longitude: lng,
          location_extra: extra,
          is_default: isDefault,
        })
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = initial ? '编辑收货地址' : '新增收货地址'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="addr-editor-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="addr-editor-title" className="font-serif text-xl font-semibold text-[var(--brand-deep)]">
            {title}
          </h2>
          <button type="button" className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-deep)]" onClick={onClose}>
            关闭
          </button>
        </div>

        <form className="mt-6 space-y-8" onSubmit={(e) => void onSubmit(e)}>
          <section className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-[var(--brand-deep)]">获取位置（可选）</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                用于检索周边地图 POI。定位仅在您的浏览器内完成；定位失败时可直接在下方填写地址并保存。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary text-sm" disabled={geoLoading} onClick={requestGeo}>
                {geoLoading ? '正在定位…' : userGeo ? '重新定位' : '获取我的位置'}
              </button>
              {!userGeo && !geoLoading ? (
                <span className="text-xs text-[var(--text-secondary)]">需 HTTPS 或 localhost，并允许浏览器位置权限</span>
              ) : null}
            </div>
            {geoError ? (
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800" role="alert">
                {geoError}
              </div>
            ) : null}
            {userGeo ? (
              <p className="rounded-lg border border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.95)] px-3 py-2 text-sm text-[var(--brand-deep)]">
                已获取：纬度 <span className="tabular-nums">{Math.round(userGeo.lat * 1e6) / 1e6}</span> · 经度{' '}
                <span className="tabular-nums">{Math.round(userGeo.lng * 1e6) / 1e6}</span>
                {typeof userGeo.accuracyMeters === 'number' ? (
                  <span className="text-[var(--text-secondary)]">（精度约 {Math.round(userGeo.accuracyMeters)} m）</span>
                ) : null}
              </p>
            ) : null}

            {userGeo ? (
              <div className="space-y-4 border-t border-[rgba(47,79,58,0.1)] pt-6">
                <h3 className="text-base font-semibold text-[var(--brand-deep)]">周边地图兴趣点</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  来自 OpenStreetMap（约 1 km）；可选配置 <span className="font-mono text-xs">VITE_GEOAPIFY_API_KEY</span> 使用 Geoapify。
                </p>
                {nearby.status === 'loading' ? <p className="text-sm text-[var(--text-secondary)]">正在加载周边地点…</p> : null}
                {nearby.status === 'error' ? (
                  <p className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">
                    地图兴趣点加载失败：{nearby.errorMessage}
                  </p>
                ) : null}
                {mapNearbyChoices.length > 0 ? (
                  <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                    {mapNearbyChoices.map((row) => {
                      const label = joinPoiDisplayName(row)
                      const sub = joinPoiSubtitle(row)
                      const km = Math.round(row.distanceKm * 10) / 10
                      const isActive = selected?.kind === 'map' && row.kind === 'map' && selected.poi.id === row.poi.id
                      return (
                        <li key={row.kind === 'map' ? row.poi.id : row.node.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectPoi(row)}
                            className={`group flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition hover:border-[var(--brand-deep)] ${
                              isActive
                                ? 'border-[var(--brand-deep)] bg-[rgba(47,79,58,0.08)]'
                                : 'border-[rgba(47,79,58,0.14)] bg-[rgba(255,251,245,0.98)]'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-[var(--brand-deep)]">{label}</span>
                              {sub ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">{sub}</span> : null}
                            </span>
                            <span className="shrink-0 rounded-full bg-[rgba(47,79,58,0.1)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--brand-deep)]">
                              {km} km
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : nearby.status === 'ready' ? (
                  <p className="text-sm text-[var(--text-secondary)]">此范围内未检索到带名称的地点，请尝试重新定位，或直接填写下方地址。</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-[rgba(47,79,58,0.12)] pt-8">
            {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
            <p className="text-sm text-[var(--text-secondary)]">
              已选地图点：
              <span className="font-medium text-[var(--brand-deep)]">
                {selected && selected.kind === 'map' ? joinPoiDisplayName(selected) : '未选择（可仅手写地址）'}
              </span>
              {selected ? (
                <button
                  type="button"
                  className="ml-3 text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline"
                  onClick={clearSelectedPoi}
                >
                  清除选点
                </button>
              ) : null}
            </p>
            <label className="tm-field">
              <span className="tm-field-label">收件人</span>
              <input className="tm-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
            </label>
            <label className="tm-field">
              <span className="tm-field-label">联系电话</span>
              <input className="tm-input" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} inputMode="tel" required />
            </label>
            <label className="tm-field">
              <span className="tm-field-label">省 / 市 / 区</span>
              <input className="tm-input" placeholder="例如：上海市 浦东新区" value={regionLine} onChange={(e) => setRegionLine(e.target.value)} />
            </label>
            <label className="tm-field">
              <span className="tm-field-label">详细地址</span>
              <input className="tm-input" placeholder="道路、门牌、楼层等" value={detailLine} onChange={(e) => setDetailLine(e.target.value)} />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-[rgba(47,79,58,0.3)]" />
              设为默认收货地址
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="btn-primary text-sm" disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </button>
              <button type="button" className="tm-btn tm-btn-secondary text-sm" onClick={onClose}>
                取消
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  )
}
