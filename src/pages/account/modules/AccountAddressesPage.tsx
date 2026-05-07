import { useCallback, useEffect, useState } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'
import { useAuth } from '../../../lib/auth/AuthContext'
import { isMockAuthMode } from '../../../lib/supabase/env'
import {
  deleteUserShippingAddress,
  listUserShippingAddresses,
  MAX_SHIPPING_ADDRESSES,
  setDefaultUserShippingAddress,
  type UserShippingAddressRow,
} from '../../../lib/account/userShippingAddresses'
import { AddressEditorModal } from './AddressEditorModal'

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length < 7) return raw
  return `${d.slice(0, 3)}****${d.slice(-4)}`
}

function formatAddressLine(row: UserShippingAddressRow): string {
  const a = row.region_line.trim()
  const b = row.detail_line.trim()
  if (a && b) return `${a} ${b}`
  return a || b || '—'
}

export function AccountAddressesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<UserShippingAddressRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitial, setEditorInitial] = useState<UserShippingAddressRow | null>(null)

  const reload = useCallback(async () => {
    if (!user) {
      setList([])
      setLoading(false)
      return
    }
    setLoadError(null)
    setLoading(true)
    try {
      setList(await listUserShippingAddresses())
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const openCreate = () => {
    setEditorInitial(null)
    setEditorOpen(true)
  }

  const openEdit = (row: UserShippingAddressRow) => {
    setEditorInitial(row)
    setEditorOpen(true)
  }

  if (!user) return null

  return (
    <div>
      <AccountBreadcrumb current="地址簿" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">收货地址</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        最多 {MAX_SHIPPING_ADDRESSES} 条；数据保存在 Supabase「user_shipping_addresses」
        {isMockAuthMode() ? '（演示环境为浏览器本地）' : ''}，可与订单支付页联动。
      </p>

      {loadError ? <p className="mt-4 text-sm text-red-700">{loadError}</p> : null}

      <button
        type="button"
        className="btn-primary mt-6 inline-flex text-sm"
        onClick={openCreate}
        disabled={list.length >= MAX_SHIPPING_ADDRESSES}
      >
        新增地址
      </button>
      {list.length >= MAX_SHIPPING_ADDRESSES ? (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">已达上限，请删除或编辑现有地址。</p>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">加载中…</p> : null}

      {!loading ? (
        <ul className="mt-8 space-y-4">
          {list.map((a) => (
            <li
              key={a.id}
              className="card flex flex-col gap-3 p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {a.recipient_name} · {maskPhone(a.recipient_phone)}
                  {a.is_default ? (
                    <span className="ml-2 rounded-full bg-[rgba(47,79,58,0.12)] px-2 py-0.5 text-xs text-[var(--brand-deep)]">默认</span>
                  ) : null}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{formatAddressLine(a)}</p>
                {a.poi_name ? (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">地图点：{a.poi_name}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.is_default ? (
                  <button
                    type="button"
                    className="tm-btn tm-btn-secondary text-xs"
                    onClick={() => void setDefaultUserShippingAddress(a.id).then(() => reload())}
                  >
                    设为默认
                  </button>
                ) : null}
                <button type="button" className="tm-btn tm-btn-secondary text-xs" onClick={() => openEdit(a)}>
                  编辑
                </button>
                <button type="button" className="text-xs font-medium text-red-700 underline-offset-2 hover:underline" onClick={() => setConfirmId(a.id)}>
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && list.length === 0 && !loadError ? (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">暂无收货地址，点击「新增地址」添加。</p>
      ) : null}

      {confirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-sm rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl">
            <p className="text-sm text-[var(--text-primary)]">确定删除该地址？</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="tm-btn tm-btn-secondary text-sm" onClick={() => setConfirmId(null)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-[999px] bg-red-700 px-4 py-2 text-sm text-white"
                onClick={() => {
                  const id = confirmId
                  setConfirmId(null)
                  void deleteUserShippingAddress(id).then(() => reload())
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AddressEditorModal
        open={editorOpen}
        initial={editorInitial}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void reload()}
      />
    </div>
  )
}
