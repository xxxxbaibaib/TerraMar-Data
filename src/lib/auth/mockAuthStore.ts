import type { CloudJoinIntent } from '../joinRouting'
import type { CloudPrimaryRole, CloudSessionPayload, CloudUserRecord, MemberTaskProgressInLevel } from './types'
import { normalizeLoginKey } from './types'
import { computeLevelFromUser } from './levelPolicy'
import { memberLevelFromTotalPoints, MEMBER_POINTS_RULES } from '../account/memberTierTable'
import type { SpeciesObservation } from '../../mock/map/mapTypes'

const USERS_KEY = 'terramar_mock_cloud_users'
const SESSION_KEY = 'terramar_cloud_session_demo'
const SPECIES_MOCK_KEY = 'terramar_species_mock_records'

function resourceArticlePointsKey(userId: string) {
  return `terramar_resource_article_pts_v1_${userId}`
}

function readUsersRaw(): CloudUserRecord[] {
  const raw = localStorage.getItem(USERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CloudUserRecord[]
  } catch {
    return []
  }
}

function writeUsers(users: CloudUserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function emptyTaskProgress(): MemberTaskProgressInLevel {
  return { exploration: 0, welfare: 0, species: 0, resource: 0 }
}

/** 补齐新字段并保证统计为数字（兼容旧 localStorage） */
export function migrateUser(u: CloudUserRecord): CloudUserRecord {
  const totalPoints =
    typeof u.totalPoints === 'number' ? u.totalPoints : Math.max(0, Math.floor(u.levelPoints ?? 0))
  return {
    ...u,
    coursesCompletedCount: u.coursesCompletedCount ?? 0,
    resourceCoursesCompletedCount: u.resourceCoursesCompletedCount ?? 0,
    activitiesParticipatedCount: u.activitiesParticipatedCount ?? 0,
    volunteerHoursTotal: u.volunteerHoursTotal ?? 0,
    speciesRecordsSubmittedCount: u.speciesRecordsSubmittedCount ?? 0,
    totalPoints,
    taskProgressInLevel: u.taskProgressInLevel ?? emptyTaskProgress(),
    realName: u.realName ?? '',
    bio: u.bio ?? '',
    profilePhone: u.profilePhone ?? '',
    profileEmail: u.profileEmail ?? '',
  }
}

export function applyPointsAndTasks(
  m: CloudUserRecord,
  deltaPoints: number,
  taskDelta?: Partial<MemberTaskProgressInLevel>,
): Pick<CloudUserRecord, 'totalPoints' | 'taskProgressInLevel'> {
  const oldPts = Math.max(0, Math.floor(m.totalPoints ?? 0))
  const add = Math.floor(deltaPoints)
  const newPts = Math.max(0, oldPts + add)
  const oldLv = memberLevelFromTotalPoints(oldPts)
  const newLv = memberLevelFromTotalPoints(newPts)
  const base = m.taskProgressInLevel ?? emptyTaskProgress()
  if (newLv > oldLv) {
    return { totalPoints: newPts, taskProgressInLevel: emptyTaskProgress() }
  }
  const next: MemberTaskProgressInLevel = { ...base }
  if (taskDelta) {
    for (const k of ['exploration', 'welfare', 'species', 'resource'] as const) {
      const d = taskDelta[k] ?? 0
      if (d) next[k] = Math.min(2, Math.max(0, next[k] + d))
    }
  }
  return { totalPoints: newPts, taskProgressInLevel: next }
}

function syncComputedLevelInPlace(users: CloudUserRecord[], idx: number): CloudUserRecord {
  let u = migrateUser(users[idx])
  if (u.membershipType === 'individual') {
    const { level, levelPoints } = computeLevelFromUser(u)
    u = { ...u, level, levelPoints }
  }
  users[idx] = u
  return u
}

export function getSession(): CloudSessionPayload | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CloudSessionPayload
  } catch {
    return null
  }
}

