-- 购课信息采集：详细地址列；探索活动地图：合并 enrollments + leads 坐标（去重优先 enrollment）

alter table public.leads
  add column if not exists contact_address_detail text;

comment on column public.leads.contact_address_detail is '用户填写的详细地址（与地图选点坐标、contact_poi 配套）';

-- 探索活动地图：仅返回坐标与活动 slug，不暴露 user_id / 联系方式
create or replace function public.tm_program_exploration_map_points(p_since interval default interval '30 days')
returns table (
  lat double precision,
  lng double precision,
  catalog_slug text,
  source text
)
language sql
stable
security definer
set search_path = public
as $$
  with combined as (
    select
      e.user_id::text as user_key,
      trim(e.catalog_slug) as catalog_slug,
      e.latitude::double precision as lat,
      e.longitude::double precision as lng,
      1 as source_rank,
      coalesce(e.updated_at, e.created_at) as ts
    from public.platform_exploration_enrollments e
    where e.latitude is not null
      and e.longitude is not null
      and length(trim(e.catalog_slug)) > 0
      and coalesce(e.updated_at, e.created_at) >= (now() - p_since)

    union all

    select
      coalesce(l.created_by_user_id::text, l.id::text) as user_key,
      trim(l.extra->>'programSlug') as catalog_slug,
      l.contact_latitude::double precision as lat,
      l.contact_longitude::double precision as lng,
      2 as source_rank,
      l.created_at as ts
    from public.leads l
    where l.contact_latitude is not null
      and l.contact_longitude is not null
      and length(trim(coalesce(l.extra->>'programSlug', ''))) > 0
      and l.created_at >= (now() - p_since)
  ),
  deduped as (
    select distinct on (c.user_key, c.catalog_slug)
      c.lat,
      c.lng,
      c.catalog_slug,
      case when c.source_rank = 1 then 'enrollment' else 'lead' end as src
    from combined c
    order by c.user_key, c.catalog_slug, c.source_rank asc, c.ts desc
  )
  select d.lat, d.lng, d.catalog_slug, d.src as source from deduped d;
$$;

comment on function public.tm_program_exploration_map_points(interval) is
  '探索活动地图参与者点位：platform_exploration_enrollments 与 leads（extra.programSlug）合并；同一 user+活动优先 enrollment';

revoke all on function public.tm_program_exploration_map_points(interval) from public;
grant execute on function public.tm_program_exploration_map_points(interval) to anon, authenticated;
