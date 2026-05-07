import type { MapFilterConfig, MapPageType } from './mapTypes'
import { COOPERATION_SUBJECTS } from './cooperationMapConstants'

export const mapFiltersByPage: Record<MapPageType, MapFilterConfig[]> = {
  programs: [
    { key: 'timeRange', label: '时间', options: ['近30天', '本季', '全年'] },
    {
      key: 'audience',
      label: '人群',
      options: ['全部', '亲子', '银发', '身心疗愈群体', '志愿者', '公民科学家'],
    },
    { key: 'programType', label: '类型', options: ['全部', 'half_day', 'weekend', 'camp', 'adult_healing', 'senior', 'citizen_science'] },
  ],
  cooperation: [
    { key: 'cooperationSubject', label: '合作主体', options: ['全部', ...COOPERATION_SUBJECTS] },
    /** 二级选项由 MapHeroShell 按 cooperationSubject 动态注入 */
    { key: 'subjectSubtype', label: '主体类型', options: ['全部'] },
  ],
  impact: [
    { key: 'impactType', label: '公益类型', options: ['全部', '保护地课程', '社区项目', '公众传播', 'youth_access'] },
    { key: 'beneficiary', label: '受益对象', options: ['全部', '儿童', '家庭', '社区居民', '志愿者'] },
    { key: 'status', label: '状态', options: ['全部', '规划中', '执行中', '已完成'] },
  ],
  science: [
    {
      key: 'topic',
      label: '类群',
      options: [
        '全部',
        { value: 'birds', label: '鸟类' },
        { value: 'insects', label: '昆虫' },
        { value: 'plants', label: '植物' },
        { value: 'mammals', label: '哺乳动物' },
      ],
    },
    { key: 'timeRange', label: '时间', options: ['近7天', '近30天', '本季', '全年'] },
    { key: 'quality', label: '数据质量', options: ['全部', '待核验', '已核验'] },
  ],
}
