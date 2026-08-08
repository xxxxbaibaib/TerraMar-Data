-- TerraMar 官网 CMS：staff 权限、内容表、媒体桶、审计日志
-- 可重复执行（IF NOT EXISTS / drop policy if exists）

-- ---------------------------------------------------------------------------
-- Staff flag on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_staff boolean not null default false;

comment on column public.profiles.is_staff is '官网 /admin 运营人员；仅 Dashboard/service_role 可提升，禁止用户自助改 true';

create or replace function public.tm_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_staff from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

revoke all on function public.tm_is_staff() from public;
grant execute on function public.tm_is_staff() to anon, authenticated;

-- 禁止非 staff 通过自己的 update 把自己升为 staff
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      is_staff = (select p.is_staff from public.profiles p where p.user_id = auth.uid())
      or public.tm_is_staff()
    )
  );

-- staff 可更新任意档案（用于运营场景；仍建议主要在 Dashboard 设 is_staff）
drop policy if exists profiles_update_staff on public.profiles;
create policy profiles_update_staff
  on public.profiles for update
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $enum_cms_status$ begin
  create type public.tm_cms_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $enum_cms_status$;

-- ---------------------------------------------------------------------------
-- site_settings（单行）
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  brand_name text not null default 'TerraMar Expeditions 山海自然科考',
  tagline text not null default '让保护被看见，让自然可感知，让参与有意义。',
  service_region text not null default '长三角优先',
  phone text not null default '',
  wechat text not null default '',
  email text not null default '',
  business_email text not null default '',
  logo_url text not null default '/logo-brand.png',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.tm_set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists site_settings_select_public on public.site_settings;
create policy site_settings_select_public
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists site_settings_write_staff on public.site_settings;
create policy site_settings_write_staff
  on public.site_settings for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.site_settings to anon, authenticated;
grant insert, update, delete on table public.site_settings to authenticated;

insert into public.site_settings (id, brand_name, tagline, service_region, phone, wechat, email, business_email, logo_url)
values (
  1,
  'TerraMar Expeditions 山海自然科考',
  '让保护被看见，让自然可感知，让参与有意义。',
  '长三角优先',
  '138-0000-0000',
  'TerraMarEdu',
  'hello@terramar.example',
  'partnership@terramar.example',
  '/logo-brand.png'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- site_pages
-- ---------------------------------------------------------------------------
create table if not exists public.site_pages (
  key text primary key,
  title text not null default '',
  status public.tm_cms_status not null default 'draft',
  blocks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz
);

drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at
  before update on public.site_pages
  for each row execute function public.tm_set_updated_at();

alter table public.site_pages enable row level security;

drop policy if exists site_pages_select_published on public.site_pages;
create policy site_pages_select_published
  on public.site_pages for select
  to anon, authenticated
  using (status = 'published' or public.tm_is_staff());

drop policy if exists site_pages_write_staff on public.site_pages;
create policy site_pages_write_staff
  on public.site_pages for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.site_pages to anon, authenticated;
grant insert, update, delete on table public.site_pages to authenticated;

insert into public.site_pages (key, title, status, blocks, published_at) values
(
  'home',
  '首页',
  'published',
  '{
    "eyebrow": "Learning with the living world",
    "headline": "让保护被看见，让自然可感知，让参与有意义。",
    "subtitle": "清华团队成立，致力于国家公园自然教育体系研究，文化传播，社区能力建设。",
    "primaryCtaLabel": "查看近期活动",
    "primaryCtaHref": "/programs",
    "secondaryCtaLabel": "了解我们的使命",
    "secondaryCtaHref": "/about#mission"
  }'::jsonb,
  now()
),
(
  'about',
  '关于我们',
  'published',
  '{
    "heroTitle": "关于我们",
    "heroSubtitle": "TerraMar 山海自然科考致力于让更多人理解保护地、理解生命，并参与到真实的自然保护行动中。",
    "visionTitle": "品牌愿景",
    "visionBody": "我们坚信，一家真正成功的自然教育机构，其价值不应仅以营收和利润衡量，更应以它唤醒了多少人对自然的热爱、改变了多少儿童的生命轨迹、贡献了多少保护地的科研数据、带动了多少社区的发展来定义。这正是本机构存在的根本意义。"
  }'::jsonb,
  now()
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  bio text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  status public.tm_cms_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz
);

create index if not exists team_members_status_sort_idx on public.team_members (status, sort_order, name);

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.tm_set_updated_at();

alter table public.team_members enable row level security;

drop policy if exists team_members_select_published on public.team_members;
create policy team_members_select_published
  on public.team_members for select
  to anon, authenticated
  using (status = 'published' or public.tm_is_staff());

drop policy if exists team_members_write_staff on public.team_members;
create policy team_members_write_staff
  on public.team_members for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.team_members to anon, authenticated;
grant insert, update, delete on table public.team_members to authenticated;

