-- 公益地图：匿名可读报名坐标（SECURITY DEFINER），供 Impact 地图大屏点位/热力
-- 不返回 user_id、PII；仅 enrollment id + 坐标 + 项目 slug + 状态

create or replace function public.get_public_welfare_enrollment_map_points(p_limit int default 500)
returns table (
  point_id uuid,
  lat double precision,
  lng double precision,
  welfare_project_slug text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.latitude,
    e.longitude,
    e.welfare_project_slug,
    e.status::text
  from public.platform_welfare_enrollments e
  where e.latitude is not null
    and e.longitude is not null
    and e.latitude between -90 and 90
    and e.longitude between -180 and 180
    and e.status <> 'dropped'::public.tm_engagement_status
  order by e.updated_at desc
  limit least(coalesce(nullif(p_limit, 0), 500), 2000);
$$;

comment on function public.get_public_welfare_enrollment_map_points(int) is
  '公益地图点位：platform_welfare_enrollments 坐标摘要；anon 可执行，不含用户标识与联系方式';

revoke all on function public.get_public_welfare_enrollment_map_points(int) from public;
grant execute on function public.get_public_welfare_enrollment_map_points(int) to anon, authenticated;
