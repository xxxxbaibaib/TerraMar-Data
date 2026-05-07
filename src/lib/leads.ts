export type LeadType =
  | 'apply'
  | 'cooperation'
  | 'impact'
  | 'science'
  | 'subscribe'
  | 'network_personal'

export interface LeadRecord {
  id: string
  leadType: LeadType
  sourcePath: string
  name: string
  contact: string
  message?: string
  createdAt: string
  extra?: Record<string, unknown>
}

/** 与 public.leads 结构化列一致；写入 Supabase 时可选 */
export type LeadStructuredContact = {
  gender?: string | null
  age?: string | null
  education?: string | null
  phone?: string | null
  wechat?: string | null
  email?: string | null
  poi?: string | null
  /** 与 `public.leads.contact_address_detail` 对应 */
  addressDetail?: string | null
  longitude?: number | null
  latitude?: number | null
}

export type LeadSubmitPayload = Omit<LeadRecord, 'id' | 'createdAt'> & {
  structuredContact?: LeadStructuredContact | null
}

import { logPendingShanhaiyunIntegration } from './api/shanhaiyun'
import { notifyFootprintSourcesChanged } from './account/footprintSourcesEvent'
import { getSupabaseClient } from './supabase/client'
import { isMockAuthMode } from './supabase/env'

const STORAGE_KEY = 'terramar_leads'

function saveLeadLocal(record: LeadSubmitPayload): LeadRecord {
  logPendingShanhaiyunIntegration('leads')
  const { structuredContact: _sc, ...core } = record
  const next: LeadRecord = {
    ...core,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  const existing = getLeads()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing]))
  notifyFootprintSourcesChanged()
  return next
}

/** 写入线索：mock 模式走 localStorage；否则写入 Supabase 并镜像到 localStorage 供足迹等只读本地数据的模块使用 */
export async function submitLead(
  record: LeadSubmitPayload,
  opts?: { createdByUserId?: string | null },
): Promise<LeadRecord> {
  logPendingShanhaiyunIntegration('leads')
  if (isMockAuthMode()) {
    return saveLeadLocal(record)
  }

  if (!opts?.createdByUserId) {
    throw new Error('当前已连接数据库：提交线索需先登录后再试。')
  }

  const supabase = getSupabaseClient()
  const s = record.structuredContact
  const { data, error } = await supabase
    .from('leads')
    .insert({
      lead_type: record.leadType,
      source_path: record.sourcePath,
      name: record.name,
      contact: record.contact,
      message: record.message ?? null,
      extra: record.extra ?? null,
      created_by_user_id: opts?.createdByUserId ?? null,
      ...(s
        ? {
            contact_gender: s.gender ?? null,
            contact_age: s.age ?? null,
            contact_education: s.education ?? null,
            contact_phone: s.phone ?? null,
            contact_wechat: s.wechat ?? null,
            contact_email: s.email ?? null,
            contact_poi: s.poi ?? null,
            contact_address_detail: s.addressDetail ?? null,
            contact_longitude: s.longitude ?? null,
            contact_latitude: s.latitude ?? null,
          }
        : {}),
    })
    .select('id, created_at')
    .single()

  if (error) throw new Error(error.message)

  const row = data as { id: string; created_at: string }
  const next: LeadRecord = {
    ...record,
    id: row.id,
    createdAt: row.created_at,
  }
  const existing = getLeads()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing]))
  notifyFootprintSourcesChanged()
  return next
}

/** 合并更新本人线索的 `extra`（如志愿入口补写 `welfare_project_slug`） */
export async function mergeLeadExtraWelfareProjectSlug(
  leadId: string,
  createdByUserId: string,
  welfareProjectSlug: string,
): Promise<void> {
  if (isMockAuthMode()) return
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('extra')
    .eq('id', leadId)
    .eq('created_by_user_id', createdByUserId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return
  const prev =
    data.extra && typeof data.extra === 'object' && !Array.isArray(data.extra)
      ? (data.extra as Record<string, unknown>)
      : {}
  const nextExtra = { ...prev, welfare_project_slug: welfareProjectSlug }
  const { error: upErr } = await supabase
    .from('leads')
    .update({ extra: nextExtra })
    .eq('id', leadId)
    .eq('created_by_user_id', createdByUserId)
  if (upErr) throw new Error(upErr.message)
}

/** @deprecated 请使用 `submitLead`；仅 mock 模式下可同步调用 */
export function saveLead(record: LeadSubmitPayload): LeadRecord {
  if (!isMockAuthMode()) {
    throw new Error('saveLead 在 Supabase 模式下不可用，请改用 await submitLead(...)')
  }
  return saveLeadLocal(record)
}

export function getLeads(): LeadRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as LeadRecord[]
  } catch {
    return []
  }
}
