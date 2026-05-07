import { citizenScienceJoinPathWithProject } from '../lib/citizenScienceLeads'
import type { ScienceProject } from './types'

export const scienceProjects: ScienceProject[] = [
  {
    id: 's1',
    slug: 'camera-trap-stewardship',
    title: '红外相机协管与野生动物监测',
    topic: 'mammals',
    summary: '参与红外相机布设、数据卡更换、影像初筛，识别野生动物。',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: '#野外监测', tone: 'sage' },
      { text: '#摄影', tone: 'sky' },
      { text: '#科研支持', tone: 'lavender' },
    ],
    cta: { label: '申请参与', href: citizenScienceJoinPathWithProject('camera-trap-stewardship') },
  },
  {
    id: 's2',
    slug: 'species-observation-network',
    title: '物种观测网络与公民科学家培养',
    topic: 'birds',
    summary: '通过APP上传蝴蝶、鸟类、两爬等观测记录，专家审核后入库。',
    image:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: '#随手拍', tone: 'sky' },
      { text: '#AI识别', tone: 'lavender' },
      { text: '#数据贡献', tone: 'mint' },
    ],
    cta: { label: '申请参与', href: citizenScienceJoinPathWithProject('species-observation-network') },
  },
]