export function setSession(payload: CloudSessionPayload | null) {
  if (!payload) {
    sessionStorage.removeItem(SESSION_KEY)
    return
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

export function findUserByLoginKey(loginKey: string): CloudUserRecord | undefined {
  const key = normalizeLoginKey(loginKey)
  const raw = readUsersRaw().find((u) => normalizeLoginKey(u.loginKey) === key)
  if (!raw) return undefined
  return findUserById(raw.id)
}

export function findUserById(id: string): CloudUserRecord | undefined {
  const users = readUsersRaw()
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) return undefined
  syncComputedLevelInPlace(users, idx)
  writeUsers(users)
  return users[idx]
}

export function primaryRoleForJoinIntent(
  joinIntent: CloudJoinIntent | undefined,
  membershipType: CloudUserRecord['membershipType'],
): CloudPrimaryRole {
  if (membershipType === 'organization') return 'visitor'
  if (!joinIntent || joinIntent === 'activity' || joinIntent === 'shanhai') return 'visitor'
  if (joinIntent === 'volunteer') return 'volunteer'
  if (joinIntent === 'citizen_science') return 'citizen_scientist'
  return 'visitor'
}

export function registerMockUser(input: {
  displayName: string
  loginKey: string
  password: string
  membershipType: CloudUserRecord['membershipType']
  orgName?: string
  joinIntent?: CloudJoinIntent | null
}): CloudUserRecord {
  const loginKey = normalizeLoginKey(input.loginKey)
  if (readUsersRaw().some((u) => normalizeLoginKey(u.loginKey) === loginKey)) {
    throw new Error('该手机号或邮箱已注册')
  }

  const primaryRole = primaryRoleForJoinIntent(input.joinIntent ?? undefined, input.membershipType)

  const base: CloudUserRecord = {
    id: crypto.randomUUID(),
    displayName: input.displayName.trim(),
    loginKey,
    password: input.password,
    membershipType: input.membershipType,
    orgName: input.membershipType === 'organization' ? input.orgName?.trim() || '未命名机构' : undefined,
    orgVerificationStatus: input.membershipType === 'organization' ? 'pending' : undefined,
    primaryRole,
    coursesCompletedCount: 0,
    resourceCoursesCompletedCount: 0,
    activitiesParticipatedCount: 0,
    volunteerHoursTotal: 0,
    speciesRecordsSubmittedCount: 0,
    totalPoints: 0,
    taskProgressInLevel: emptyTaskProgress(),
    level: 1,
    levelPoints: 0,
    realName: '',
    bio: '',
    profilePhone: '',
    profileEmail: '',
  }
  const { level, levelPoints } = computeLevelFromUser(base)
  const user: CloudUserRecord = { ...base, level, levelPoints }

  writeUsers([user, ...readUsersRaw()])
  return user
}

export function loginMockUser(loginKey: string, password: string): CloudUserRecord {
  const raw = readUsersRaw().find((u) => normalizeLoginKey(u.loginKey) === normalizeLoginKey(loginKey))
  if (!raw || raw.password !== password) {
    throw new Error('账号或密码不正确')
  }
  setSession({ userId: raw.id })
  return findUserById(raw.id) as CloudUserRecord
}

export function logoutMockUser() {
  setSession(null)
}

export function updateUserRecord(userId: string, patch: Partial<CloudUserRecord>) {
  const users = readUsersRaw()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) return
  users[idx] = migrateUser({ ...users[idx], ...patch } as CloudUserRecord)
  syncComputedLevelInPlace(users, idx)
  writeUsers(users)
}

export function setPrimaryRole(userId: string, role: CloudPrimaryRole) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  updateUserRecord(userId, { primaryRole: role })
}

