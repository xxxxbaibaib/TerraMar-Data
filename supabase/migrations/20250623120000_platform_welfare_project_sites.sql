-- 公益项目地：运营配置的点位与范围（点/面 GeoJSON），与 platform_welfare_enrollments（人）分离
-- 官网匿名只读 published；写入走 service_role / Dashboard

create table public.platform_welfare_project_sites (
  id uuid primary key default gen_random_uuid(),
  welfare_project_slug text,
  site_name text not null,
  site_type text not null,
  summary text,
  geometry_kind text not null,
  centroid_lat double precision not null,
  centroid_lng double precision not null,
  boundary_geojson jsonb,
  tags text[] not null default '{}'::text[],
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_welfare_project_sites_slug_check check (
    welfare_project_slug is null
    or welfare_project_slug in (
      'eco-culture',
      'citizen-science',
      'child-nature-class',
      'community-capacity'
    )
  ),
  constraint platform_welfare_project_sites_site_type_check check (
    site_type in ('保护地', '社区', '学校', '公众传播', '综合')
  ),
  constraint platform_welfare_project_sites_geometry_kind_check check (geometry_kind in ('point', 'polygon')),
  constraint platform_welfare_project_sites_centroid_lat_check check (centroid_lat between -90 and 90),
  constraint platform_welfare_project_sites_centroid_lng_check check (centroid_lng between -180 and 180)
);

comment on table public.platform_welfare_project_sites is
  '公益项目地：点或面（boundary_geojson），供 Impact 地图与报名表点位分层展示';

comment on column public.platform_welfare_project_sites.site_name is '项目地名称（展示用）';
comment on column public.platform_welfare_project_sites.site_type is '项目地类型：保护地 / 社区 / 学校 / 公众传播 / 综合（与运营分类一致，非几何类型）';
comment on column public.platform_welfare_project_sites.geometry_kind is 'point：仅用质心；polygon：boundary_geojson 存 GeoJSON Polygon/MultiPolygon geometry';
comment on column public.platform_welfare_project_sites.boundary_geojson is 'geometry_kind=polygon 时必填；为 GeoJSON geometry 对象（非完整 Feature）';

create index platform_welfare_project_sites_published_sort_idx
  on public.platform_welfare_project_sites (published, sort_order, id);

create index platform_welfare_project_sites_site_type_idx
  on public.platform_welfare_project_sites (site_type)
  where published = true;

drop trigger if exists platform_welfare_project_sites_set_updated_at on public.platform_welfare_project_sites;
create trigger platform_welfare_project_sites_set_updated_at
  before update on public.platform_welfare_project_sites
  for each row execute function public.tm_set_updated_at();

alter table public.platform_welfare_project_sites enable row level security;

drop policy if exists platform_welfare_project_sites_select_public on public.platform_welfare_project_sites;
create policy platform_welfare_project_sites_select_public
  on public.platform_welfare_project_sites
  for select
  to anon, authenticated
  using (published = true);

grant select on table public.platform_welfare_project_sites to anon, authenticated;

-- 种子：一条点（生态文化）、一条面（社区能力）——浙江附近，便于与现有 impact 视野一致
insert into public.platform_welfare_project_sites (
  welfare_project_slug,
  site_name,
  site_type,
  summary,
  geometry_kind,
  centroid_lat,
  centroid_lng,
  boundary_geojson,
  tags,
  published,
  sort_order
)
values
  (
    'eco-culture',
    '钱江源生态文化示范触点',
    '保护地',
    '演示数据：固定项目展示点，不含个人信息。',
    'point',
    29.22,
    118.31,
    null,
    array['保护地课程', '公众传播', '志愿者', '执行中']::text[],
    true,
    0
  ),
  (
    'community-capacity',
    '浙西社区能力建设服务片',
    '社区',
    '演示数据：多边形表示项目服务范围示意。',
    'polygon',
    29.96,
    119.52,
    '{
      "type": "Polygon",
      "coordinates": [
        [
          [119.48, 29.93],
          [119.56, 29.93],
          [119.56, 29.99],
          [119.48, 29.99],
          [119.48, 29.93]
        ]
      ]
    }'::jsonb,
    array['社区项目', '社区居民', '执行中']::text[],
    true,
    1
  );
