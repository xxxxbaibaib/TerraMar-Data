import type { CloudUserRecord } from '../auth/types'
import { normalizeLoginKey } from '../auth/types'
import type { MockCourseOrder } from '../../mock/accountOrders'
import { readProgramOrdersFromLocal } from './programOrdersStore'
import { ORDER_STATUS_LABEL } from './orderStatus'
import { getLeads, type LeadRecord } from '../leads'
import { getShanhaiyunVolunteerLeads } from '../shanhaiyunVolunteerLeads'
import { getCitizenScienceLeads } from '../citizenScienceLeads'
import { programs } from '../../mock/programs'
import type { SpeciesObservation } from '../../mock/map/mapTypes'

const SPECIES_KEY = 'terramar_species_mock_records'

export type FootprintItem = {
  id: string
  date: string
  kind: string
  title: string
  href: string
  sortAt: number
}

/** 线索 contact 字段是否可能属于当前登录用户（邮箱或手机号模糊匹配） */
export function contactMayMatchUser(contact: string, loginKey: string): boolean {
  const key = normalizeLoginKey(loginKey)
  if (!key) return false
  const c = contact.toLowerCase()
  if (key.includes('@')) return c.includes(key)
  const keyDigits = key.replace(/\D/g, '')
  if (keyDigits.length >= 7) {
    return contact.replace(/\D/g, '').includes(keyDigits)
  }
  return c.includes(key.toLowerCase())
}

function programTitleFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined
  return programs.find((p) => p.slug === slug)?.title
}

function slugFromProgramSourcePath(sourcePath: string): string | undefined {
  const m = /^\/programs\/([^/]+)$/.exec(sourcePath)
  return m?.[1]
}

function readSpeciesForUser(userId: string): SpeciesObservation[] {
  try {
    const list = JSON.parse(localStorage.getItem(SPECIES_KEY) ?? '[]') as SpeciesObservation[]
    if (!Array.isArray(list)) return []
    return list.filter((o) => o.observerUserId === userId)
  } catch {
    return []
  }
}

function leadFootprint(lead: LeadRecord, user: CloudUserRecord): FootprintItem | null {
  if (!contactMayMatchUser(lead.contact, user.loginKey)) return null
  const t = new Date(lead.createdAt).getTime()
  const day = lead.createdAt.slice(0, 10)

  switch (lead.leadType) {
    case 'apply': {
      const slug = (lead.extra?.programSlug as string | undefined) ?? slugFromProgramSourcePath(lead.sourcePath)
      const title = programTitleFromSlug(slug)
      return {
        id: `lead-apply-${lead.id}`,
        date: day,
        kind: '科考活动',
        title: title ? `报名意向 · ${title}` : `报名意向 · ${lead.sourcePath}`,
        href: slug ? `/programs/${slug}` : '/programs',
        sortAt: t,
      }
    }
    case 'cooperation':
      return {
        id: `lead-coop-${lead.id}`,
        date: day,
        kind: '合作共建',
        title: `合作咨询 · ${lead.name}`,
        href: '/cooperation',
        sortAt: t,
      }
    case 'network_personal':
      return {
        id: `lead-net-${lead.id}`,
        date: day,
        kind: '合作共建',
        title: `加入自然教育网络 · 个人登记（${lead.name}）`,
        href: '/join-network',
        sortAt: t,
      }
    case 'impact':
      return {
        id: `lead-impact-${lead.id}`,
        date: day,
        kind: '公益行动',
        title: `公益留资 · ${lead.name}`,
        href: '/impact',
        sortAt: t,
      }
    case 'science':
      return {
        id: `lead-sci-${lead.id}`,
        date: day,
        kind: '公民科学',
        title: `科研/公民科学留资 · ${lead.name}`,
        href: '/science',
        sortAt: t,
      }
    default:
      return null
  }
}

export function buildFootprintTimeline(
  user: CloudUserRecord,
  opts?: { programOrders?: MockCourseOrder[] },
): FootprintItem[] {
  const out: FootprintItem[] = []

  const orderList = opts?.programOrders ?? readProgramOrdersFromLocal(user.id)
  for (const o of orderList) {
    const t = new Date(o.createdAt).getTime()
    out.push({
      id: `order-${o.id}`,
      date: o.createdAt,
      kind: '科考活动',
      title: `${o.programTitle} · 订单（${ORDER_STATUS_LABEL[o.status]}）`,
      href: `/account/orders/${o.id}`,
      sortAt: Number.isFinite(t) ? t : 0,
    })
  }

  for (const lead of getLeads()) {
    const item = leadFootprint(lead, user)
    if (item) out.push(item)
  }

  for (const r of getShanhaiyunVolunteerLeads()) {
    if (!contactMayMatchUser(r.contact, user.loginKey)) continue
    const t = new Date(r.createdAt).getTime()
    out.push({
      id: `vol-${r.id}`,
      date: r.createdAt.slice(0, 10),
      kind: '公益行动',
      title: `山海云公益志愿登记 · ${r.name}`,
      href: '/impact',
      sortAt: t,
    })
  }

  for (const r of getCitizenScienceLeads()) {
    if (!contactMayMatchUser(r.contact, user.loginKey)) continue
    const t = new Date(r.createdAt).getTime()
    out.push({
      id: `cs-${r.id}`,
      date: r.createdAt.slice(0, 10),
      kind: '公民科学',
      title: `公民科学网络登记 · ${r.name}`,
      href: '/science',
      sortAt: t,
    })
  }

  for (const obs of readSpeciesForUser(user.id)) {
    const t = new Date(obs.observedAt).getTime()
    out.push({
      id: `obs-${obs.id}`,
      date: obs.observedAt.slice(0, 10),
      kind: '公民科学',
      title: `上传物种观察 · ${obs.speciesNameCn}`,
      href: '/science',
      sortAt: Number.isFinite(t) ? t : 0,
    })
  }

  out.sort((a, b) => b.sortAt - a.sortAt)
  return out
}

export function filterFootprintByYearMonth(
  items: FootprintItem[],
  year: string,
  month: string,
): FootprintItem[] {
  return items.filter((it) => {
    if (year !== 'all' && !it.date.startsWith(year)) return false
    if (month !== 'all') {
      const m = it.date.slice(5, 7)
      if (m !== month) return false
    }
    return true
  })
}