export function incrementCoursesCompleted(userId: string, n = 1) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const pts = MEMBER_POINTS_RULES.explorationCoursePerSession * n
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { exploration: n })
  updateUserRecord(userId, {
    coursesCompletedCount: m.coursesCompletedCount + n,
    totalPoints,
    taskProgressInLevel,
  })
}

export function incrementResourceCoursesCompleted(userId: string, n = 1) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const pts = MEMBER_POINTS_RULES.resourceArticleComplete * n
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { resource: n })
  updateUserRecord(userId, {
    resourceCoursesCompletedCount: m.resourceCoursesCompletedCount + n,
    totalPoints,
    taskProgressInLevel,
  })
}

export function incrementActivitiesParticipated(userId: string, n = 1) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const pts = MEMBER_POINTS_RULES.welfareActivityParticipation * n
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { welfare: n })
  updateUserRecord(userId, {
    activitiesParticipatedCount: m.activitiesParticipatedCount + n,
    totalPoints,
    taskProgressInLevel,
  })
}

export function addVolunteerHours(userId: string, hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const pts = Math.round(hours * MEMBER_POINTS_RULES.volunteerHour)
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts)
  updateUserRecord(userId, {
    volunteerHoursTotal: m.volunteerHoursTotal + hours,
    totalPoints,
    taskProgressInLevel,
  })
}

export function incrementSpeciesRecordCount(userId: string, n = 1) {
  if (!Number.isFinite(n) || n <= 0) return
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const pts = MEMBER_POINTS_RULES.speciesRecord * n
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { species: n })
  updateUserRecord(userId, {
    speciesRecordsSubmittedCount: m.speciesRecordsSubmittedCount + n,
    totalPoints,
    taskProgressInLevel,
  })
}

/** 邀请好友成功（演示）：+5 分，不计入本级八类任务 */
export function recordSuccessfulFriendInvite(userId: string, n = 1) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  const m = migrateUser(u)
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, MEMBER_POINTS_RULES.inviteFriendSuccess * n)
  updateUserRecord(userId, { totalPoints, taskProgressInLevel })
}

/**
 * 资料单篇读到 100% 时调用一次：+10 分并记一条「资料中心」任务（每 slug 仅一次）。
 * @returns 是否本次实际发放
 */
export function tryAwardResourceArticleComplete(userId: string, slug: string): boolean {
  const key = resourceArticlePointsKey(userId)
  let slugs: string[]
  try {
    slugs = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  } catch {
    slugs = []
  }
  if (!Array.isArray(slugs)) slugs = []
  if (slugs.includes(slug)) return false

  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return false
  const m = migrateUser(u)
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, MEMBER_POINTS_RULES.resourceArticleComplete, {
    resource: 1,
  })
  updateUserRecord(userId, { totalPoints, taskProgressInLevel })
  slugs.push(slug)
  localStorage.setItem(key, JSON.stringify(slugs))
  return true
}

/** 按本地 mock 物种列表中 observerUserId 重算条数并写回 */
export function resyncSpeciesRecordCountFromLocalStorage(userId: string) {
  const u = readUsersRaw().find((x) => x.id === userId)
  if (!u || u.membershipType !== 'individual') return
  let list: SpeciesObservation[]
  try {
    list = JSON.parse(localStorage.getItem(SPECIES_MOCK_KEY) ?? '[]') as SpeciesObservation[]
  } catch {
    list = []
  }
  const n = list.filter((o) => o.observerUserId === userId).length
  const m = migrateUser(u)
  const old = m.speciesRecordsSubmittedCount
  const delta = n - old
  if (delta <= 0) {
    updateUserRecord(userId, { speciesRecordsSubmittedCount: n })
    return
  }
  const pts = MEMBER_POINTS_RULES.speciesRecord * delta
  const { totalPoints, taskProgressInLevel } = applyPointsAndTasks(m, pts, { species: delta })
  updateUserRecord(userId, { speciesRecordsSubmittedCount: n, totalPoints, taskProgressInLevel })
}