insert into public.team_members (name, role, bio, image_url, sort_order, status, published_at)
select * from (values
  (
    '吴清龙',
    '创始人',
    '清华大学建筑学院风景园林硕士，中国风景园林学会会员，山海自然科考创始人。 2024 IFLA-AAPME 国际风景园林奖杰出奖获得者；曾任职于清华大学国家公园研究院、中国城市规划设计研究院，聚焦自然保护地生态保护、社区发展与科普教育。核心参与钱江源、武夷山及浙江自然保护地志愿者体系等多项课题与实践；合编《钱江源国家公园文化资源管理手册》《景观生态学》教材等。',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    10,
    'published'::public.tm_cms_status,
    now()
  ),
  (
    '高泽宁',
    '课程与产品部门负责人',
    '清华大学建筑学院风景园林博士，美国亚利桑那州立大学 LESL 访问学者；山海自然科考课程与产品部门负责人。获 2024 IFLA-AAPME 分析与规划类卓越奖、清华大学未来学者奖学金等。参与国家自然科学基金国家公园相关课题，参与钱江源、百山祖、武夷山、大熊猫国家公园、泰山等多地规划建设，并考察全球二十余个国家公园；研究成果发表于 Geography and Sustainability 等，多次在国内外国家公园与景观生态学术会议报告。',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    20,
    'published'::public.tm_cms_status,
    now()
  ),
  (
    '唐明晖',
    '运营与安全部门负责人',
    '山海自然科考运营与安全部门负责人。深耕城市公园生态绿化、生态修复与景观营建领域6年，曾任地方城投园林绿化管理岗，主导市政公园绿地新建、生态修复及景观升级类项目落地，长期专注乡土植物应用、公园生态系统构建及生物多样性保护实践。',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    30,
    'published'::public.tm_cms_status,
    now()
  )
) as v(name, role, bio, image_url, sort_order, status, published_at)
where not exists (select 1 from public.team_members limit 1);

-- ---------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'cms-media',
  path text not null,
  public_url text not null,
  kind text not null default 'image' check (kind in ('image', 'video', 'other')),
  alt text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (bucket, path)
);

alter table public.media_assets enable row level security;

drop policy if exists media_assets_select_public on public.media_assets;
create policy media_assets_select_public
  on public.media_assets for select
  to anon, authenticated
  using (true);

drop policy if exists media_assets_write_staff on public.media_assets;
create policy media_assets_write_staff
  on public.media_assets for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.media_assets to anon, authenticated;
grant insert, update, delete on table public.media_assets to authenticated;

-- Storage bucket cms-media
insert into storage.buckets (id, name, public)
values ('cms-media', 'cms-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "cms_media_public_read" on storage.objects;
create policy "cms_media_public_read"
  on storage.objects for select
  using (bucket_id = 'cms-media');

drop policy if exists "cms_media_staff_insert" on storage.objects;
create policy "cms_media_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cms-media' and public.tm_is_staff());

drop policy if exists "cms_media_staff_update" on storage.objects;
create policy "cms_media_staff_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'cms-media' and public.tm_is_staff())
  with check (bucket_id = 'cms-media' and public.tm_is_staff());

drop policy if exists "cms_media_staff_delete" on storage.objects;
create policy "cms_media_staff_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cms-media' and public.tm_is_staff());

-- staff 可写 background video（替换 Hero）
drop policy if exists "cms_background_video_staff_insert" on storage.objects;
create policy "cms_background_video_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'background video' and public.tm_is_staff());

drop policy if exists "cms_background_video_staff_update" on storage.objects;
create policy "cms_background_video_staff_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'background video' and public.tm_is_staff())
  with check (bucket_id = 'background video' and public.tm_is_staff());

drop policy if exists "cms_background_video_staff_delete" on storage.objects;
create policy "cms_background_video_staff_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'background video' and public.tm_is_staff());

-- ---------------------------------------------------------------------------
-- cms_programs（官网活动目录）
-- ---------------------------------------------------------------------------
create table if not exists public.cms_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status public.tm_cms_status not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz
);

create index if not exists cms_programs_status_sort_idx on public.cms_programs (status, sort_order, slug);

drop trigger if exists cms_programs_set_updated_at on public.cms_programs;
create trigger cms_programs_set_updated_at
  before update on public.cms_programs
  for each row execute function public.tm_set_updated_at();

alter table public.cms_programs enable row level security;

drop policy if exists cms_programs_select_published on public.cms_programs;
create policy cms_programs_select_published
  on public.cms_programs for select
  to anon, authenticated
  using (status = 'published' or public.tm_is_staff());

drop policy if exists cms_programs_write_staff on public.cms_programs;
create policy cms_programs_write_staff
  on public.cms_programs for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.cms_programs to anon, authenticated;
grant insert, update, delete on table public.cms_programs to authenticated;

-- ---------------------------------------------------------------------------
-- cms_resource_articles
-- ---------------------------------------------------------------------------
create table if not exists public.cms_resource_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default '',
  summary text not null default '',
  article_date date,
  paragraphs jsonb not null default '[]'::jsonb,
  video_url text,
  status public.tm_cms_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz
);

create index if not exists cms_resource_articles_status_sort_idx on public.cms_resource_articles (status, sort_order, slug);

