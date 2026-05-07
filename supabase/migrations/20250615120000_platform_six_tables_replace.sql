-- TerraMar：六域业务表替换（合作共建 / 探索 / 公益 / 公民科学参与 / 物种记录）
-- 依赖：P0 profiles、P1 species_observations、nat_ed org+engagements、org 经纬度迁移、地图公开读迁移
-- 行为：从 org_partner_units / member_nat_ed_engagements / species_observations 搬数据后 DROP 旧表；
--       profiles 仍为「用户总表」；物种媒体列绑定 Storage 桶 `species pictures`、`spicies video`

-- ---------------------------------------------------------------------------
-- 1) 新表：合作共建（替代 org_partner_units）
-- ---------------------------------------------------------------------------
create table public.platform_co_building_units (
  id uuid primary key default gen_random_uuid(),
  unit_type public.tm_org_partner_unit_type not null,
  parent_id uuid references public.platform_co_building_units (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  summary text,
  contact text,
  metadata jsonb not null default '{}'::jsonb,
  verification_status public.tm_org_verification_status,
  staff_headcount integer,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_co_building_units_parent_shape check (
    (
      unit_type = 'organization'::public.tm_org_partner_unit_type
      and parent_id is null
    )
    or (
      unit_type = 'partner_project'::public.tm_org_partner_unit_type
      and parent_id is not null
    )
  ),
  constraint platform_co_building_units_lat_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint platform_co_building_units_lng_check check (
    longitude is null or longitude between -180 and 180
  )
);

create index platform_co_building_units_parent_id_idx on public.platform_co_building_units (parent_id);
create index platform_co_building_units_owner_user_id_idx on public.platform_co_building_units (owner_user_id);
create index platform_co_building_units_type_parent_idx on public.platform_co_building_units (unit_type, parent_id);

drop trigger if exists platform_co_building_units_set_updated_at on public.platform_co_building_units;
create trigger platform_co_building_units_set_updated_at
  before update on public.platform_co_building_units
  for each row execute function public.tm_set_updated_at();

create or replace function public.platform_co_building_units_inherit_owner_from_parent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  p_owner uuid;
  p_type public.tm_org_partner_unit_type;
begin
  if new.unit_type = 'partner_project'::public.tm_org_partner_unit_type
     and new.parent_id is not null then
    select u.owner_user_id, u.unit_type into p_owner, p_type
    from public.platform_co_building_units u
    where u.id = new.parent_id;

    if p_owner is null then
      raise exception 'platform_co_building_units: parent % not found', new.parent_id;
    end if;

    if p_type <> 'organization'::public.tm_org_partner_unit_type then
      raise exception 'platform_co_building_units: parent must be organization';
    end if;

    new.owner_user_id := p_owner;
  end if;

  return new;
end;
$$;

drop trigger if exists platform_co_building_units_inherit_owner on public.platform_co_building_units;
create trigger platform_co_building_units_inherit_owner
  before insert or update on public.platform_co_building_units
  for each row execute function public.platform_co_building_units_inherit_owner_from_parent();

-- ---------------------------------------------------------------------------
-- 2) 新表：探索活动 / 公益行动 / 公民科学项目参与（替代 member_nat_ed_engagements 单表）
-- ---------------------------------------------------------------------------
create table public.platform_exploration_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_slug text not null,
  status public.tm_engagement_status not null default 'interested',
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_exploration_enrollments_catalog_slug_nonempty check (length(trim(catalog_slug)) > 0),
  constraint platform_exploration_enrollments_lat_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint platform_exploration_enrollments_lng_check check (
    longitude is null or longitude between -180 and 180
  )
);

create unique index platform_exploration_enrollments_user_slug_uidx
  on public.platform_exploration_enrollments (user_id, catalog_slug);

create index platform_exploration_enrollments_user_created_idx
  on public.platform_exploration_enrollments (user_id, created_at desc);

drop trigger if exists platform_exploration_enrollments_set_updated_at on public.platform_exploration_enrollments;
create trigger platform_exploration_enrollments_set_updated_at
  before update on public.platform_exploration_enrollments
  for each row execute function public.tm_set_updated_at();

