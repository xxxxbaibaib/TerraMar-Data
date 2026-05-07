# PRD｜TerraMar（山海自然教育）Web 官网 + 活动转化（MVP）

文档版本：v1.0  
产品负责人：你（机构创始人）  
适用范围：设计 / 前端开发（当前阶段仅 `frontend`，全量使用 mock 数据）

站点级产品总览（路由、IA、旅程、山海云演示与文档索引）：[PRD_TerraMar_Web_Product_Overview_v1.md](./PRD_TerraMar_Web_Product_Overview_v1.md)

### 演进（v2 预告，不改变 v1.0 历史约束表述）

后续若上线 **山海云统一登录、会员体系与数据入云**，范围与验收以独立文档为准，**不 retroactive 修改**上文「本期不做」的历史决策表述：

- [PRD_Shanhaiyun_Auth_Membership_v1.md](./PRD_Shanhaiyun_Auth_Membership_v1.md) — 登录、个人/机构会员、贡献等级、分期与验收  
- [API_Shanhaiyun_User_Membership_contract_v0.md](./API_Shanhaiyun_User_Membership_contract_v0.md) — REST 契约、实体与错误约定  

官网实现上将通过 **功能开关**（环境变量）在「仅本地演示」与「调用山海云 API」之间切换；详见 `src/lib/api/shanhaiyun/` 内说明。

---

## 1. 背景
山海自然教育（英文名：TerraMar Expeditions）依托国家公园与自然保护地真实场景，面向城市家庭与公众，同时服务保护地、学校及相关合作机构的自然教育内容与运营平台。我们希望成为用户端“可信的高质量自然教育品牌”，合作端“专业的公众教育与内容共建伙伴”。

参考网站的信息组织风格：
- RSPB：行动号召与清晰栏目结构（`https://www.rspb.org.uk/?utm_source=chatgpt.com`）
- Eden Project Mission：使命—方法—领域结构建立可信度（`https://www.edenproject.com/mission?utm_source=chatgpt.com`）

---

## 2. 目标与指标（MVP）

### 2.1 产品目标
- 建立信任：让首次访客快速理解“你是谁、为什么可信、有什么可参加/可合作”
- 促转化：完成「查看活动 → 查看详情 → 留资（报名意向）」的核心漏斗
- 促合作：完成「了解 B 端能力 → 留资（合作咨询）」链路

### 2.2 北极星指标（建议）
- **线索数**：报名意向提交量、合作咨询提交量（按日/周）

### 2.3 过程指标（建议）
- 首页到活动列表点击率（`click_cta_view_programs / view_home`）
- 活动卡片点击率（`click_program_card / view_program_list`）
- 详情页到报名意向点击率（`click_lead_apply / view_program_detail`）
- 表单提交成功率（`submit_success / submit_attempt`）

---

## 3. 范围（Scope）

### 3.1 本期做（MVP）
- 官网首页（Landing）：品牌叙事 + 活动入口 + B 端入口
- 活动列表：筛选 + 卡片展示
- 活动详情：详情内容 + 报名意向表单入口
- 合作页（B 端）：能力展示 + 合作咨询表单
- 内容资源页（轻量）：文章/栏目列表（mock）
- 关于我们页：使命愿景/价值/方法与安全（mock）

### 3.2 本期不做（明确排除）
- 真实支付、真实下单、真实用户系统
- 真实后端与数据库（当前阶段仅前端）
- 复杂会员体系与社群系统（仅保留“订阅/留资”入口）

### 3.3 技术约束（当前阶段）
- 所有数据使用 mock 数据，统一放在 `src/mock/`
- 如需预留 API 文件，统一放在 `src/lib/api/`（页面内不写真实请求）

### 3.4 v2 与山海云（与 3.2 的关系）

- **v1.0 交付物**仍以 3.2 为准：未启用山海云集成时，**不**将真实用户系统、真实后端列为当期必交付功能。  
- **v2 启用后**：登录、会员与线索/登记/观测等写入以山海云为权威源；本地 `localStorage` 仅作 **未登录演示降级** 或开发环境，行为以 [PRD_Shanhaiyun_Auth_Membership_v1.md](./PRD_Shanhaiyun_Auth_Membership_v1.md) 为准。

---

## 4. 目标用户与关键场景

### 4.1 C 端（核心）
- 高知亲子家庭：周末/寒暑假寻找“专业、可信、安全、有深度”的自然营与课程
- 自然兴趣成人/疗愈需求人群：希望获得“温和但有内容密度”的自然学习体验
- 高知银发群体：更重视节奏、安全、同伴氛围与精神滋养

### 4.2 B 端（重要）
- 保护地/国家公园管理机构：公众教育项目、讲解与内容体系化
- 学校/教育机构：课程合作、教师培训
- 企业 ESG/CSR：自然教育活动与传播项目
- 科普馆/博物馆/景区平台：专题活动与课程输出

---

## 5. 信息架构（IA）与导航

