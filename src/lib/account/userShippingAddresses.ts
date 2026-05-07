import { getSupabaseClient } from '../supabase/client'
import { isMockAuthMode } from '../supabase/env'
import { getSession } from '../auth/mockAuthStore'

export type UserShippingAddressRow = {
  id: string
  user_id: string
  recipient_name: string
  recipient_phone: string
  region_line: string
  detail_line: string
  poi_name: string | null
  latitude: number | null
  longitude: number | null
  location_extra: Record<string, unknown> | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type ShippingAddressInput = {
  recipient_name: string
  recipient_phone: string
  region_line: string
  detail_line: string
  poi_name?: string | null
  latitude?: number | null
  longitude?: number | null
  location_extra?: Record<string, unknown> | null
  is_default?: boolean
}

export const MAX_SHIPPING_ADDRESSES = 20

const MOCK_LS_KEY = 'terramar_mock_shipping_addresses_v1'

/** PostgREST 在表未创建/未进 schema cache 时的英文报错，转为可操作的说明 */
function mapUserShippingAddressesError(raw: string): string {
  const lower = raw.toLowerCase()
  const looksLikeMissingTable =
    lower.includes('user_shipping_addresses') &&
    (lower.includes('schema cache') ||
      lower.includes('could not find') ||
      (lower.includes('relation') && lower.includes('does not exist')))
  if (looksLikeMissingTable) {
    return '云端尚未创建收货地址表 user_shipping_addresses。请在 terramar-website 目录对当前项目执行：supabase db push（或已在 Supabase Dashboard 的 SQL 中执行迁移文件 20250618120000_profile_account_fields_and_shipping_addresses.sql），再刷新页面重试。'
  }
  return raw
}

function throwFromSupabase(error: { message?: string } | null): never {
  throw new Error(mapUserShippingAddressesError(error?.message ?? '操作失败'))
}

function readMockStore(): Record<string, UserShippingAddressRow[]> {
  try {
    const raw = localStorage.getItem(MOCK_LS_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as Record<string, UserShippingAddressRow[]>
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function writeMockStore(store: Record<string, UserShippingAddressRow[]>) {
  localStorage.setItem(MOCK_LS_KEY, JSON.stringify(store))
}

function mockList(userId: string): UserShippingAddressRow[] {
  return readMockStore()[userId] ?? []
}

function setMockList(userId: string, rows: UserShippingAddressRow[]) {
  const store = readMockStore()
  store[userId] = rows
  writeMockStore(store)
}

async function requireUserId(): Promise<string> {
  if (isMockAuthMode()) {
    const s = getSession()
    if (!s?.userId) throw new Error('未登录')
    return s.userId
  }
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('未登录')
  return user.id
}

async function clearDefaultsRemote(userId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('user_shipping_addresses').update({ is_default: false }).eq('user_id', userId).eq('is_default', true)
  if (error) throwFromSupabase(error)
}

export async function listUserShippingAddresses(): Promise<UserShippingAddressRow[]> {
  const userId = await requireUserId()
  if (isMockAuthMode()) {
    return [...mockList(userId)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('user_shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throwFromSupabase(error)
  return (data ?? []) as UserShippingAddressRow[]
}

export async function createUserShippingAddress(input: ShippingAddressInput): Promise<UserShippingAddressRow> {
  const userId = await requireUserId()
  const list = isMockAuthMode() ? mockList(userId) : await listUserShippingAddresses()
  if (list.length >= MAX_SHIPPING_ADDRESSES) throw new Error(`最多保存 ${MAX_SHIPPING_ADDRESSES} 条收货地址`)

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const wantDefault = Boolean(input.is_default) || list.length === 0

  if (isMockAuthMode()) {
    let rows = [...mockList(userId)]
    if (wantDefault) rows = rows.map((r) => ({ ...r, is_default: false }))
    const row: UserShippingAddressRow = {
      id,
      user_id: userId,
      recipient_name: input.recipient_name.trim(),
      recipient_phone: input.recipient_phone.trim(),
      region_line: input.region_line.trim(),
      detail_line: input.detail_line.trim(),
      poi_name: input.poi_name?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_extra: input.location_extra ?? null,
      is_default: wantDefault,
      created_at: now,
      updated_at: now,
    }
    rows.push(row)
    setMockList(userId, rows)
    return row
  }

  const supabase = getSupabaseClient()
  if (wantDefault) await clearDefaultsRemote(userId)
  const insertPayload = {
    id,
    user_id: userId,
    recipient_name: input.recipient_name.trim(),
    recipient_phone: input.recipient_phone.trim(),
    region_line: input.region_line.trim(),
    detail_line: input.detail_line.trim(),
    poi_name: input.poi_name?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    location_extra: input.location_extra ?? null,
    is_default: wantDefault,
  }
  const { data, error } = await supabase.from('user_shipping_addresses').insert(insertPayload).select('*').single()
  if (error) throwFromSupabase(error)
  return data as UserShippingAddressRow
}

export async function updateUserShippingAddress(
  id: string,
  input: Partial<ShippingAddressInput> & { is_default?: boolean },
): Promise<UserShippingAddressRow> {
  const userId = await requireUserId()

  if (isMockAuthMode()) {
    const next = mockList(userId).map((r) => {
      if (r.id !== id) return r
      return {
        ...r,
        recipient_name: input.recipient_name !== undefined ? input.recipient_name.trim() : r.recipient_name,
        recipient_phone: input.recipient_phone !== undefined ? input.recipient_phone.trim() : r.recipient_phone,
        region_line: input.region_line !== undefined ? input.region_line.trim() : r.region_line,
        detail_line: input.detail_line !== undefined ? input.detail_line.trim() : r.detail_line,
        poi_name: input.poi_name !== undefined ? input.poi_name?.trim() || null : r.poi_name,
        latitude: input.latitude !== undefined ? input.latitude ?? null : r.latitude,
        longitude: input.longitude !== undefined ? input.longitude ?? null : r.longitude,
        location_extra: input.location_extra !== undefined ? input.location_extra ?? null : r.location_extra,
        is_default: input.is_default !== undefined ? input.is_default : r.is_default,
        updated_at: new Date().toISOString(),
      }
    })
    let rows = next
    if (input.is_default === true) {
      rows = rows.map((r) => ({ ...r, is_default: r.id === id }))
    }
    if (!rows.some((r) => r.is_default) && rows.length > 0) {
      rows = rows.map((r, i) => ({ ...r, is_default: i === 0 }))
    }
    setMockList(userId, rows)
    const row = rows.find((r) => r.id === id)
    if (!row) throw new Error('地址不存在')
    return row
  }

  const supabase = getSupabaseClient()
  if (input.is_default === true) await clearDefaultsRemote(userId)
  const patch: Record<string, unknown> = {}
  if (input.recipient_name !== undefined) patch.recipient_name = input.recipient_name.trim()
  if (input.recipient_phone !== undefined) patch.recipient_phone = input.recipient_phone.trim()
  if (input.region_line !== undefined) patch.region_line = input.region_line.trim()
  if (input.detail_line !== undefined) patch.detail_line = input.detail_line.trim()
  if (input.poi_name !== undefined) patch.poi_name = input.poi_name?.trim() || null
  if (input.latitude !== undefined) patch.latitude = input.latitude ?? null
  if (input.longitude !== undefined) patch.longitude = input.longitude ?? null
  if (input.location_extra !== undefined) patch.location_extra = input.location_extra ?? null
  if (input.is_default !== undefined) patch.is_default = input.is_default

  const { data, error } = await supabase.from('user_shipping_addresses').update(patch).eq('id', id).eq('user_id', userId).select('*').single()
  if (error) throwFromSupabase(error)
  return data as UserShippingAddressRow
}

export async function deleteUserShippingAddress(id: string): Promise<void> {
  const userId = await requireUserId()

  if (isMockAuthMode()) {
    const prev = mockList(userId)
    const hadDefault = prev.some((r) => r.id === id && r.is_default)
    let rows = prev.filter((r) => r.id !== id)
    if (hadDefault && rows.length > 0) {
      rows = rows.map((r, i) => ({ ...r, is_default: i === 0 }))
    }
    setMockList(userId, rows)
    return
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('user_shipping_addresses').delete().eq('id', id).eq('user_id', userId)
  if (error) throwFromSupabase(error)
  const rest = await listUserShippingAddresses()
  if (rest.length > 0 && !rest.some((r) => r.is_default)) {
    await setDefaultUserShippingAddress(rest[0].id)
  }
}

export async function setDefaultUserShippingAddress(id: string): Promise<void> {
  const userId = await requireUserId()
  if (isMockAuthMode()) {
    const rows = mockList(userId).map((r) => ({ ...r, is_default: r.id === id }))
    setMockList(userId, rows)
    return
  }
  const supabase = getSupabaseClient()
  await clearDefaultsRemote(userId)
  const { error } = await supabase.from('user_shipping_addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId)
  if (error) throwFromSupabase(error)
}
