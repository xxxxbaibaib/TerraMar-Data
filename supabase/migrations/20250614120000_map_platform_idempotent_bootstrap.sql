-- TerraMar 地图数据平台：与前端 map_locations / map_metrics / map_edges 对齐
-- 可重复执行：枚举跳过已存在；表 IF NOT EXISTS；种子 ON CONFLICT 覆盖更新；索引 IF NOT EXISTS
-- 依赖: public.tm_set_updated_at()（20250506000000_p0_profiles_leads_orders.sql）
--       org_partner_units / species_observations 表体（20250602120000…、20250601120000…）

-- ---------------------------------------------------------------------------
-- 1) 枚举（与仓库迁移一致）
-- ---------------------------------------------------------------------------
do $map_page$ begin
  create type public.tm_map_page as enum ('programs', 'cooperation', 'impact', 'science');
exception when duplicate_object then null;
end $map_page$;

do $map_node$ begin
  create type public.tm_map_node_type as enum (
    'activity_site',
    'source_city',
    'institution',
    'habitat',
    'community',
    'school',
    'species_record'
  );
exception when duplicate_object then null;
end $map_node$;

do $map_edge_rel$ begin
  create type public.tm_map_edge_relation as enum (
    'participation_flow',
    'co_build',
    'service_coverage',
    'observation_route'
  );
exception when duplicate_object then null;
end $map_edge_rel$;

-- ---------------------------------------------------------------------------
-- 2) 表（若已存在则跳过建表，仅后续索引/种子生效）
-- ---------------------------------------------------------------------------
create table if not exists public.map_locations (
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

create table if not exists public.map_dashboard_metrics (
  id uuid primary key default gen_random_uuid(),
  page public.tm_map_page not null,
  metric_key text not null,
  label text not null,
  value_text text not null,
  trend text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page, metric_key),
  constraint map_dashboard_metrics_trend_check check (
    trend is null or trend in ('up', 'down', 'flat')
  )
);

create table if not exists public.map_edges (
  id text primary key,
  page public.tm_map_page not null,
  from_node_id text not null,
  to_node_id text not null,
  relation_type public.tm_map_edge_relation not null,
  strength smallint,
  label text,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- 3) 索引优化（列表 API：按页 + 类型筛选；按页排序）
-- ---------------------------------------------------------------------------
create index if not exists map_locations_page_sort_idx on public.map_locations (page, sort_order, id);
create index if not exists map_locations_page_node_type_idx on public.map_locations (page, node_type);
create index if not exists map_locations_tags_gin_idx on public.map_locations using gin (tags);

create index if not exists map_dashboard_metrics_page_sort_idx
  on public.map_dashboard_metrics (page, sort_order, metric_key);

create index if not exists map_edges_page_sort_idx on public.map_edges (page, sort_order, id);
create index if not exists map_edges_endpoints_idx on public.map_edges (page, from_node_id, to_node_id);

-- ---------------------------------------------------------------------------
-- 4) 触发器与注释
-- ---------------------------------------------------------------------------
drop trigger if exists map_locations_set_updated_at on public.map_locations;
create trigger map_locations_set_updated_at
  before update on public.map_locations
  for each row execute function public.tm_set_updated_at();

drop trigger if exists map_dashboard_metrics_set_updated_at on public.map_dashboard_metrics;
create trigger map_dashboard_metrics_set_updated_at
  before update on public.map_dashboard_metrics
  for each row execute function public.tm_set_updated_at();

comment on table public.map_locations is '官网地图点位；前端 MapNode；anon 只读';
comment on column public.map_locations.cooperation_meta is '合作页三维筛选与抽屉；JSON 对齐 CooperationNodeMeta';
comment on table public.map_dashboard_metrics is '地图大屏底部 KPI；前端 MapMetric';
comment on table public.map_edges is '地图关系线；端点 id 须存在于 map_locations.id';

-- ---------------------------------------------------------------------------
-- 5) RLS + 授权（幂等）
-- ---------------------------------------------------------------------------
alter table public.map_locations enable row level security;
drop policy if exists map_locations_select_public on public.map_locations;
create policy map_locations_select_public
  on public.map_locations for select
  to anon, authenticated
  using (true);
grant select on table public.map_locations to anon, authenticated;

alter table public.map_dashboard_metrics enable row level security;
drop policy if exists map_dashboard_metrics_select_public on public.map_dashboard_metrics;
create policy map_dashboard_metrics_select_public
  on public.map_dashboard_metrics for select
  to anon, authenticated
  using (true);
