/** 合作方向全集，与节点 cooperationMeta.resourceTypes、抽屉「合作方向」展示一致。 */
export const COOPERATION_RESOURCE_DIRECTIONS = [
  '生态保护协作项目',
  '社区发展协作项目',
  '志愿者网络共建项目',
  '国际交流合作',
  '学校课程协作',
  '自然教育机构协作',
  '企业 ESG 协作',
  '高校/科研机构协作',
  '保护地课程体系共建',
  '公众教育项目委托',
  '公民科学数据协作',
  '自然教育基地共建',
  '人才培训与认证',
] as const

/** 合作主体（一级）：政府 / 社会机构 / NGO */
export const COOPERATION_SUBJECTS = ['政府', '社会机构', 'NGO'] as const

/**
 * 主体类型（二级）：随「合作主体」联动。
 * - 政府：保护地管理方、地方政府部门、其他
 * - 社会机构：自然教育机构、学校、高校科研机构、其他
 * - NGO：社会团体、民办非企业单位、基金会
 */
export function getSubjectSubtypeOptionsForCooperationSubject(cooperationSubject: string): string[] {
  const base = ['全部']
  if (cooperationSubject === '政府') return [...base, '保护地管理方', '地方政府部门', '其他']
  if (cooperationSubject === '社会机构') return [...base, '自然教育机构', '学校', '高校科研机构', '其他']
  if (cooperationSubject === 'NGO') return [...base, '社会团体', '民办非企业单位', '基金会']
  return base
}
