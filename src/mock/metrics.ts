export type ImpactMetricCard = {
  label: string
  value: string
  /** 底部小字，与首页影响卡片「口径/说明」行一致 */
  subtitle: string
  /** 全幅背景图（与首页影响区同一视觉语言） */
  image: string
}

export const impactMetrics: ImpactMetricCard[] = [
  {
    label: '公益服务人次',
    value: '4,600+',
    subtitle: '示范期累计参与人次',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '合作学校/机构',
    value: '28',
    subtitle: '签约与常态化协作单位',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '志愿者人数',
    value: '310+',
    subtitle: '在地服务与项目志愿力量',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '公众传播触达',
    value: '120,000+',
    subtitle: '线上线下传播与活动曝光',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
  },
]

/** 科研/公民科学页指标卡（与公益影响区同一套「大图 + 底部渐变 + 三行白字」） */
export const scienceMetrics: ImpactMetricCard[] = [
  {
    value: '540+',
    label: '公民科学参与者网络',
    subtitle: '累计登记与活跃贡献人次',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
  {
    value: '9,800+',
    label: '有效自然与物种记录',
    subtitle: '审核通过并入示范数据层',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    value: '96',
    label: '标准化样线 / 样点',
    subtitle: '野外调查与重复监测位点',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    value: '7',
    label: '高校与科研协同伙伴',
    subtitle: '合作机构与联合课题支撑',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
  },
]