drop trigger if exists cms_resource_articles_set_updated_at on public.cms_resource_articles;
create trigger cms_resource_articles_set_updated_at
  before update on public.cms_resource_articles
  for each row execute function public.tm_set_updated_at();

alter table public.cms_resource_articles enable row level security;

drop policy if exists cms_resource_articles_select_published on public.cms_resource_articles;
create policy cms_resource_articles_select_published
  on public.cms_resource_articles for select
  to anon, authenticated
  using (status = 'published' or public.tm_is_staff());

drop policy if exists cms_resource_articles_write_staff on public.cms_resource_articles;
create policy cms_resource_articles_write_staff
  on public.cms_resource_articles for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.cms_resource_articles to anon, authenticated;
grant insert, update, delete on table public.cms_resource_articles to authenticated;

-- ---------------------------------------------------------------------------
-- hero_media
-- ---------------------------------------------------------------------------
create table if not exists public.hero_media (
  page_key text primary key,
  label text not null default '',
  storage_bucket text not null default 'background video',
  storage_path text not null default '',
  public_url text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists hero_media_set_updated_at on public.hero_media;
create trigger hero_media_set_updated_at
  before update on public.hero_media
  for each row execute function public.tm_set_updated_at();

alter table public.hero_media enable row level security;

drop policy if exists hero_media_select_public on public.hero_media;
create policy hero_media_select_public
  on public.hero_media for select
  to anon, authenticated
  using (true);

drop policy if exists hero_media_write_staff on public.hero_media;
create policy hero_media_write_staff
  on public.hero_media for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant select on table public.hero_media to anon, authenticated;
grant insert, update, delete on table public.hero_media to authenticated;

insert into public.hero_media (page_key, label, storage_bucket, storage_path, public_url) values
  ('home', '首页', 'background video', 'Video-1777349956294.mp4', ''),
  ('programs', '科考活动', 'background video', 'Video-1777350701136.mp4', ''),
  ('cooperation', '合作共建', 'background video', 'Video-1777350338781.mp4', ''),
  ('impact', '公益行动', 'background video', 'Video-1777360155117.mp4', ''),
  ('science', '科研与公民科学', 'background video', 'Video-1777361552225.mp4', '')
on conflict (page_key) do nothing;

-- ---------------------------------------------------------------------------
-- cms_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.cms_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cms_audit_log_created_at_idx on public.cms_audit_log (created_at desc);

alter table public.cms_audit_log enable row level security;

drop policy if exists cms_audit_log_select_staff on public.cms_audit_log;
create policy cms_audit_log_select_staff
  on public.cms_audit_log for select
  to authenticated
  using (public.tm_is_staff());

drop policy if exists cms_audit_log_insert_staff on public.cms_audit_log;
create policy cms_audit_log_insert_staff
  on public.cms_audit_log for insert
  to authenticated
  with check (public.tm_is_staff());

grant select, insert on table public.cms_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Staff policies for existing ops tables
-- ---------------------------------------------------------------------------
drop policy if exists leads_select_staff on public.leads;
create policy leads_select_staff
  on public.leads for select
  to authenticated
  using (public.tm_is_staff());

drop policy if exists map_locations_write_staff on public.map_locations;
create policy map_locations_write_staff
  on public.map_locations for all
  to authenticated
  using (public.tm_is_staff())
  with check (public.tm_is_staff());

grant insert, update, delete on table public.map_locations to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'map_dashboard_metrics') then
    execute 'drop policy if exists map_dashboard_metrics_write_staff on public.map_dashboard_metrics';
    execute $p$
      create policy map_dashboard_metrics_write_staff
        on public.map_dashboard_metrics for all
        to authenticated
        using (public.tm_is_staff())
        with check (public.tm_is_staff())
    $p$;
    execute 'grant insert, update, delete on table public.map_dashboard_metrics to authenticated';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_species_records') then
    execute 'drop policy if exists platform_species_records_select_staff on public.platform_species_records';
    execute $p$
      create policy platform_species_records_select_staff
        on public.platform_species_records for select
        to authenticated
        using (public.tm_is_staff())
    $p$;
    execute 'drop policy if exists platform_species_records_update_staff on public.platform_species_records';
    execute $p$
      create policy platform_species_records_update_staff
        on public.platform_species_records for update
        to authenticated
        using (public.tm_is_staff())
        with check (public.tm_is_staff())
    $p$;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_experience_guides') then
    execute 'drop policy if exists platform_experience_guides_select_staff on public.platform_experience_guides';
    execute $p$
      create policy platform_experience_guides_select_staff
        on public.platform_experience_guides for select
        to authenticated
        using (public.tm_is_staff())
    $p$;
    execute 'drop policy if exists platform_experience_guides_update_staff on public.platform_experience_guides';
    execute $p$
      create policy platform_experience_guides_update_staff
        on public.platform_experience_guides for update
        to authenticated
        using (public.tm_is_staff())
        with check (public.tm_is_staff())
    $p$;
  end if;
end $$;