grant select on table public.map_dashboard_metrics to anon, authenticated;

alter table public.map_edges enable row level security;
drop policy if exists map_edges_select_public on public.map_edges;
create policy map_edges_select_public
  on public.map_edges for select
  to anon, authenticated
  using (true);
grant select on table public.map_edges to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) 机构 / 物种地图公开读（与 20250613120000 一致，可重复执行）
-- ---------------------------------------------------------------------------
grant select on table public.org_partner_units to anon;
drop policy if exists org_partner_units_select_public_mapcoords on public.org_partner_units;
create policy org_partner_units_select_public_mapcoords
  on public.org_partner_units for select
  to anon, authenticated
  using (
    latitude is not null
    and longitude is not null
    and latitude between -90 and 90
    and longitude between -180 and 180
  );

grant select on table public.species_observations to anon;
drop policy if exists species_observations_select_public_approved_map on public.species_observations;
create policy species_observations_select_public_approved_map
  on public.species_observations for select
  to anon, authenticated
  using (
    verification_status = 'approved'::public.tm_species_verification_status
    and location is not null
    and (location ? 'lat')
    and (location ? 'lng')
  );

-- ---------------------------------------------------------------------------
-- 7) 种子 UPSERT（修改文案/坐标后重新执行本文件即可写回库）
-- ---------------------------------------------------------------------------
insert into public.map_locations (
  id, page, node_type, name, lat, lng, location_id, city, province, tags, status, metrics, cooperation_meta, sort_order
) values
  (
    'activity-qjy', 'programs'::public.tm_map_page, 'activity_site'::public.tm_map_node_type, '钱江源示范营地', 29.2, 118.32, 'qjy', '衢州', '浙江',
    array['weekend', 'camp', '亲子', '公民科学家']::text[], 'active',
    '[{"label":"活动场次","value":42},{"label":"参与人次","value":"1,280+"}]'::jsonb,
    null, 0
  ),
  (
    'source-hz', 'programs'::public.tm_map_page, 'source_city'::public.tm_map_node_type, '杭州来源群体', 30.25, 120.16, 'hz', '杭州', '浙江',
    array['亲子', '身心疗愈群体', '志愿者']::text[], 'active', null, null, 1
  ),
  (
    'source-sh', 'programs'::public.tm_map_page, 'source_city'::public.tm_map_node_type, '上海来源群体', 31.23, 121.47, 'sh', '上海', '上海',
    array['银发', '身心疗愈群体']::text[], 'active', null, null, 2
  ),
  (
    'coop-gov-pa', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '钱江源国家公园管理局', 29.2, 118.32, 'coop-pa', '衢州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"在营项目","value":5},{"label":"年公众教育场次","value":"120+"}]'::jsonb,
    '{"partnerName":"钱江源国家公园管理局","cooperationSubject":"政府","subjectSubtype":"保护地管理方","resourceTypes":["保护地课程体系共建","公众教育项目委托","公民科学数据协作"]}'::jsonb,
    10
  ),
  (
    'coop-gov-dept', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '浙江省文旅厅（自然教育条线）', 30.18, 120.15, 'coop-dept', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合申报项目","value":2}]'::jsonb,
    '{"partnerName":"浙江省文旅厅（自然教育条线）","cooperationSubject":"政府","subjectSubtype":"地方政府部门","resourceTypes":["自然教育基地共建","人才培训与认证"]}'::jsonb,
    11
  ),
  (
    'coop-soc-school', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '杭州某实验学校', 30.28, 120.12, 'coop-sch', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"校本模块","value":6}]'::jsonb,
    '{"partnerName":"杭州某实验学校","cooperationSubject":"社会机构","subjectSubtype":"学校","resourceTypes":["学校课程协作"]}'::jsonb,
    12
  ),
  (
    'coop-soc-tour', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '长三角研学联合体', 31.3, 120.58, 'coop-tour', '苏州', '江苏',
    array['合作']::text[], 'active',
    '[{"label":"跨区域线路","value":4}]'::jsonb,
    '{"partnerName":"长三角研学联合体","cooperationSubject":"社会机构","subjectSubtype":"自然教育机构","resourceTypes":["自然教育机构协作","学校课程协作"]}'::jsonb,
    13
  ),
  (
    'coop-soc-esg', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '某科技企业 ESG 部', 31.22, 121.48, 'coop-esg', '上海', '上海',
    array['合作']::text[], 'planning',
    '[{"label":"年度活动","value":3}]'::jsonb,
    '{"partnerName":"某科技企业 ESG 部","cooperationSubject":"社会机构","subjectSubtype":"其他","resourceTypes":["企业 ESG 协作"]}'::jsonb,
    14
  ),
  (
    'coop-soc-uni', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '浙江大学生命科学学院', 30.3, 120.08, 'coop-uni', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合课题","value":2}]'::jsonb,
    '{"partnerName":"浙江大学生命科学学院","cooperationSubject":"社会机构","subjectSubtype":"高校科研机构","resourceTypes":["高校/科研机构协作","公民科学数据协作"]}'::jsonb,
    15
  ),
  (
    'coop-ngo-see', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, 'SEE基金会浙江项目办', 29.45, 119.92, 'coop-see', '金华', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"志愿者","value":"180+"}]'::jsonb,
    '{"partnerName":"SEE基金会浙江项目办","cooperationSubject":"NGO","subjectSubtype":"基金会","resourceTypes":["生态保护协作项目","志愿者网络共建项目"]}'::jsonb,
    16
  ),
  (
    'coop-ngo-mcf', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '红树林基金会（MCF）', 22.55, 114.05, 'coop-mcf', '深圳', '广东',
    array['合作']::text[], 'active',
    '[{"label":"社区项目","value":3}]'::jsonb,
    '{"partnerName":"红树林基金会（MCF）","cooperationSubject":"NGO","subjectSubtype":"民办非企业单位","resourceTypes":["社区发展协作项目","国际交流合作"]}'::jsonb,
    17
  ),
  (
    'coop-gov-county', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '安吉县林业局', 30.63, 119.68, 'coop-county', '湖州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"联合培训","value":2}]'::jsonb,
    '{"partnerName":"安吉县林业局","cooperationSubject":"政府","subjectSubtype":"其他","resourceTypes":["人才培训与认证","公众教育项目委托"]}'::jsonb,
    18
  ),
  (
    'coop-ngo-vol', 'cooperation'::public.tm_map_page, 'institution'::public.tm_map_node_type, '杭州市绿色志愿者协会', 30.26, 120.18, 'coop-vol', '杭州', '浙江',
    array['合作']::text[], 'active',
    '[{"label":"注册志愿者","value":"520+"}]'::jsonb,
    '{"partnerName":"杭州市绿色志愿者协会","cooperationSubject":"NGO","subjectSubtype":"社会团体","resourceTypes":["志愿者网络共建项目","生态保护协作项目"]}'::jsonb,
    19
  ),
  (
    'impact-habitat-1', 'impact'::public.tm_map_page, 'habitat'::public.tm_map_node_type, '钱江源森林栖息地', 29.22, 118.31, 'hab1', '衢州', '浙江',
    array['protected_area']::text[], 'active', null, null, 30
  ),
  (
    'impact-community-1', 'impact'::public.tm_map_page, 'community'::public.tm_map_node_type, '城西社区自然课堂', 30.31, 120.09, 'com1', '杭州', '浙江',
    array['community']::text[], 'active', null, null, 31
  ),
  (
    'impact-school-1', 'impact'::public.tm_map_page, 'school'::public.tm_map_node_type, '乡村学校自然角', 29.7, 119.85, 'sch1', '金华', '浙江',
    array['school', 'youth_access']::text[], 'active', null, null, 32
  ),
  (
    'species-1', 'science'::public.tm_map_page, 'species_record'::public.tm_map_node_type, '白鹭记录点', 30.24, 120.2, 'sp1', '杭州', '浙江',
    array['birds', 'verified']::text[], 'verified', null, null, 40
  ),
  (
    'species-2', 'science'::public.tm_map_page, 'species_record'::public.tm_map_node_type, '凤蝶记录点', 29.24, 118.36, 'sp2', '衢州', '浙江',
    array['insects', 'pending_review']::text[], 'pending_review', null, null, 41
  )
