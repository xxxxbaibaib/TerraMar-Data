import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../supabase/client'
import { MEMBER_POINTS_RULES } from '../account/memberTierTable'
import { applyPointsAndTasks, migrateUser } from './mockAuthStore'
import type { CloudPrimaryRole, CloudUserRecord } from './types'
import { cloudUserToProfileUpdate, mapProfileToCloudUser, type ProfileRow } from './profileMap'
import { computeLevelFromUser } from './levelPolicy'
import type { SpeciesObservation } from '../../mock/map/mapTypes'

const SPECIES_MOCK_KEY = 'terramar_species_mock_records'

async function loadCloudUser(userId: string, authUser: User): Promise<CloudUserRecord | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapProfileToCloudUser(data as ProfileRow, authUser)
}

async function persistCloudUser(userId: string, cloud: CloudUserRecord): Promise<CloudUserRecord> {
  const { level, levelPoints } = computeLevelFromUser(cloud)
  const next = { ...cloud, level, levelPoints }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('profiles').update(cloudUserToProfileUpdate(next)).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return next
}

export async function runProfileMutation(
  userId: string,
  authUser: User,
  mutator: (u: CloudUserRecord) => CloudUserRecord,
): Promise<CloudUserRecord | null> {
  const current = await loadCloudUser(userId, authUser)
  if (!current) {
    console.error('[TerraMar] runProfileMutation: 未找到 profiles 行，跳过更新。userId=', userId)
    return null
  }
  const migrated = migrateUser(current)
  const next = mutator(migrated)
  return persistCloudUser(userId, next)
}

export async function remoteIncrementCoursesCompleted(userId: string, authUser: User, n = 1) {
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const pts = MEMBER_POINTS_RULES.explorationCoursePerSession * n
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { exploration: n })
    return {
      ...m,
      coursesCompletedCount: m.coursesCompletedCount + n,
      totalPoints,
      taskProgressInLevel,
    }
  })
}

export async function remoteIncrementResourceCoursesCompleted(userId: string, authUser: User, n = 1) {
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const pts = MEMBER_POINTS_RULES.resourceArticleComplete * n
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { resource: n })
    return {
      ...m,
      resourceCoursesCompletedCount: m.resourceCoursesCompletedCount + n,
      totalPoints,
      taskProgressInLevel,
    }
  })
}

export async function remoteIncrementActivitiesParticipated(userId: string, authUser: User, n = 1) {
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const pts = MEMBER_POINTS_RULES.welfareActivityParticipation * n
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { welfare: n })
    return {
      ...m,
      activitiesParticipatedCount: m.activitiesParticipatedCount + n,
      totalPoints,
      taskProgressInLevel,
    }
  })
}

export async function remoteAddVolunteerHours(userId: string, authUser: User, hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return null
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const pts = Math.round(hours * MEMBER_POINTS_RULES.volunteerHour)
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts)
    return {
      ...m,
      volunteerHoursTotal: m.volunteerHoursTotal + hours,
      totalPoints,
      taskProgressInLevel,
    }
  })
}

export async function remoteIncrementSpeciesRecordCount(userId: string, authUser: User, n = 1) {
  if (!Number.isFinite(n) || n <= 0) return null
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const pts = MEMBER_POINTS_RULES.speciesRecord * n
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { species: n })
    return {
      ...m,
      speciesRecordsSubmittedCount: m.speciesRecordsSubmittedCount + n,
      totalPoints,
      taskProgressInLevel,
    }
  })
}

export async function remoteRecordFriendInvite(userId: string, authUser: User, n = 1) {
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, MEMBER_POINTS_RULES.inviteFriendSuccess * n)
    return { ...m, totalPoints, taskProgressInLevel }
  })
}

export async function remoteSetPrimaryRole(userId: string, authUser: User, role: CloudPrimaryRole) {
  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    return { ...m, primaryRole: role }
  })
}

