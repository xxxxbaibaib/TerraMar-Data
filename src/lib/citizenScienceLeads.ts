/**
 * 科研与公民科学登记独立存储（与 terramar_leads、山海云公益志愿库分离）。
 */

import { logPendingShanhaiyunIntegration } from './api/shanhaiyun'
import { notifyFootprintSourcesChanged } from './account/footprintSourcesEvent'

export const CITIZEN_SCIENCE_ENTRY = 'citizen_science'

export const citizenScienceJoinPath = `/join-network/personal?entry=${CITIZEN_SCIENCE_ENTRY}` as const

/** 公民科学登记 URL，须带 `science_project`（与 `mock/scienceProjects` 中 slug 一致） */
export function citizenScienceJoinPathWithProject(scienceProjectSlug: string): string {
  const q = new URLSearchParams({ entry: CITIZEN_SCIENCE_ENTRY, science_project: scienceProjectSlug })
  return `/join-network/personal?${q.toString()}`
}

export interface CitizenScienceLeadRecord {
  id: string
  sourcePath: string
  name: string
  contact: string
  message?: string
  createdAt: string
  extra?: Record<string, unknown>
}

const STORAGE_KEY = 'terramar_citizen_science_leads'

export function saveCitizenScienceLead(record: Omit<CitizenScienceLeadRecord, 'id' | 'createdAt'>) {
  logPendingShanhaiyunIntegration('citizen_science_leads')
  const next: CitizenScienceLeadRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const existing = getCitizenScienceLeads()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing]))
  notifyFootprintSourcesChanged()
  return next
}

export function getCitizenScienceLeads(): CitizenScienceLeadRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CitizenScienceLeadRecord[]
  } catch {
    return []
  }
}