create table public.platform_welfare_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_slug text not null,
  status public.tm_engagement_status not null default 'interested',
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_welfare_enrollments_catalog_slug_nonempty check (length(trim(catalog_slug)) > 0),
  constraint platform_welfare_enrollments_lat_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint platform_welfare_enrollments_lng_check check (
    longitude is null or longitude between -180 and 180
  )
);

create unique index platform_welfare_enrollments_user_slug_uidx
  on public.platform_welfare_enrollments (user_id, catalog_slug);

create index platform_welfare_enrollments_user_created_idx
  on public.platform_welfare_enrollments (user_id, created_at desc);

drop trigger if exists platform_welfare_enrollments_set_updated_at on public.platform_welfare_enrollments;
create trigger platform_welfare_enrollments_set_updated_at
  before update on public.platform_welfare_enrollments
  for each row execute function public.tm_set_updated_at();

create table public.platform_citizen_science_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_slug text not null,
  status public.tm_engagement_status not null default 'interested',
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_citizen_science_enrollments_catalog_slug_nonempty check (length(trim(catalog_slug)) > 0),
  constraint platform_citizen_science_enrollments_lat_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint platform_citizen_science_enrollments_lng_check check (
    longitude is null or longitude between -180 and 180
  )
);

create unique index platform_citizen_science_enrollments_user_slug_uidx
  on public.platform_citizen_science_enrollments (user_id, catalog_slug);

create index platform_citizen_science_enrollments_user_created_idx
  on public.platform_citizen_science_enrollments (user_id, created_at desc);

drop trigger if exists platform_citizen_science_enrollments_set_updated_at on public.platform_citizen_science_enrollments;
create trigger platform_citizen_science_enrollments_set_updated_at
  before update on public.platform_citizen_science_enrollments
  for each row execute function public.tm_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) 新表：物种记录（替代 species_observations；媒体列显式绑定 Storage 桶）
-- ---------------------------------------------------------------------------
create table public.platform_species_records (
  id uuid primary key default gen_random_uuid(),
  observer_user_id uuid not null references auth.users (id) on delete cascade,
  species_name_cn text not null,
  species_name_latin text,
  observed_at timestamptz not null default now(),
  location jsonb,
  latitude double precision,
  longitude double precision,
  verification_status public.tm_species_verification_status not null default 'pending_review',
  image_storage_bucket text,
  image_storage_path text,
  video_storage_bucket text,
  video_storage_path text,
  citizen_science_project_slug text,
  idempotency_key text,
  notes text,
  created_at timestamptz not null default now(),
  constraint platform_species_records_lat_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint platform_species_records_lng_check check (
    longitude is null or longitude between -180 and 180
  )
);

create unique index platform_species_records_idempotency_key_uidx
  on public.platform_species_records (idempotency_key)
  where idempotency_key is not null;

create index platform_species_records_observer_created_idx
  on public.platform_species_records (observer_user_id, created_at desc);

create index platform_species_records_project_slug_idx
  on public.platform_species_records (citizen_science_project_slug)
  where citizen_science_project_slug is not null;

comment on table public.platform_co_building_units is '合作共建：机构 + 伙伴项目（替代 org_partner_units）';
comment on table public.platform_exploration_enrollments is '探索活动参与（替代 member_nat_ed_engagements 中 natural_education_program）';
comment on table public.platform_welfare_enrollments is '公益行动参与（替代 welfare_action）';
comment on table public.platform_citizen_science_enrollments is '公民科学项目参与（替代 citizen_science_project）';
comment on table public.platform_species_records is '物种记录；图片桶 species pictures，视频桶 spicies video（与控制台一致）';
comment on column public.platform_species_records.image_storage_bucket is '默认 species pictures；与 image_storage_path 成对使用';
comment on column public.platform_species_records.video_storage_bucket is '默认 spicies video；与 video_storage_path 成对使用';

-- ---------------------------------------------------------------------------
-- 4) 数据迁移（旧表仍存在）
-- ---------------------------------------------------------------------------
-- 自引用 FK：先机构根行，再伙伴子行
insert into public.platform_co_building_units (
  id, unit_type, parent_id, owner_user_id, name, summary, contact, metadata,
  verification_status, staff_headcount, latitude, longitude, created_at, updated_at
)
select
  o.id,
  o.unit_type,
  o.parent_id,
  o.owner_user_id,
  o.name,
  o.summary,
  o.contact,
  o.metadata,
  o.verification_status,
  o.staff_headcount,
  o.latitude,
  o.longitude,
  o.created_at,
  o.updated_at
