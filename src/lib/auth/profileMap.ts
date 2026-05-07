import type { User } from '@supabase/supabase-js'
import type { CloudUserRecord, MemberTaskProgressInLevel } from './types'
import { normalizeLoginKey } from './types'
import { computeLevelFromUser } from './levelPolicy'

export type ProfileRow = {
  user_id: string
  display_name: string
  membership_type: 'individual' | 'organization'
  primary_role: 'visitor' | 'volunteer' | 'citizen_scientist'
  org_name: string | null
  org_verification_status: 'pending' | 'verified' | null
  total_points: number
  level: number
  task_progress: unknown
  courses_completed_count: number
  resource_courses_completed_count: number
  activities_participated_count: number
  volunteer_hours_total: string | number
  species_records_submitted_count: number
  real_name?: string | null
  bio?: string | null
  profile_phone?: string | null
  profile_email?: string | null
}

function emptyTaskProgress(): MemberTaskProgressInLevel {
  return { exploration: 0, welfare: 0, species: 0, resource: 0 }
}

function parseTaskProgress(raw: unknown): MemberTaskProgressInLevel {
  if (!raw || typeof raw !== 'object') return emptyTaskProgress()
  const o = raw as Record<string, unknown>
  return {
    exploration: Math.min(2, Math.max(0, Number(o.exploration) || 0)),
    welfare: Math.min(2, Math.max(0, Number(o.welfare) || 0)),
    species: Math.min(2, Math.max(0, Number(o.species) || 0)),
    resource: Math.min(2, Math.max(0, Number(o.resource) || 0)),
  }
}

export function mapProfileToCloudUser(profile: ProfileRow, authUser: User): CloudUserRecord {
  const email = authUser.email ?? ''
  const phone = authUser.phone ?? ''
  const loginKey = normalizeLoginKey(email || phone)

  const base: CloudUserRecord = {
    id: authUser.id,
    displayName: profile.display_name?.trim() || loginKey || '用户',
    loginKey,
    password: '',
    membershipType: profile.membership_type,
    orgName: profile.org_name ?? undefined,
    orgVerificationStatus: profile.org_verification_status ?? undefined,
    primaryRole: profile.primary_role,
    level: profile.level,
    totalPoints: profile.total_points,
    levelPoints: profile.total_points,
    taskProgressInLevel: parseTaskProgress(profile.task_progress),
    coursesCompletedCount: profile.courses_completed_count,
    resourceCoursesCompletedCount: profile.resource_courses_completed_count,
    activitiesParticipatedCount: profile.activities_participated_count,
    volunteerHoursTotal: Number(profile.volunteer_hours_total) || 0,
    speciesRecordsSubmittedCount: profile.species_records_submitted_count,
    realName: (profile.real_name ?? '').trim(),
    bio: (profile.bio ?? '').trim(),
    profilePhone: (profile.profile_phone ?? '').trim(),
    profileEmail: (profile.profile_email ?? '').trim(),
  }

  const { level, levelPoints } = computeLevelFromUser(base)
  return { ...base, level, levelPoints }
}

export function cloudUserToProfileUpdate(u: CloudUserRecord): Record<string, unknown> {
  return {
    display_name: u.displayName,
    membership_type: u.membershipType,
    primary_role: u.primaryRole,
    org_name: u.orgName ?? null,
    org_verification_status: u.orgVerificationStatus ?? null,
    total_points: u.totalPoints,
    level: u.level,
    task_progress: u.taskProgressInLevel ?? emptyTaskProgress(),
    courses_completed_count: u.coursesCompletedCount,
    resource_courses_completed_count: u.resourceCoursesCompletedCount,
    activities_participated_count: u.activitiesParticipatedCount,
    volunteer_hours_total: u.volunteerHoursTotal,
    species_records_submitted_count: u.speciesRecordsSubmittedCount,
    real_name: u.realName.trim() ? u.realName.trim() : null,
    bio: u.bio.trim() ? u.bio.trim().slice(0, 200) : null,
    profile_phone: u.profilePhone.trim() ? u.profilePhone.trim() : null,
    profile_email: u.profileEmail.trim() ? u.profileEmail.trim().toLowerCase() : null,
  }
}
