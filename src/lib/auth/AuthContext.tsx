import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CloudJoinIntent } from '../joinRouting'
import type { CloudPrimaryRole, CloudUserRecord } from './types'
import { normalizeLoginKey } from './types'
import {
  addVolunteerHours,
  findUserById,
  getSession,
  incrementActivitiesParticipated,
  incrementCoursesCompleted,
  incrementResourceCoursesCompleted,
  incrementSpeciesRecordCount,
  loginMockUser,
  logoutMockUser,
  primaryRoleForJoinIntent,
  recordSuccessfulFriendInvite,
  registerMockUser,
  resyncSpeciesRecordCountFromLocalStorage,
  setPrimaryRole as persistPrimaryRole,
} from './mockAuthStore'
import { isMockAuthMode, logAuthBackendModeOnce } from '../supabase/env'
import { getSupabaseClient } from '../supabase/client'
import { resolveAuthUserForProfileWrites } from '../supabase/resolveAuthUserForProfileWrites'
import {
  ensureProfileRow,
  remoteAddVolunteerHours,
  remoteIncrementActivitiesParticipated,
  remoteIncrementCoursesCompleted,
  remoteIncrementResourceCoursesCompleted,
  remoteIncrementSpeciesRecordCount,
  remoteRecordFriendInvite,
  remoteResyncSpeciesFromLocalStorage,
  remoteSetPrimaryRole,
} from './profileRemoteUpdates'

/** Supabase 开启邮箱确认时无 session，但仍视为「注册成功」 */
export type RegisterResult = { status: 'logged_in' } | { status: 'awaiting_email'; email: string }

function userFacingSupabaseAuthError(error: { message: string; code?: string }): string {
  const { message, code } = error
  const m = message.trim()
  if (
    code === 'over_email_send_rate_limit' ||
    m.includes('邮件速率') ||
    /email\s+rate\s+limit|over_email_send_rate_limit/i.test(m)
  ) {
    return '邮箱发送过于频繁，请稍后再试'
  }
  return m
}

interface AuthContextValue {
  user: CloudUserRecord | null
  isAuthenticated: boolean
  login: (loginKey: string, password: string) => Promise<void>
  register: (input: {
    displayName: string
    loginKey: string
    password: string
    membershipType: CloudUserRecord['membershipType']
    orgName?: string
    joinIntent?: CloudJoinIntent | null
  }) => Promise<RegisterResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  recordSpeciesUploadContribution: (count?: number) => Promise<void>
  setPrimaryRole: (role: CloudPrimaryRole) => Promise<void>
  recordCourseCompleted: (n?: number) => Promise<boolean>
  recordResourceCourseCompleted: (n?: number) => Promise<void>
  recordActivityParticipated: (n?: number) => Promise<boolean>
  addVolunteerHoursDemo: (hours: number) => Promise<void>
  syncSpeciesRecordsFromLocalStorage: () => Promise<void>
  recordFriendInviteSuccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUserFromSession(): CloudUserRecord | null {
  const s = getSession()
  if (!s) return null
  return findUserById(s.userId) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mockMode = isMockAuthMode()
  const [user, setUser] = useState<CloudUserRecord | null>(() => (mockMode ? loadUserFromSession() : null))

  const refreshUser = useCallback(async () => {
    if (mockMode) {
      setUser(loadUserFromSession())
      return
    }
    const supabase = getSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) {
      setUser(null)
      return
    }
    try {
      setUser(await ensureProfileRow(session.user))
    } catch (e) {
      console.error(
        '[TerraMar] 无法加载 public.profiles（请确认已在 Supabase 执行 migrations，且 RLS 允许本人读写）:',
        e,
      )
      setUser(null)
    }
  }, [mockMode])