from public.org_partner_units o
where o.parent_id is null;

insert into public.platform_co_building_units (
  id, unit_type, parent_id, owner_user_id, name, summary, contact, metadata,
  verification_status, staff_headcount, latitude, longitude, created_at, updated_at
)
select
  o.id,
  o.unit_type,
  o.parent_id,
  o.owner_user_id,
  o.name,
  o.summary,
  o.contact,
  o.metadata,
  o.verification_status,
  o.staff_headcount,
  o.latitude,
  o.longitude,
  o.created_at,
  o.updated_at
from public.org_partner_units o
where o.parent_id is not null;

insert into public.platform_exploration_enrollments (
  id, user_id, catalog_slug, status, latitude, longitude, metadata, idempotency_key, created_at, updated_at
)
select
  e.id,
  e.user_id,
  e.catalog_slug,
  e.status,
  null::double precision,
  null::double precision,
  e.metadata,
  e.idempotency_key,
  e.created_at,
  e.updated_at
from public.member_nat_ed_engagements e
where e.engagement_domain = 'natural_education_program'::public.tm_engagement_domain;

insert into public.platform_welfare_enrollments (
  id, user_id, catalog_slug, status, latitude, longitude, metadata, idempotency_key, created_at, updated_at
)
select
  e.id,
  e.user_id,
  e.catalog_slug,
  e.status,
  null::double precision,
  null::double precision,
  e.metadata,
  e.idempotency_key,
  e.created_at,
  e.updated_at
from public.member_nat_ed_engagements e
where e.engagement_domain = 'welfare_action'::public.tm_engagement_domain;

insert into public.platform_citizen_science_enrollments (
  id, user_id, catalog_slug, status, latitude, longitude, metadata, idempotency_key, created_at, updated_at
)
select
  e.id,
  e.user_id,
  e.catalog_slug,
  e.status,
  null::double precision,
  null::double precision,
  e.metadata,
  e.idempotency_key,
  e.created_at,
  e.updated_at
from public.member_nat_ed_engagements e
where e.engagement_domain = 'citizen_science_project'::public.tm_engagement_domain;

insert into public.platform_species_records (
  id,
  observer_user_id,
  species_name_cn,
  species_name_latin,
  observed_at,
  location,
  latitude,
  longitude,
  verification_status,
  image_storage_bucket,
  image_storage_path,
  video_storage_bucket,
  video_storage_path,
  citizen_science_project_slug,
  idempotency_key,
  notes,
  created_at
)
select
  s.id,
  s.observer_user_id,
  s.species_name_cn,
  s.species_name_latin,
  s.observed_at,
  s.location,
  case
    when s.location is not null and (s.location ? 'lat')
    then ((s.location->>'lat')::double precision)
    else null
  end,
  case
    when s.location is not null and (s.location ? 'lng')
    then ((s.location->>'lng')::double precision)
    else null
  end,
  s.verification_status,
  case
    when s.image_storage_path is not null and length(trim(s.image_storage_path)) > 0
    then 'species pictures'::text
    else null
  end,
  s.image_storage_path,
  null::text,
  null::text,
  s.citizen_science_project_slug,
  s.idempotency_key,
  s.notes,
  s.created_at
from public.species_observations s;

-- ---------------------------------------------------------------------------
-- 5) 删除旧表上的策略 / 触发器 / 函数 / 表
-- ---------------------------------------------------------------------------
drop policy if exists org_partner_units_select_own on public.org_partner_units;
drop policy if exists org_partner_units_insert_own on public.org_partner_units;
drop policy if exists org_partner_units_update_own on public.org_partner_units;
drop policy if exists org_partner_units_delete_own on public.org_partner_units;
drop policy if exists org_partner_units_select_public_mapcoords on public.org_partner_units;