### 5.1 顶部导航（建议）
- 首页
- 产品与活动
- 课程体系
- 合作（B 端）
- 内容资源
- 关于我们

右侧主按钮（全站 1 个主 CTA）：**查看近期活动**

### 5.2 路由（建议）
- `/`：官网首页
- `/programs`：活动/课程列表
- `/programs/:slug`：活动详情
- `/cooperation`：合作页（B 端）
- `/resources`：内容资源
- `/about`：关于我们

---

## 6. 关键用户故事（User Stories）
- 作为首次访问的家长，我想在 5 秒内理解机构定位与专业性，从而愿意继续浏览活动
- 作为有明确需求的用户，我想快速筛选到适合自己/孩子的活动，并查看详细信息
- 作为谨慎的家长，我想看到清晰的安全/保险/应急说明，从而降低决策顾虑
- 作为 B 端负责人，我想快速确认合作方向与可交付物，并提交合作咨询

---

## 7. 页面需求（详细）

### 7.1 官网首页（`/`）——核心转化页

#### A. Hero 首屏（使命 + 定位 + CTA）
- 内容
  - 主标题：使命口号（例：让保护被看见，让自然可感知，让参与有意义）
  - 副标题：我们坚信，一家真正成功的自然教育机构，其价值不应仅以营收和利润衡量，更应以它唤醒了多少人对自然的热爱、改变了多少儿童的生命轨迹、贡献了多少保护地的科研数据、带动了多少社区的发展来定义
  - CTA：主按钮「查看近期活动」；次按钮「了解我们的使命」
- 交互
  - 主按钮：跳转 `/programs`
  - 次按钮：跳转 `/about` 或滚动到“使命与方法”

#### B. Why Us（信任建立：核心价值）
- 3 张卡片：专业性 / 连接性 / 行动性
- 每张卡：一句解释 + 一个“证据点”（如：跨学科导师、保护地真实场景、课程研发机制、安全 SOP）

#### C. 近期活动（转化核心区）
- 展示 6 张活动卡片（mock）
- 卡片字段：封面、标题、地点、日期/时长、适合人群标签、强度标签、（可选）价格区间、（可选）剩余名额
- CTA：每张卡「查看详情」→ `/programs/:slug`

#### D. 课程体系与学习路径（复购锚点）
- 年龄分层/学习路径（用 2-4 个层级表达即可）
- 产品梯度：引流 / 利润 / 品牌 / 长期（4 张卡片）
- CTA：订阅活动通知（轻量表单：姓名 + 联系方式 + 人群类型）

#### E. 安全与交付（降低决策阻力）
- 安全/保险/应急（要点列表）
- 单场活动流程（5-7 步：报名/行前/集合/活动/复盘/反馈等）
- CTA：查看常见问题（跳转 `/about` 的 FAQ 段落或折叠）

#### F. 合作入口（B 端）
- 4 类合作：学校课程/教师培训/企业 ESG/保护地公众教育
- 每类给 2-3 个可交付物示例（如：标准课程包、活动执行方案、讲解员培训、传播素材包）
- CTA：发起合作咨询 → `/cooperation`

#### G. Footer
- 联系方式、服务地区（长三角优先）、社媒占位、版权

---

### 7.2 活动列表（`/programs`）

#### A. 列表展示
- 默认排序：即将开始优先
- 展示：卡片网格（桌面 3 列、平板 2 列、手机 1 列）

#### B. 筛选与搜索（MVP）
- 筛选项（可多选）：
  - 活动类型：周末营 / 深度营 / 成人学习 / 银发疗愈（可扩展）
  - 适合人群：亲子 / 成人 / 银发
  - 强度：low / medium / high
  - 时间：本月 / 下月 / 全部
- 交互
  - 筛选后即时刷新列表（前端本地过滤）
  - 空状态：提示“暂无匹配活动”，并给“清空筛选”

---

### 7.3 活动详情（`/programs/:slug`）

#### A. 核心信息区
- 标题、封面、活动亮点（3-5 条）
- 适合人群、强度、地点、日期/时长
- 导师/带队（卡片：姓名、背景一句话、头像可选）

#### B. 内容区（MVP）
- 行程概览（按天或按模块）
- 费用包含/不包含
- 安全说明（要点）
- FAQ（折叠面板）

#### C. 转化组件（固定侧栏/底部浮层）
- 展示：时间、（可选）价格、（可选）名额状态
- 按钮：报名意向
  - 名额不足：候补登记
  - 已结束：订阅下期

#### D. 报名意向表单（弹窗/抽屉/独立段落）
字段（MVP）：
- 姓名（必填）
- 联系方式（手机或微信，必填）
- 人群类型（亲子/成人/银发，必填）
- 同行人数（可选）
- 备注（可选）

提交结果：
- 成功态：显示“已收到，我们将尽快联系你”，并给“返回列表/继续浏览”
- 失败态（模拟）：提示重试

---

### 7.4 合作页（`/cooperation`）