  useEffect(() => {
    logAuthBackendModeOnce()
    if (mockMode) {
      queueMicrotask(() => {
        setUser(loadUserFromSession())
      })
      return
    }
    queueMicrotask(() => {
      void refreshUser()
    })
    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        return
      }
      void ensureProfileRow(session.user)
        .then(setUser)
        .catch((e) => {
          console.error('[TerraMar] onAuthStateChange 加载 profiles 失败:', e)
          setUser(null)
        })
    })
    return () => subscription.unsubscribe()
  }, [mockMode, refreshUser])

  const login = useCallback(
    async (loginKey: string, password: string) => {
      if (mockMode) {
        const u = loginMockUser(loginKey, password)
        setUser(u)
        return
      }
      const key = normalizeLoginKey(loginKey)
      if (!key.includes('@')) {
        throw new Error('当前已连接 Supabase：请使用邮箱作为登录名')
      }
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({ email: key, password })
      if (error) {
        const msg =
          error.message.includes('Invalid login credentials') || error.message.includes('invalid')
            ? '账号或密码不正确'
            : userFacingSupabaseAuthError(error)
        throw new Error(msg)
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('登录成功但未取得会话，请刷新页面后重试。')
      }
      try {
        setUser(await ensureProfileRow(session.user))
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        console.error('[TerraMar] ensureProfileRow 失败:', e)
        throw new Error(
          `Supabase 已验证登录，但用户档案加载失败：${detail}。请打开 Supabase → SQL Editor，执行仓库内 supabase/migrations/20250506000000_p0_profiles_leads_orders.sql（需含 profiles 表与 RLS）。`,
        )
      }
    },
    [mockMode],
  )

  const register = useCallback(
    async (input: {
      displayName: string
      loginKey: string
      password: string
      membershipType: CloudUserRecord['membershipType']
      orgName?: string
      joinIntent?: CloudJoinIntent | null
    }) => {
      if (mockMode) {
        registerMockUser({
          displayName: input.displayName,
          loginKey: input.loginKey,
          password: input.password,
          membershipType: input.membershipType,
          orgName: input.orgName,
          joinIntent: input.joinIntent ?? undefined,
        })
        loginMockUser(input.loginKey, input.password)
        const s = getSession()
        setUser(s ? (findUserById(s.userId) ?? null) : null)
        return { status: 'logged_in' } satisfies RegisterResult
      }
      const email = normalizeLoginKey(input.loginKey)
      if (!email.includes('@')) {
        throw new Error('当前已连接 Supabase：请使用邮箱注册')
      }
      const supabase = getSupabaseClient()
      const primary_role = primaryRoleForJoinIntent(input.joinIntent ?? undefined, input.membershipType)
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            display_name: input.displayName.trim(),
            membership_type: input.membershipType,
            org_name: input.orgName ?? '',
            join_intent: input.joinIntent ?? '',
            primary_role,
          },
        },
      })
      if (error) throw new Error(userFacingSupabaseAuthError(error))
      if (!data.session) {
        if (data.user) {
          const addr = data.user.email ?? email
          return { status: 'awaiting_email', email: addr } satisfies RegisterResult
        }
        throw new Error('注册未返回会话，请稍后重试或检查 Auth 设置。')
      }
      if (!data.user) {
        throw new Error('注册未返回用户信息。')
      }
      try {
        setUser(await ensureProfileRow(data.user))
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        console.error('[TerraMar] 注册后 ensureProfileRow 失败:', e)
        throw new Error(
          `注册已成功，但写入/读取档案失败：${detail}。请在 SQL Editor 执行 supabase/migrations/20250506000000_p0_profiles_leads_orders.sql。`,
        )
      }
      return { status: 'logged_in' } satisfies RegisterResult
    },
    [mockMode],
  )

  const logout = useCallback(async () => {
    if (mockMode) {
      logoutMockUser()
      setUser(null)
      return
    }
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [mockMode])

  const recordSpeciesUploadContribution = useCallback(
    async (count = 1) => {
      if (!user) return
      if (mockMode) {
        const s = getSession()
        if (!s) return
        const u = findUserById(s.userId)
        if (!u || u.membershipType !== 'individual') return
        incrementSpeciesRecordCount(s.userId, count)
        setUser(findUserById(s.userId) ?? null)
        return
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) return
      const next = await remoteIncrementSpeciesRecordCount(user.id, au, count)
      if (next) setUser(next)
    },
    [user, mockMode],
  )

  const setPrimaryRole = useCallback(
    async (role: CloudPrimaryRole) => {
      if (!user) return
      if (mockMode) {
        const s = getSession()
        if (!s) return
        const u = findUserById(s.userId)
        if (!u || u.membershipType !== 'individual') return
        persistPrimaryRole(s.userId, role)
        setUser(findUserById(s.userId) ?? null)
        return
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) return
      const next = await remoteSetPrimaryRole(user.id, au, role)
      if (next) setUser(next)
    },
    [user, mockMode],
  )

  const recordCourseCompleted = useCallback(
    async (n = 1): Promise<boolean> => {
      if (!user) return false
      if (mockMode) {
        const s = getSession()
        if (!s) return false
        const u = findUserById(s.userId)
        if (!u || u.membershipType !== 'individual') return false
        incrementCoursesCompleted(s.userId, n)
        setUser(findUserById(s.userId) ?? null)
        return true
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) {
        console.error('[TerraMar] recordCourseCompleted: 未取得 auth user（getUser/getSession 均为空）')
        return false
      }
      try {
        const next = await remoteIncrementCoursesCompleted(user.id, au, n)
        if (!next) {
          console.error(
            '[TerraMar] recordCourseCompleted: profiles 更新未返回数据（可能无 profiles 行、非个人账号或 RLS 拒绝）。userId=',
            user.id,
          )
          return false
        }
        setUser(next)
        return true
      } catch (e) {
        console.error('[TerraMar] recordCourseCompleted: 远程更新失败', e)
        return false
      }
    },
    [user, mockMode],
  )

  const recordResourceCourseCompleted = useCallback(
    async (n = 1) => {
      if (!user) return
      if (mockMode) {
        const s = getSession()
        if (!s) return
        incrementResourceCoursesCompleted(s.userId, n)
        setUser(findUserById(s.userId) ?? null)
        return
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) return
      const next = await remoteIncrementResourceCoursesCompleted(user.id, au, n)
      if (next) setUser(next)
    },
    [user, mockMode],
  )

  const recordActivityParticipated = useCallback(
    async (n = 1): Promise<boolean> => {
      if (!user) return false
      if (mockMode) {
        const s = getSession()
        if (!s) return false
        const u = findUserById(s.userId)
        if (!u || u.membershipType !== 'individual') return false
        incrementActivitiesParticipated(s.userId, n)
        setUser(findUserById(s.userId) ?? null)
        return true
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) {
        console.error('[TerraMar] recordActivityParticipated: 未取得 auth user（getUser/getSession 均为空）')
        return false
      }
      try {
        const next = await remoteIncrementActivitiesParticipated(user.id, au, n)
        if (!next) {
          console.error(
            '[TerraMar] recordActivityParticipated: profiles 更新未返回数据（可能无 profiles 行或 RLS 拒绝）。userId=',
            user.id,
          )
          return false
        }
        setUser(next)
        return true
      } catch (e) {
        console.error('[TerraMar] recordActivityParticipated: 远程更新失败', e)
        return false
      }
    },
    [user, mockMode],
  )

  const addVolunteerHoursDemo = useCallback(
    async (hours: number) => {
      if (!user) return
      if (mockMode) {
        const s = getSession()
        if (!s) return
        addVolunteerHours(s.userId, hours)
        setUser(findUserById(s.userId) ?? null)
        return
      }
      const supabase = getSupabaseClient()
      const au = await resolveAuthUserForProfileWrites(supabase)
      if (!au) return
      const next = await remoteAddVolunteerHours(user.id, au, hours)
      if (next) setUser(next)
    },
    [user, mockMode],
  )

  const syncSpeciesRecordsFromLocalStorage = useCallback(async () => {
    if (!user) return
    if (mockMode) {
      const s = getSession()
      if (!s) return
      resyncSpeciesRecordCountFromLocalStorage(s.userId)
      setUser(findUserById(s.userId) ?? null)
      return
    }
    const supabase = getSupabaseClient()
    const au = await resolveAuthUserForProfileWrites(supabase)
    if (!au) return
    const next = await remoteResyncSpeciesFromLocalStorage(user.id, au)
    if (next) setUser(next)
  }, [user, mockMode])

  const recordFriendInviteSuccess = useCallback(async () => {
    if (!user) return
    if (mockMode) {
      const s = getSession()
      if (!s) return
      recordSuccessfulFriendInvite(s.userId, 1)
      setUser(findUserById(s.userId) ?? null)
      return
    }
    const supabase = getSupabaseClient()
    const au = await resolveAuthUserForProfileWrites(supabase)
    if (!au) return
    const next = await remoteRecordFriendInvite(user.id, au, 1)
    if (next) setUser(next)
  }, [user, mockMode])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
      recordSpeciesUploadContribution,
      setPrimaryRole,
      recordCourseCompleted,
      recordResourceCourseCompleted,
      recordActivityParticipated,
      addVolunteerHoursDemo,
      syncSpeciesRecordsFromLocalStorage,
      recordFriendInviteSuccess,
    }),
    [
      user,
      login,
      register,
      logout,
      refreshUser,
      recordSpeciesUploadContribution,
      setPrimaryRole,
      recordCourseCompleted,
      recordResourceCourseCompleted,
      recordActivityParticipated,
      addVolunteerHoursDemo,
      syncSpeciesRecordsFromLocalStorage,
      recordFriendInviteSuccess,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