drop policy if exists member_nat_ed_engagements_select_own on public.member_nat_ed_engagements;
drop policy if exists member_nat_ed_engagements_insert_own on public.member_nat_ed_engagements;
drop policy if exists member_nat_ed_engagements_update_own on public.member_nat_ed_engagements;
drop policy if exists member_nat_ed_engagements_delete_own on public.member_nat_ed_engagements;

drop policy if exists species_observations_select_own on public.species_observations;
drop policy if exists species_observations_insert_own on public.species_observations;
drop policy if exists species_observations_update_own_pending on public.species_observations;
drop policy if exists species_observations_delete_own_pending on public.species_observations;
drop policy if exists species_observations_select_public_approved_map on public.species_observations;

revoke all on table public.org_partner_units from anon;
revoke all on table public.org_partner_units from authenticated;
revoke all on table public.member_nat_ed_engagements from authenticated;
revoke all on table public.species_observations from anon;
revoke all on table public.species_observations from authenticated;

drop trigger if exists org_partner_units_set_updated_at on public.org_partner_units;
drop trigger if exists org_partner_units_inherit_owner on public.org_partner_units;
drop trigger if exists member_nat_ed_engagements_set_updated_at on public.member_nat_ed_engagements;

drop function if exists public.org_partner_units_inherit_owner_from_parent() cascade;

drop table if exists public.member_nat_ed_engagements cascade;
drop table if exists public.species_observations cascade;
drop table if exists public.org_partner_units cascade;

-- ---------------------------------------------------------------------------
-- 6) RLS：合作共建 + 物种 + 三类参与
-- ---------------------------------------------------------------------------
alter table public.platform_co_building_units enable row level security;
alter table public.platform_exploration_enrollments enable row level security;
alter table public.platform_welfare_enrollments enable row level security;
alter table public.platform_citizen_science_enrollments enable row level security;
alter table public.platform_species_records enable row level security;

drop policy if exists platform_co_building_units_select_own on public.platform_co_building_units;
create policy platform_co_building_units_select_own
  on public.platform_co_building_units for select to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists platform_co_building_units_insert_own on public.platform_co_building_units;
create policy platform_co_building_units_insert_own
  on public.platform_co_building_units for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists platform_co_building_units_update_own on public.platform_co_building_units;
create policy platform_co_building_units_update_own
  on public.platform_co_building_units for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists platform_co_building_units_delete_own on public.platform_co_building_units;
create policy platform_co_building_units_delete_own
  on public.platform_co_building_units for delete to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists platform_co_building_units_select_public_mapcoords on public.platform_co_building_units;
create policy platform_co_building_units_select_public_mapcoords
  on public.platform_co_building_units for select
  to anon, authenticated
  using (
    latitude is not null
    and longitude is not null
    and latitude between -90 and 90
    and longitude between -180 and 180
  );

drop policy if exists platform_exploration_enrollments_select_own on public.platform_exploration_enrollments;
create policy platform_exploration_enrollments_select_own
  on public.platform_exploration_enrollments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_exploration_enrollments_insert_own on public.platform_exploration_enrollments;
create policy platform_exploration_enrollments_insert_own
  on public.platform_exploration_enrollments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists platform_exploration_enrollments_update_own on public.platform_exploration_enrollments;
create policy platform_exploration_enrollments_update_own
  on public.platform_exploration_enrollments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists platform_exploration_enrollments_delete_own on public.platform_exploration_enrollments;
create policy platform_exploration_enrollments_delete_own
  on public.platform_exploration_enrollments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_welfare_enrollments_select_own on public.platform_welfare_enrollments;
create policy platform_welfare_enrollments_select_own
  on public.platform_welfare_enrollments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_welfare_enrollments_insert_own on public.platform_welfare_enrollments;
create policy platform_welfare_enrollments_insert_own
  on public.platform_welfare_enrollments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists platform_welfare_enrollments_update_own on public.platform_welfare_enrollments;
create policy platform_welfare_enrollments_update_own
  on public.platform_welfare_enrollments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists platform_welfare_enrollments_delete_own on public.platform_welfare_enrollments;
create policy platform_welfare_enrollments_delete_own
  on public.platform_welfare_enrollments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_citizen_science_enrollments_select_own on public.platform_citizen_science_enrollments;
