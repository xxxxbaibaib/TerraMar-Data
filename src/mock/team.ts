export type TeamMember = {
  name: string
  role: string
  bio: string
  /** 占位头像（正式肖像可替换为机构素材） */
  image: string
}

/** 团队介绍与图一「创始团队」材料一致，卡片内为精炼表述 */
export const teamMembers: TeamMember[] = [
  {
    name: '吴清龙',
    role: '创始人',
    bio: '清华大学建筑学院风景园林硕士，中国风景园林学会会员，山海自然科考创始人。 2024 IFLA-AAPME 国际风景园林奖杰出奖获得者；曾任职于清华大学国家公园研究院、中国城市规划设计研究院，聚焦自然保护地生态保护、社区发展与科普教育。核心参与钱江源、武夷山及浙江自然保护地志愿者体系等多项课题与实践；合编《钱江源国家公园文化资源管理手册》《景观生态学》教材等。',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: '高泽宁',
    role: '课程与产品部门负责人',
    bio: '清华大学建筑学院风景园林博士，美国亚利桑那州立大学 LESL 访问学者；山海自然科考课程与产品部门负责人。获 2024 IFLA-AAPME 分析与规划类卓越奖、清华大学未来学者奖学金等。参与国家自然科学基金国家公园相关课题，参与钱江源、百山祖、武夷山、大熊猫国家公园、泰山等多地规划建设，并考察全球二十余个国家公园；研究成果发表于 Geography and Sustainability 等，多次在国内外国家公园与景观生态学术会议报告。',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: '唐明晖',
    role: '运营与安全部门负责人',
    bio: '山海自然科考运营与安全部门负责人。深耕城市公园生态绿化、生态修复与景观营建领域6年，曾任地方城投园林绿化管理岗，主导市政公园绿地新建、生态修复及景观升级类项目落地，长期专注乡土植物应用、公园生态系统构建及生物多样性保护实践。',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
]
