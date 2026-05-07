import type { MapMetric } from './mapTypes'

export const mapMetrics: MapMetric[] = [
  { page: 'programs', key: 'participants', label: '累计参与人数', value: '4,260+', trend: 'up' },
  { page: 'programs', key: 'cities', label: '活跃来源城市', value: 28, trend: 'up' },
  { page: 'programs', key: 'repurchase', label: '复购参与率', value: '42%', trend: 'up' },
  { page: 'programs', key: 'groups', label: '社群活跃群组', value: 16, trend: 'flat' },

  { page: 'cooperation', key: 'collab_orgs', label: '自然教育协作机构数量', value: 10, trend: 'up' },
  { page: 'cooperation', key: 'practitioners', label: '自然教育从业人数', value: '860+', trend: 'up' },
  { page: 'cooperation', key: 'cities_network', label: '自然教育网络覆盖城市数量', value: 18, trend: 'up' },
  {
    page: 'cooperation',
    key: 'protected_area_ha',
    label: '自然教育网络覆盖保护地面积',
    value: '1.2万 km²',
    trend: 'flat',
  },

  { page: 'impact', key: 'service_people', label: '公益服务人次', value: '4,600+', trend: 'up' },
  { page: 'impact', key: 'communities', label: '覆盖社区', value: 22, trend: 'up' },
  { page: 'impact', key: 'schools', label: '覆盖学校', value: 17, trend: 'up' },
  { page: 'impact', key: 'volunteers', label: '志愿者人数', value: '310+', trend: 'flat' },

  { page: 'science', key: 'records', label: '有效记录数', value: '9,800+', trend: 'up' },
  { page: 'science', key: 'contributors', label: '参与者人数', value: '540+', trend: 'up' },
  { page: 'science', key: 'samples', label: '样线/样点', value: 96, trend: 'flat' },
  { page: 'science', key: 'reports', label: '年度报告', value: 1, trend: 'flat' },
]
