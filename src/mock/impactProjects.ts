import { shanhaiyunVolunteerJoinPathWithProject } from '../lib/shanhaiyunVolunteerLeads'
import type { ImpactProgramCard } from './types'

export const impactProgramCards: ImpactProgramCard[] = [
  {
    id: 'eco-culture',
    title: '生态文化传承项目',
    summary: '挖掘与传播社区传统生态知识与地方文化，开发自然文化体验路线。',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: 'cultural', tone: 'sky' },
      { text: 'heritage', tone: 'sage' },
      { text: 'community', tone: 'amber' },
    ],
    cta: { label: '了解更多', href: shanhaiyunVolunteerJoinPathWithProject('eco-culture') },
  },
  {
    id: 'citizen-science',
    title: '公民科学家项目',
    summary: '动员公众参与生物多样性监测，贡献科研数据，成为公民科学家。',
    image:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: 'citizen_science', tone: 'lavender' },
      { text: 'data', tone: 'sky' },
      { text: 'volunteer', tone: 'mint' },
    ],
    cta: { label: '申请参与', href: shanhaiyunVolunteerJoinPathWithProject('citizen-science') },
  },
  {
    id: 'child-nature-class',
    title: '儿童自然课堂项目',
    summary: '面向乡村儿童和城市弱势儿童，提供免费自然教育课程与科学包。',
    image:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: 'education', tone: 'amber' },
      { text: 'child', tone: 'rose' },
      { text: '公益课堂', tone: 'sage' },
    ],
    cta: { label: '了解更多', href: shanhaiyunVolunteerJoinPathWithProject('child-nature-class') },
  },
  {
    id: 'community-capacity',
    title: '社区能力建设项目',
    summary: '培训社区导赏员、发展生态手工艺，赋能女性与青年参与自然教育。',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    tags: [
      { text: 'training', tone: 'mint' },
      { text: 'women', tone: 'lavender' },
      { text: 'livelihood', tone: 'sky' },
    ],
    cta: { label: '申请参与', href: shanhaiyunVolunteerJoinPathWithProject('community-capacity') },
  },
]