#### A. 合作主张（首屏）
- 1 句话：我们如何帮助合作方把保护地价值转化为“公众语言/体验/参与机制”
- 4 类合作入口锚点

#### B. 合作类型与交付物（卡片分区）
- 学校课程合作：课程设计/执行/评估
- 教师培训：培训大纲/案例/考核方式
- 企业 ESG：活动方案/传播素材/影响力指标建议
- 保护地公众教育：公众活动体系/讲解与志愿者支持/传播项目

#### C. 合作咨询表单
字段（MVP）：
- 机构名称（必填）
- 联系人姓名（必填）
- 联系方式（必填）
- 角色（可选）
- 合作类型（多选，必填）
- 期望时间（可选）
- 预算范围（可选）
- 需求说明（必填）

提交结果：
- 成功态 + 失败态（同活动报名）

---

### 7.5 内容资源（`/resources`）与关于我们（`/about`）（轻量）

#### `/resources`
- 列表：科普栏目/文章（mock）
- 详情可后续迭代（MVP 可不做）

#### `/about`
- 使命/愿景/核心价值（专业性/连接性/行动性）
- 方法与课程理念（概览）
- 安全与应急（要点）
- 团队（轻量卡片）

---

## 8. 数据（Mock）与字段定义

### 8.1 Mock 数据存放
- `src/mock/programs.ts`：活动数据
- `src/mock/resources.ts`：内容资源
- `src/mock/team.ts`：团队信息（可选）
- `src/mock/leads.ts`：已提交线索（本地数组/LocalStorage 模拟）

### 8.2 Program（活动）最小字段
- `id: string`
- `slug: string`
- `title: string`
- `type: 'weekend' | 'camp' | 'adult' | 'senior' | string`
- `locationName: string`
- `startDate: string`（ISO）
- `endDate: string`（ISO）
- `durationText: string`（如“2天1晚”）
- `audienceTags: string[]`（如：['亲子','成人']）
- `intensity: 'low' | 'medium' | 'high'`
- `priceFrom?: number`
- `priceTo?: number`
- `spotsTotal?: number`
- `spotsLeft?: number`
- `heroImageUrl?: string`
- `brief?: string`
- `highlights: string[]`
- `itinerary?: { dayLabel: string; title: string; content: string }[]`
- `included?: string[]`
- `excluded?: string[]`
- `safetyNotes?: string[]`
- `faq?: { q: string; a: string }[]`
- `instructors?: { name: string; title: string; bio?: string; avatarUrl?: string }[]`

### 8.3 Lead（线索）最小字段
- `id: string`
- `leadType: 'apply' | 'cooperation' | 'subscribe'`
- `sourcePath: string`
- `programSlug?: string`
- `name: string`
- `contact: string`
- `audienceType?: string`
- `organizationName?: string`
- `cooperationTypes?: string[]`
- `message?: string`
- `createdAt: string`（ISO）

---

## 9. 埋点（MVP）
建议先用前端事件上报占位（console/本地队列），后续接入真实分析平台。

- `view_home`
- `click_cta_view_programs`
- `view_program_list`
- `filter_programs`
- `click_program_card`
- `view_program_detail`
- `click_lead_apply`
- `submit_lead_apply_success` / `submit_lead_apply_fail`
- `view_cooperation`
- `submit_lead_cooperation_success` / `submit_lead_cooperation_fail`

---

## 10. UI/交互规范（用于快速对齐）
- 风格：专业、简洁、高级、留白充足、卡片化、颜色克制、动效轻量
- 版心
  - 桌面：`max-w-7xl mx-auto px-6 lg:px-8`
  - 移动：`px-4`
- 字体层级
  - 主标题：`text-4xl md:text-5xl font-semibold`
  - 区块标题：`text-2xl md:text-3xl font-semibold`
  - 卡片标题：`text-lg font-medium`
  - 正文：`text-base text-muted-foreground`
- 卡片基准：`rounded-2xl border bg-white/80 shadow-sm`
- CTA 原则：每页主按钮不超过 1-2 个

---

## 11. 验收标准（DoD）

### 11.1 功能验收
- 首页能清晰展示使命定位、近期活动、合作入口
- 活动列表支持筛选并可进入详情页
- 活动详情页可提交报名意向表单并看到成功态
- 合作页可提交合作咨询表单并看到成功态

### 11.2 体验验收
- 手机 / iPad / 桌面三端适配，无溢出
- 导航可用、按钮易点击、信息层级清晰
- 空状态/错误状态完整

### 11.3 工程验收
- mock 数据集中在 `src/mock/`，页面不散落写死数据
- 不出现真实 API 请求；如预留仅放 `src/lib/api/`

---

## 12. 里程碑建议（供排期）
- 设计：信息架构 + 首页/列表/详情/合作 4 个页面（含移动端）
- 前端：完成路由 + mock 数据 + UI 组件 + 表单提交成功态
- 联调/验收：响应式检查 + 埋点事件校验 + 文案校对