on conflict (id) do update set
  page = excluded.page,
  node_type = excluded.node_type,
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  location_id = excluded.location_id,
  city = excluded.city,
  province = excluded.province,
  tags = excluded.tags,
  status = excluded.status,
  metrics = excluded.metrics,
  cooperation_meta = excluded.cooperation_meta,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.map_dashboard_metrics (page, metric_key, label, value_text, trend, sort_order) values
  ('programs'::public.tm_map_page, 'participants', '累计参与人数', '4,260+', 'up', 0),
  ('programs'::public.tm_map_page, 'cities', '活跃来源城市', '28', 'up', 1),
  ('programs'::public.tm_map_page, 'repurchase', '复购参与率', '42%', 'up', 2),
  ('programs'::public.tm_map_page, 'groups', '社群活跃群组', '16', 'flat', 3),
  ('cooperation'::public.tm_map_page, 'collab_orgs', '自然教育协作机构数量', '10', 'up', 0),
  ('cooperation'::public.tm_map_page, 'practitioners', '自然教育从业人数', '860+', 'up', 1),
  ('cooperation'::public.tm_map_page, 'cities_network', '自然教育网络覆盖城市数量', '18', 'up', 2),
  ('cooperation'::public.tm_map_page, 'protected_area_ha', '自然教育网络覆盖保护地面积', '1.2万 km²', 'flat', 3),
  ('impact'::public.tm_map_page, 'service_people', '公益服务人次', '4,600+', 'up', 0),
  ('impact'::public.tm_map_page, 'communities', '覆盖社区', '22', 'up', 1),
  ('impact'::public.tm_map_page, 'schools', '覆盖学校', '17', 'up', 2),
  ('impact'::public.tm_map_page, 'volunteers', '志愿者人数', '310+', 'flat', 3),
  ('science'::public.tm_map_page, 'records', '有效记录数', '9,800+', 'up', 0),
  ('science'::public.tm_map_page, 'contributors', '参与者人数', '540+', 'up', 1),
  ('science'::public.tm_map_page, 'samples', '样线/样点', '96', 'flat', 2),
  ('science'::public.tm_map_page, 'reports', '年度报告', '1', 'flat', 3)
