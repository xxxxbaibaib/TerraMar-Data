-- 地图大屏底部 KPI：与前端 MapMetric 对齐；anon/authenticated 只读
-- 依赖: 20250611120000_map_locations_public_read.sql（public.tm_map_page）

create table public.map_dashboard_metrics (
  id uuid primary key default gen_random_uuid(),
  page public.tm_map_page not null,
  metric_key text not null,
  label text not null,
  /** 展示用字符串（可为数字或带单位文案） */
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

create index map_dashboard_metrics_page_sort_idx on public.map_dashboard_metrics (page, sort_order, metric_key);

create trigger map_dashboard_metrics_set_updated_at
  before update on public.map_dashboard_metrics
  for each row execute function public.tm_set_updated_at();

alter table public.map_dashboard_metrics enable row level security;

create policy map_dashboard_metrics_select_public
  on public.map_dashboard_metrics for select
  to anon, authenticated
  using (true);

grant select on table public.map_dashboard_metrics to anon, authenticated;

-- 种子：与 src/mock/map/mapMetrics.ts 一致
insert into public.map_dashboard_metrics (page, metric_key, label, value_text, trend, sort_order) values
  ('programs', 'participants', '累计参与人数', '4,260+', 'up', 0),
  ('programs', 'cities', '活跃来源城市', '28', 'up', 1),
  ('programs', 'repurchase', '复购参与率', '42%', 'up', 2),
  ('programs', 'groups', '社群活跃群组', '16', 'flat', 3),

  ('cooperation', 'collab_orgs', '自然教育协作机构数量', '10', 'up', 0),
  ('cooperation', 'practitioners', '自然教育从业人数', '860+', 'up', 1),
  ('cooperation', 'cities_network', '自然教育网络覆盖城市数量', '18', 'up', 2),
  ('cooperation', 'protected_area_ha', '自然教育网络覆盖保护地面积', '1.2万 km²', 'flat', 3),

  ('impact', 'service_people', '公益服务人次', '4,600+', 'up', 0),
  ('impact', 'communities', '覆盖社区', '22', 'up', 1),
  ('impact', 'schools', '覆盖学校', '17', 'up', 2),
  ('impact', 'volunteers', '志愿者人数', '310+', 'flat', 3),

  ('science', 'records', '有效记录数', '9,800+', 'up', 0),
  ('science', 'contributors', '参与者人数', '540+', 'up', 1),
  ('science', 'samples', '样线/样点', '96', 'flat', 2),
  ('science', 'reports', '年度报告', '1', 'flat', 3);

-- ---------------------------------------------------------------------------
-- 地图关系线（与 src/mock/map/mapEdges.ts 一致；端点 id 对应 map_locations.id）
-- ---------------------------------------------------------------------------
create type public.tm_map_edge_relation as enum (
  'participation_flow',
  'co_build',
  'service_coverage',
  'observation_route'
);

create table public.map_edges (
  id text primary key,
  page public.tm_map_page not null,
  from_node_id text not null,
  to_node_id text not null,
  relation_type public.tm_map_edge_relation not null,
  strength smallint,
  label text,
  sort_order integer not null default 0
);

create index map_edges_page_sort_idx on public.map_edges (page, sort_order, id);

alter table public.map_edges enable row level security;

create policy map_edges_select_public
  on public.map_edges for select
  to anon, authenticated
  using (true);

grant select on table public.map_edges to anon, authenticated;

insert into public.map_edges (id, page, from_node_id, to_node_id, relation_type, strength, label, sort_order) values
  ('edge-p1', 'programs', 'source-hz', 'activity-qjy', 'participation_flow', 5, '周末营参与流', 0),
  ('edge-p2', 'programs', 'source-sh', 'activity-qjy', 'participation_flow', 3, '假期营参与流', 1),
  ('edge-c1', 'cooperation', 'coop-soc-school', 'coop-gov-pa', 'co_build', 4, '学校—保护地课程共建', 10),
  ('edge-c2', 'cooperation', 'coop-ngo-see', 'coop-gov-pa', 'co_build', 3, '公益与志愿者协同', 11),
  ('edge-c3', 'cooperation', 'coop-soc-esg', 'coop-ngo-mcf', 'co_build', 2, 'ESG 公益联名', 12),
  ('edge-c4', 'cooperation', 'coop-soc-uni', 'coop-gov-pa', 'co_build', 3, '公民科学数据协作', 13),
  ('edge-c5', 'cooperation', 'coop-soc-tour', 'coop-gov-pa', 'co_build', 4, '研学线路协同', 14),
  ('edge-c6', 'cooperation', 'coop-gov-dept', 'coop-gov-pa', 'co_build', 2, '基地与政策指导', 15),
  ('edge-c7', 'cooperation', 'coop-gov-county', 'coop-gov-pa', 'co_build', 2, '属地协同', 16),
  ('edge-c8', 'cooperation', 'coop-ngo-vol', 'coop-gov-pa', 'co_build', 2, '志愿者进保护地', 17),
  ('edge-i1', 'impact', 'impact-habitat-1', 'impact-community-1', 'service_coverage', 3, null, 20),
  ('edge-i2', 'impact', 'impact-community-1', 'impact-school-1', 'service_coverage', 4, null, 21),
  ('edge-s1', 'science', 'species-1', 'species-2', 'observation_route', 2, '样线记录', 30);
