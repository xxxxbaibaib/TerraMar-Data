-- 兼容已执行旧版 20250623120000（仅有 name、无 site_name/site_type）的库

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'platform_welfare_project_sites'
  ) then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'platform_welfare_project_sites' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'platform_welfare_project_sites' and column_name = 'site_name'
  ) then
    alter table public.platform_welfare_project_sites add column site_name text;
    alter table public.platform_welfare_project_sites add column site_type text;
    update public.platform_welfare_project_sites set site_name = name, site_type = '综合';
    alter table public.platform_welfare_project_sites alter column site_name set not null;
    alter table public.platform_welfare_project_sites alter column site_type set not null;
    alter table public.platform_welfare_project_sites drop column name;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'platform_welfare_project_sites' and column_name = 'site_type'
  ) then
    alter table public.platform_welfare_project_sites add column site_type text not null default '综合';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'platform_welfare_project_sites'
      and c.conname = 'platform_welfare_project_sites_site_type_check'
  ) then
    alter table public.platform_welfare_project_sites
      add constraint platform_welfare_project_sites_site_type_check check (
        site_type in ('保护地', '社区', '学校', '公众传播', '综合')
      );
  end if;
end $$;

comment on column public.platform_welfare_project_sites.site_name is '项目地名称（展示用）';
comment on column public.platform_welfare_project_sites.site_type is '项目地类型：保护地 / 社区 / 学校 / 公众传播 / 综合';

create index if not exists platform_welfare_project_sites_site_type_idx
  on public.platform_welfare_project_sites (site_type)
  where published = true;