on conflict (page, metric_key) do update set
  label = excluded.label,
  value_text = excluded.value_text,
  trend = excluded.trend,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.map_edges (id, page, from_node_id, to_node_id, relation_type, strength, label, sort_order) values
  ('edge-p1', 'programs'::public.tm_map_page, 'source-hz', 'activity-qjy', 'participation_flow'::public.tm_map_edge_relation, 5, '周末营参与流', 0),
  ('edge-p2', 'programs'::public.tm_map_page, 'source-sh', 'activity-qjy', 'participation_flow'::public.tm_map_edge_relation, 3, '假期营参与流', 1),
  ('edge-c1', 'cooperation'::public.tm_map_page, 'coop-soc-school', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 4, '学校—保护地课程共建', 10),
  ('edge-c2', 'cooperation'::public.tm_map_page, 'coop-ngo-see', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 3, '公益与志愿者协同', 11),
  ('edge-c3', 'cooperation'::public.tm_map_page, 'coop-soc-esg', 'coop-ngo-mcf', 'co_build'::public.tm_map_edge_relation, 2, 'ESG 公益联名', 12),
  ('edge-c4', 'cooperation'::public.tm_map_page, 'coop-soc-uni', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 3, '公民科学数据协作', 13),
  ('edge-c5', 'cooperation'::public.tm_map_page, 'coop-soc-tour', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 4, '研学线路协同', 14),
  ('edge-c6', 'cooperation'::public.tm_map_page, 'coop-gov-dept', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 2, '基地与政策指导', 15),
  ('edge-c7', 'cooperation'::public.tm_map_page, 'coop-gov-county', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 2, '属地协同', 16),
  ('edge-c8', 'cooperation'::public.tm_map_page, 'coop-ngo-vol', 'coop-gov-pa', 'co_build'::public.tm_map_edge_relation, 2, '志愿者进保护地', 17),
  ('edge-i1', 'impact'::public.tm_map_page, 'impact-habitat-1', 'impact-community-1', 'service_coverage'::public.tm_map_edge_relation, 3, null, 20),
  ('edge-i2', 'impact'::public.tm_map_page, 'impact-community-1', 'impact-school-1', 'service_coverage'::public.tm_map_edge_relation, 4, null, 21),
  ('edge-s1', 'science'::public.tm_map_page, 'species-1', 'species-2', 'observation_route'::public.tm_map_edge_relation, 2, '样线记录', 30)
on conflict (id) do update set
  page = excluded.page,
  from_node_id = excluded.from_node_id,
  to_node_id = excluded.to_node_id,
  relation_type = excluded.relation_type,
  strength = excluded.strength,
  label = excluded.label,
  sort_order = excluded.sort_order;

analyze public.map_locations;
analyze public.map_dashboard_metrics;
analyze public.map_edges;
