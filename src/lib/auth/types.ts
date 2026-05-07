/** 与 PRD / API 契约一致的英文枚举；界面展示用中文映射 */
export type CloudPrimaryRole = 'visitor' | 'volunteer' | 'citizen_scientist'

export type CloudMembershipType = 'individual' | 'organization'

/** 当前等级内需完成的四类任务计数（各 0–2，升级后清零） */
export type MemberTaskProgressInLevel = {
  exploration: number
  welfare: number
  species: number
  resource: number
}

/** 演示用「山海云用户」快照（正式环境由服务端返回） */
export interface CloudUserRecord {
  id: string
  displayName: string
  /** 规范化登录键：邮箱小写或手机号数字串 */
  loginKey: string
  /** 演示环境明文存储，仅用于本地原型，禁止用于生产 */
  password: string
  membershipType: CloudMembershipType
  orgName?: string
  orgVerificationStatus?: 'pending' | 'verified'
  primaryRole: CloudPrimaryRole
  level: number
  /** 个人会员累计积分（演示）；机构账号可为 0 */
  totalPoints: number
  /** 当前主身份下「展示用等价分」，与贡献轨一致（见 levelPolicy） */
  levelPoints: number
  /** 当前等级内任务进度（演示） */
  taskProgressInLevel?: MemberTaskProgressInLevel
  /** 个人·游客轨：科考活动（自然教育营期/课程）侧已完成数（演示可手动 +1） */
  coursesCompletedCount: number
  /** 个人·游客轨：资源中心在线课程/学习单元完成数（与 coursesCompletedCount 合计参与等级计算） */
  resourceCoursesCompletedCount: number
  /** 已参加的自然教育活动次数（演示统计，可与订单/签到对齐） */
  activitiesParticipatedCount: number
  /** 个人·志愿者轨：累计时长（小时） */
  volunteerHoursTotal: number
  /** 个人·公民科学家轨：物种记录提交条数（可与本地 mock 列表对齐） */
  speciesRecordsSubmittedCount: number
  /** 真实姓名（选填）；Supabase `profiles.real_name` */
  realName: string
  /** 个人简介；`profiles.bio` */
  bio: string
  /** 业务联系手机；`profiles.profile_phone`，不替代登录账号 */
  profilePhone: string
  /** 业务联系邮箱；`profiles.profile_email` */
  profileEmail: string
}

export interface CloudSessionPayload {
  userId: string
}

export function primaryRoleLabel(role: CloudPrimaryRole): string {
  switch (role) {
    case 'visitor':
      return '游客'
    case 'volunteer':
      return '志愿者'
    case 'citizen_scientist':
      return '公民科学家'
    default:
      return role
  }
}

export function normalizeLoginKey(raw: string): string {
  const t = raw.trim()
  if (t.includes('@')) return t.toLowerCase()
  return t.replace(/\s+/g, '')
}