create policy platform_citizen_science_enrollments_select_own
  on public.platform_citizen_science_enrollments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_citizen_science_enrollments_insert_own on public.platform_citizen_science_enrollments;
create policy platform_citizen_science_enrollments_insert_own
  on public.platform_citizen_science_enrollments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists platform_citizen_science_enrollments_update_own on public.platform_citizen_science_enrollments;
create policy platform_citizen_science_enrollments_update_own
  on public.platform_citizen_science_enrollments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists platform_citizen_science_enrollments_delete_own on public.platform_citizen_science_enrollments;
create policy platform_citizen_science_enrollments_delete_own
  on public.platform_citizen_science_enrollments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists platform_species_records_select_own on public.platform_species_records;
create policy platform_species_records_select_own
  on public.platform_species_records for select to authenticated
  using (observer_user_id = auth.uid());

drop policy if exists platform_species_records_insert_own on public.platform_species_records;
create policy platform_species_records_insert_own
  on public.platform_species_records for insert to authenticated
  with check (observer_user_id = auth.uid());

drop policy if exists platform_species_records_update_own_pending on public.platform_species_records;
create policy platform_species_records_update_own_pending
  on public.platform_species_records for update to authenticated
  using (observer_user_id = auth.uid() and verification_status = 'pending_review')
  with check (
    observer_user_id = auth.uid()
    and verification_status = 'pending_review'::public.tm_species_verification_status
  );

drop policy if exists platform_species_records_delete_own_pending on public.platform_species_records;
create policy platform_species_records_delete_own_pending
  on public.platform_species_records for delete to authenticated
  using (observer_user_id = auth.uid() and verification_status = 'pending_review');

drop policy if exists platform_species_records_select_public_approved_map on public.platform_species_records;
create policy platform_species_records_select_public_approved_map
  on public.platform_species_records for select
  to anon, authenticated
  using (
    verification_status = 'approved'::public.tm_species_verification_status
    and (
      (
        location is not null
        and (location ? 'lat')
        and (location ? 'lng')
      )
      or (
        latitude is not null
        and longitude is not null
        and latitude between -90 and 90
        and longitude between -180 and 180
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Grants
-- ---------------------------------------------------------------------------
grant select on table public.platform_co_building_units to anon, authenticated;
grant select, insert, update, delete on table public.platform_co_building_units to authenticated;

grant select, insert, update, delete on table public.platform_exploration_enrollments to authenticated;
grant select, insert, update, delete on table public.platform_welfare_enrollments to authenticated;
grant select, insert, update, delete on table public.platform_citizen_science_enrollments to authenticated;

grant select on table public.platform_species_records to anon, authenticated;
grant select, insert, update, delete on table public.platform_species_records to authenticated;

grant usage on type public.tm_org_partner_unit_type to anon;
grant usage on type public.tm_org_verification_status to anon;
grant usage on type public.tm_species_verification_status to anon;

-- ---------------------------------------------------------------------------
-- 8) Storage：确保桶存在 + 登录用户仅可操作自己目录下对象（路径首段 = user id）
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('species pictures', 'species pictures', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('spicies video', 'spicies video', false)
on conflict (id) do nothing;

drop policy if exists "species_pictures_insert_own_prefix" on storage.objects;
drop policy if exists "species_pictures_select_own_prefix" on storage.objects;
drop policy if exists "species_pictures_update_own_prefix" on storage.objects;
drop policy if exists "species_pictures_delete_own_prefix" on storage.objects;

create policy "species_pictures_insert_own_prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'species pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "species_pictures_select_own_prefix"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'species pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "species_pictures_update_own_prefix"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'species pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'species pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "species_pictures_delete_own_prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'species pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spicies_video_insert_own_prefix" on storage.objects;
drop policy if exists "spicies_video_select_own_prefix" on storage.objects;
drop policy if exists "spicies_video_update_own_prefix" on storage.objects;
drop policy if exists "spicies_video_delete_own_prefix" on storage.objects;

create policy "spicies_video_insert_own_prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'spicies video'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "spicies_video_select_own_prefix"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'spicies video'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "spicies_video_update_own_prefix"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'spicies video'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'spicies video'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "spicies_video_delete_own_prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'spicies video'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
