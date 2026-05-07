-- 公益报名：项目 slug + 公开 KPI RPC（SECURITY DEFINER，供地图/大屏匿名读聚合）

alter table public.platform_welfare_enrollments
  add column if not exists welfare_project_slug text;

comment on column public.platform_welfare_enrollments.welfare_project_slug is
  '公益项目选项：eco-culture | citizen-science | child-nature-class | community-capacity；与 catalog_slug=shanhaiyun_volunteer 配合';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'platform_welfare_enrollments'
      and c.conname = 'platform_welfare_enrollments_project_slug_check'
  ) then
    alter table public.platform_welfare_enrollments
      add constraint platform_welfare_enrollments_project_slug_check check (
        welfare_project_slug is null
        or welfare_project_slug in (
          'eco-culture',
          'citizen-science',
          'child-nature-class',
          'community-capacity'
        )
      );
  end if;
end $$;

-- KPI 与 mapMetrics impact 四键对齐；口径见函数内注释
create or replace function public.get_public_welfare_enrollment_kpis()
returns table(metric_key text, label text, value_text text, trend text)
language sql
stable
security definer
set search_path = public
as $$
  select
    'service_people'::text,
    '公益服务人次'::text,
    (select coalesce(count(*)::text, '0') from public.platform_welfare_enrollments),
    'up'::text
  union all
  select
    'communities',
    '覆盖社区',
    (
      select coalesce(count(*)::text, '0')
      from public.platform_welfare_enrollments
      where welfare_project_slug = 'community-capacity'
    ),
    'up'
  union all
  select
    'schools',
    '覆盖学校',
    (
      select coalesce(count(*)::text, '0')
      from public.platform_welfare_enrollments
      where welfare_project_slug = 'child-nature-class'
    ),
    'up'
  union all
  select
    'volunteers',
    '志愿者人数',
    (
      select coalesce(count(*)::text, '0')
      from public.platform_welfare_enrollments
      where welfare_project_slug in ('citizen-science', 'eco-culture')
    ),
    'flat';
$$;

comment on function public.get_public_welfare_enrollment_kpis() is
  '公益地图 KPI：聚合 platform_welfare_enrollments；anon 可执行，不暴露明细行';

revoke all on function public.get_public_welfare_enrollment_kpis() from public;
grant execute on function public.get_public_welfare_enrollment_kpis() to anon, authenticated;
