-- 官网地图点位真源：与前端 MapNode 对齐；anon/authenticated 只读；写入走 Dashboard / service_role
-- 依赖: 20250506000000_p0_profiles_leads_orders.sql（tm_set_updated_at）

create type public.tm_map_page as enum ('programs', 'cooperation', 'impact', 'science');

create type public.tm_map_node_type as enum (
  'activity_site',
  'source_city',
  'institution',
  'habitat',
  'community',
  'school',
  'species_record'
);

create table public.map_locations (
  id text primary key,
  page public.tm_map_page not null,
  node_type public.tm_map_node_type not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  location_id text,
  city text,
  province text,
  tags text[] not null default '{}'::text[],
  status text,
  metrics jsonb,
  cooperation_meta jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_locations_lat_check check (lat between -90 and 90),
  constraint map_locations_lng_check check (lng between -180 and 180)
);

create index map_locations_page_sort_idx on public.map_locations (page, sort_order, id);

create trigger map_locations_set_updated_at
  before update on public.map_locations
  for each row execute function public.tm_set_updated_at();

alter table public.map_locations enable row level security;

create policy map_locations_select_public
  on public.map_locations for select
  to anon, authenticated
  using (true);

grant select on table public.map_locations to anon, authenticated;

-- 种子：与 src/mock/map/mapNodes.ts 一致（首版 UI 对齐）
insert into public.map_locations (
  id, page, node_type, name, lat, lng, location_id, city, province, tags, status, metrics, cooperation_meta, sort_order
) values
  (
    'activity-qjy', 'programs', 'activity_site', '钱江源示范营地', 29.2, 118.32, 'qjy', '衢州', '浙江',
    array['weekend', 'camp', '亲子', '公民科学家']::text[], 'active',
    '[{"label":"活动场次","value":42},{"label":"参与人次","value":"1,280+"}]'::jsonb,
    null, 0
  ),
  (
    'source-hz', 'programs', 'source_city', '杭州来源群体', 30.25, 120.16, 'hz', '杭州', '浙江',
    array['亲子', '身心疗愈群体', '志愿者']::text[], 'active', null, null, 1
  ),
  (
    'source-sh', 'programs', 'source_city', '上海来源群体', 31.23, 121.47, 'sh', '上海', '上海',
    array['银发', '身心疗愈群体']::text[], 'active', null, null, 2
  ),
  (
    'coop-gov-pa', 'cooperation', 'institution', '钱江源国家公园管理局', 29.2, 118.32, 'coop-pa', '衢州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"在营项目","value":5},{"label":"年公众教育场次","value":"120+"}]'::jsonb,
    '{"partnerName":"钱江源国家公园管理局","cooperationSubject":"政府","subjectSubtype":"保护地管理方","resourceTypes":["保护地课程体系共建","公众教育项目委托","公民科学数据协作"]}'::jsonb,
    10
  ),
  (
    'coop-gov-dept', 'cooperation', 'institution', '浙江省文旅厅（自然教育条线）', 30.18, 120.15, 'coop-dept', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合申报项目","value":2}]'::jsonb,
    '{"partnerName":"浙江省文旅厅（自然教育条线）","cooperationSubject":"政府","subjectSubtype":"地方政府部门","resourceTypes":["自然教育基地共建","人才培训与认证"]}'::jsonb,
    11
  ),
  (
    'coop-soc-school', 'cooperation', 'institution', '杭州某实验学校', 30.28, 120.12, 'coop-sch', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"校本模块","value":6}]'::jsonb,
    '{"partnerName":"杭州某实验学校","cooperationSubject":"社会机构","subjectSubtype":"学校","resourceTypes":["学校课程协作"]}'::jsonb,
    12
  ),
  (
    'coop-soc-tour', 'cooperation', 'institution', '长三角研学联合体', 31.3, 120.58, 'coop-tour', '苏州', '江苏',
    array['合作']::text[], 'active',
    '[{"label":"跨区域线路","value":4}]'::jsonb,
    '{"partnerName":"长三角研学联合体","cooperationSubject":"社会机构","subjectSubtype":"自然教育机构","resourceTypes":["自然教育机构协作","学校课程协作"]}'::jsonb,
    13
  ),
  (
    'coop-soc-esg', 'cooperation', 'institution', '某科技企业 ESG 部', 31.22, 121.48, 'coop-esg', '上海', '上海',
    array['合作']::text[], 'planning',
    '[{"label":"年度活动","value":3}]'::jsonb,
    '{"partnerName":"某科技企业 ESG 部","cooperationSubject":"社会机构","subjectSubtype":"其他","resourceTypes":["企业 ESG 协作"]}'::jsonb,
    14
  ),
  (
    'coop-soc-uni', 'cooperation', 'institution', '浙江大学生命科学学院', 30.3, 120.08, 'coop-uni', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合课题","value":2}]'::jsonb,
    '{"partnerName":"浙江大学生命科学学院","cooperationSubject":"社会机构","subjectSubtype":"高校科研机构","resourceTypes":["高校/科研机构协作","公民科学数据协作"]}'::jsonb,
    15
  ),
  (
    'coop-ngo-see', 'cooperation', 'institution', 'SEE基金会浙江项目办', 29.45, 119.92, 'coop-see', '金华', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"志愿者","value":"180+"}]'::jsonb,
    '{"partnerName":"SEE基金会浙江项目办","cooperationSubject":"NGO","subjectSubtype":"基金会","resourceTypes":["生态保护协作项目","志愿者网络共建项目"]}'::jsonb,
    16
  ),
  (
    'coop-ngo-mcf', 'cooperation', 'institution', '红树林基金会（MCF）', 22.55, 114.05, 'coop-mcf', '深圳', '广东',
    array['合作']::text[], 'active',
    '[{"label":"社区项目","value":3}]'::jsonb,
    '{"partnerName":"红树林基金会（MCF）","cooperationSubject":"NGO","subjectSubtype":"民办非企业单位","resourceTypes":["社区发展协作项目","国际交流合作"]}'::jsonb,
    17
  ),
  (
    'coop-gov-county', 'cooperation', 'institution', '安吉县林业局', 30.63, 119.68, 'coop-county', '湖州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合培训","value":2}]'::jsonb,
    '{"partnerName":"安吉县林业局","cooperationSubject":"政府","subjectSubtype":"其他","resourceTypes":["人才培训与认证","公众教育项目委托"]}'::jsonb,
    18
  ),
  (
    'coop-ngo-vol', 'cooperation', 'institution', '杭州市绿色志愿者协会', 30.26, 120.18, 'coop-vol', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"注册志愿者","value":"520+"}]'::jsonb,
    '{"partnerName":"杭州市绿色志愿者协会","cooperationSubject":"NGO","subjectSubtype":"社会团体","resourceTypes":["志愿者网络共建项目","生态保护协作项目"]}'::jsonb,
    19
  ),
  (
    'impact-habitat-1', 'impact', 'habitat', '钱江源森林栖息地', 29.22, 118.31, 'hab1', '衢州', '浙江',
    array['protected_area']::text[], 'active', null, null, 30
  ),
  (
    'impact-community-1', 'impact', 'community', '城西社区自然课堂', 30.31, 120.09, 'com1', '杭州', '浙江',
    array['community']::text[], 'active', null, null, 31
  ),
  (
    'impact-school-1', 'impact', 'school', '乡村学校自然角', 29.7, 119.85, 'sch1', '金华', '浙江',
    array['school', 'youth_access']::text[], 'active', null, null, 32
  ),
  (
    'species-1', 'science', 'species_record', '白鹭记录点', 30.24, 120.2, 'sp1', '杭州', '浙江',
    array['birds', 'verified']::text[], 'verified', null, null, 40
  ),
  (
    'species-2', 'science', 'species_record', '凤蝶记录点', 29.24, 118.36, 'sp2', '衢州', '浙江',
    array['insects', 'pending_review']::text[], 'pending_review', null, null, 41
  );