export type AccountProfilePatch = {
  displayName?: string
  realName?: string
  bio?: string
  profilePhone?: string
  profileEmail?: string
}

/** 个人资料页：昵称、真实姓名、简介、业务联系手机/邮箱（写入 `profiles`） */
export async function remoteSaveAccountProfile(
  userId: string,
  authUser: User,
  patch: AccountProfilePatch,
): Promise<CloudUserRecord | null> {
  return runProfileMutation(userId, authUser, (m) => ({
    ...m,
    displayName: patch.displayName !== undefined ? patch.displayName.trim() || m.displayName : m.displayName,
    realName: patch.realName !== undefined ? patch.realName.trim() : m.realName,
    bio: patch.bio !== undefined ? patch.bio.trim().slice(0, 200) : m.bio,
    profilePhone: patch.profilePhone !== undefined ? patch.profilePhone.trim() : m.profilePhone,
    profileEmail: patch.profileEmail !== undefined ? patch.profileEmail.trim().toLowerCase() : m.profileEmail,
  }))
}

export async function remoteResyncSpeciesFromLocalStorage(userId: string, authUser: User) {
  let list: SpeciesObservation[]
  try {
    list = JSON.parse(localStorage.getItem(SPECIES_MOCK_KEY) ?? '[]') as SpeciesObservation[]
  } catch {
    list = []
  }
  if (!Array.isArray(list)) list = []
  const n = list.filter((o) => o.observerUserId === userId).length

  return runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const old = m.speciesRecordsSubmittedCount
    const delta = n - old
    if (delta <= 0) {
      return { ...m, speciesRecordsSubmittedCount: n }
    }
    const pts = MEMBER_POINTS_RULES.speciesRecord * delta
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { species: delta })
    return { ...m, speciesRecordsSubmittedCount: n, totalPoints, taskProgressInLevel }
  })
}

function resourceArticlePointsKey(userId: string) {
  return `terramar_resource_article_pts_v1_${userId}`
}

/** 与 mock `tryAwardResourceArticleComplete` 一致：每 slug 仅发一次分，去重键存 localStorage */
export async function remoteTryAwardResourceArticleComplete(
  userId: string,
  authUser: User,
  slug: string,
): Promise<boolean> {
  const key = resourceArticlePointsKey(userId)
  let slugs: string[]
  try {
    slugs = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  } catch {
    slugs = []
  }
  if (!Array.isArray(slugs)) slugs = []
  if (slugs.includes(slug)) return false

  const next = await runProfileMutation(userId, authUser, (m) => {
    if (m.membershipType !== 'individual') return m
    const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, MEMBER_POINTS_RULES.resourceArticleComplete, {
      resource: 1,
    })
    return { ...m, totalPoints, taskProgressInLevel }
  })
  if (!next) return false
  slugs.push(slug)
  localStorage.setItem(key, JSON.stringify(slugs))
  return true
}

export async function ensureProfileRow(authUser: User): Promise<CloudUserRecord> {
  const supabase = getSupabaseClient()
  const { data: row, error } = await supabase.from('profiles').select('*').eq('user_id', authUser.id).maybeSingle()
  if (error) throw new Error(error.message)
  if (row) return mapProfileToCloudUser(row as ProfileRow, authUser)

  const meta = (authUser.user_metadata ?? {}) as Record<string, string>
  const ins = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.id,
      display_name: meta.display_name?.trim() || authUser.email || '用户',
      membership_type: (meta.membership_type as 'individual' | 'organization') || 'individual',
      primary_role: (meta.primary_role as CloudPrimaryRole) || 'visitor',
      org_name: meta.org_name?.trim() || null,
      org_verification_status:
        meta.membership_type === 'organization' ? ('pending' as const) : null,
    })
    .select('*')
    .single()

  if (ins.error) throw new Error(ins.error.message)
  return mapProfileToCloudUser(ins.data as ProfileRow, authUser)
}
