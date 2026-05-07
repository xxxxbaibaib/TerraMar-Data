/**
 * 山海云公益志愿登记独立存储（与 terramar_leads 分离）。
 */

import { logPendingShanhaiyunIntegration } from './api/shanhaiyun'
import { notifyFootprintSourcesChanged } from './account/footprintSourcesEvent'

export const SHANHAIYUN_VOLUNTEER_ENTRY = 'shanhaiyun_volunteer'

export const shanhaiyunVolunteerJoinPath = `/join-network/personal?entry=${SHANHAIYUN_VOLUNTEER_ENTRY}` as const

/** 公益志愿登记 URL，须带 `welfare_project`（四项目 slug） */
export function shanhaiyunVolunteerJoinPathWithProject(welfareProjectSlug: string): string {
  const q = new URLSearchParams({ entry: SHANHAIYUN_VOLUNTEER_ENTRY, welfare_project: welfareProjectSlug })
  return `/join-network/personal?${q.toString()}`
}

export interface ShanhaiyunVolunteerLeadRecord {
  id: string
  sourcePath: string
  name: string
  contact: string
  message?: string
  createdAt: string
  extra?: Record<string, unknown>
}

const STORAGE_KEY = 'terramar_shanhaiyun_volunteer_leads'

export function saveShanhaiyunVolunteerLead(record: Omit<ShanhaiyunVolunteerLeadRecord, 'id' | 'createdAt'>) {
  logPendingShanhaiyunIntegration('shanhaiyun_volunteer_leads')
  const next: ShanhaiyunVolunteerLeadRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const existing = getShanhaiyunVolunteerLeads()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing]))
  notifyFootprintSourcesChanged()
  return next
}

export function getShanhaiyunVolunteerLeads(): ShanhaiyunVolunteerLeadRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ShanhaiyunVolunteerLeadRecord[]
  } catch {
    return []
  }
}
