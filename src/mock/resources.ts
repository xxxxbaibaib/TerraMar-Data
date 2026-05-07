import type { ResourceArticle } from './types'

const intro = (topic: string) => [
  `${topic}——本文面向希望长期投入自然教育的家庭与机构伙伴，从「为什么」到「怎么做」给出可落地的视角。`,
  '自然观察不是一次性打卡，而是把感官、问题意识与价值判断放回日常节奏里；课程设计应匹配不同年龄的注意力与风险承受。',
  '好的自然教育强调安全、伦理与在地知识：先理解场所规则，再谈「看见什么」；先尊重物种与社区，再谈产出与传播。',
  '评估学习成效时，除知识清单外，可关注：是否能提出新问题、是否愿意重复回访同一场域、是否能把体验讲给他人听。',
  '当你把自然教育视为长期能力投资，家庭与学校更容易形成稳定节奏：小步快跑、持续记录、阶段性复盘，比单次震撼更重要。',
]

export const resources: ResourceArticle[] = [
  {
    id: 'r1',
    slug: 'family-nature-education-guide',
    title: '自然教育为什么是孩子长期成长的底层能力',
    category: '家庭自然教育',
    date: '2026-04-10',
    summary: '从观察力、问题意识到价值判断，解释自然教育的长期影响。',
    paragraphs: intro('底层能力'),
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'r2',
    slug: 'protected-area-public-education-toolkit',
    title: '保护地公众教育的三种高效活动设计方式',
    category: '保护地公众教育',
    date: '2026-04-02',
    summary: '拆解保护地项目中常见的活动结构与落地要点。',
    paragraphs: intro('保护地活动'),
  },
  {
    id: 'r3',
    slug: 'how-to-choose-family-camp',
    title: '如何为家庭选择合适的自然营',
    category: '家庭自然教育',
    date: '2026-03-28',
    summary: '给家长的实用清单：安全、强度、导师、课程深度。',
    paragraphs: intro('家庭营选择'),
  },
  {
    id: 'r4',
    slug: 'school-outdoor-safety-sop',
    title: '学校户外活动安全 SOP 模板',
    category: '教师与学校资源',
    date: '2026-03-20',
    summary: '从行前评估到现场应急，提供可复用的活动安全流程。',
    paragraphs: intro('安全 SOP'),
  },
  {
    id: 'r5',
    slug: 'citizen-science-data-ethics',
    title: '公民科学数据伦理与记录规范',
    category: '公民科学工具',
    date: '2026-03-10',
    summary: '确保公众参与的数据可用、可追踪且符合伦理要求。',
    paragraphs: intro('数据伦理'),
  },
]
