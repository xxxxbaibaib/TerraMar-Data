/** 合作共建页首屏以下：政府 → 社会机构 → NGO（与《TerraMar_Cooperation_Page_Design_Spec》§4 一致） */

export type CooperationTableRow = {
  direction: string
  content: string
  terramarValue: string
  /** 伙伴项目卡片头图；与首页活动卡同规格缩略图 URL */
  heroImageUrl: string
}

export type CooperationStakeholderSection = {
  id: string
  title: string
  subtitle?: string
  partners: string[]
  goal: string
  rows: CooperationTableRow[]
}

export const cooperationStakeholderSections: CooperationStakeholderSection[] = [
  {
    id: 'government',
    title: '政府',
    partners: ['保护地管理方', '地方政府部门', '其他'],
    goal:
      '赋能保护地公众教育职能，提升生态价值转化效率，协助完成政策指标（自然科普率、研学基地建设、公民科学数据采集等）。',
    rows: [
      {
        direction: '保护地课程体系共建',
        content: '定制自然教育课程、解说体系、活动手册',
        terramarValue: '专业课程研发团队、标准化教案、导师培训体系',
        heroImageUrl:
          'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '公众教育项目委托',
        content: '保护地开放日、自然嘉年华、科普展览等活动',
        terramarValue: '活动策划、执行团队、传播矩阵',
        heroImageUrl:
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '公民科学数据协作',
        content: '组织公众参与物种监测与环境数据采集、年度报告',
        terramarValue: '公民科学工具、志愿者组织、数据分析',
        heroImageUrl:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '自然教育基地共建',
        content: '联合申报国家/省级自然教育基地、协同运营',
        terramarValue: '课程内容、驻场导师、运营管理',
        heroImageUrl:
          'https://images.unsplash.com/photo-1518173946689-a63c0363e03d?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '人才培训与认证',
        content: '面向保护地工作人员、护林员、讲解员的专业自然教育培训',
        terramarValue: '培训体系、认证标准、行业资源',
        heroImageUrl:
          'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
      },
    ],
  },
  {
    id: 'social',
    title: '社会机构',
    partners: ['自然教育机构', '学校', '高校科研机构', '其他'],
    goal:
      '构建自然教育产业资源互联网络，实现课程、导师、场地、客源的跨机构流动与共享。',
    rows: [
      {
        direction: '学校课程协作',
        content: '校本课程输入、研学活动执行、自然教室共建',
        terramarValue: '标准化课程包、导师派遣、评价体系',
        heroImageUrl:
          'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '自然教育机构协作',
        content: '课程 IP 授权、导师联合培养、跨区域资源共享',
        terramarValue: '品牌背书、课程体系、平台流量、数据支持',
        heroImageUrl:
          'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '企业 ESG 协作',
        content: '员工自然疗愈团建、公益项目联名',
        terramarValue: '定制方案、项目执行、影响力报告',
        heroImageUrl:
          'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '高校/科研机构协作',
        content: '联合课题申报、实习基地、公民科学数据共建',
        terramarValue: '数据采集网络、志愿者组织、实践平台',
        heroImageUrl:
          'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=80',
      },
    ],
  },
  {
    id: 'ngo',
    title: 'NGO',
    partners: ['社会团体', '民办非企业单位', '基金会'],
    goal: '放大公益影响力，动员社会力量参与生态保护，推动自然教育普惠。',
    rows: [
      {
        direction: '生态保护协作项目',
        content: '乡村儿童自然教室、城市流动儿童自然探索营、长者自然疗愈计划等',
        terramarValue: '课程设计、导师执行、项目实施、数据反馈',
        heroImageUrl:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '社区发展协作项目',
        content: '保护地周边社区生计替代、生态农产品推广等',
        terramarValue: '市场渠道、产品设计、品牌叙事',
        heroImageUrl:
          'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '志愿者网络共建项目',
        content: '保护地志愿者招募培训管理、公民科学志愿者等',
        terramarValue: '志愿者培训体系、线上管理平台、活动组织',
        heroImageUrl:
          'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
      },
      {
        direction: '国际交流合作',
        content: '与海外保护地与自然教育机构互访、课程交流、数据共享等',
        terramarValue: '平台对接、翻译支持、活动策划',
        heroImageUrl:
          'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80',
      },
    ],
  },
]
