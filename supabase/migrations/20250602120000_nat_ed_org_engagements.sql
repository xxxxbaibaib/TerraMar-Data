-- TerraMar: 自然教育机构+伙伴项目、个人参与（课程/公益/公民科学项目）、扩展物种记录
-- 依赖: 20250506000000_p0_profiles_leads_orders.sql（tm_set_updated_at、tm_org_verification_status）
--       20250601120000_p1_product_tables_auth_only_leads.sql（species_observations）
--
-- engagement_domain 与前端 slug 的对应关系见 docs/PRD_TerraMar_Backend_Supabase_v1.md §4.10

-- ---------------------------------------------------------------------------
-- Enums（可重复执行：已存在则跳过）
-- ---------------------------------------------------------------------------
do $enum_org_partner$ begin
  create type public.tm_org_partner_unit_type as enum ('organization', 'partner_project');
exception
  when duplicate_object then null;
end $enum_org_partner$;

do $enum_engagement_domain$ begin
  create type public.tm_engagement_domain as enum (
    'natural_education_program',
    'welfare_action',
    'citizen_science_project'
  );
exception
  when duplicate_object then null;
end $enum_engagement_domain$;

do $enum_engagement_status$ begin
  create type public.tm_engagement_status as enum (
    'interested',
    'registered',
    'completed',
    'dropped'
  );
exception
  when duplicate_object then null;
end $enum_engagement_status$;

-- ---------------------------------------------------------------------------
-- 机构 + 伙伴项目（自关联：机构 parent_id null；伙伴 parent_id → 机构 id）
-- ---------------------------------------------------------------------------
create table if not exists public.org_partner_units (
  id uuid primary key default gen_random_uuid(),
  unit_type public.tm_org_partner_unit_type not null,
  parent_id uuid references public.org_partner_units (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  summary text,
  contact text,
  location jsonb,
  metadata jsonb not null default '{}'::jsonb,
  verification_status public.tm_org_verification_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_partner_units_parent_shape check (
    (
      unit_type = 'organization'::public.tm_org_partner_unit_type
      and parent_id is null
    )
    or (
      unit_type = 'partner_project'::public.tm_org_partner_unit_type
      and parent_id is not null
    )
  )
);

create index if not exists org_partner_units_parent_id_idx on public.org_partner_units (parent_id);
create index if not exists org_partner_units_owner_user_id_idx on public.org_partner_units (owner_user_id);
create index if not exists org_partner_units_type_parent_idx on public.org_partner_units (unit_type, parent_id);

drop trigger if exists org_partner_units_set_updated_at on public.org_partner_units;
create trigger org_partner_units_set_updated_at
  before update on public.org_partner_units
  for each row execute function public.tm_set_updated_at();

-- 伙伴项目行的 owner_user_id 与父机构一致（便于 RLS，无需递归）
create or replace function public.org_partner_units_inherit_owner_from_parent()
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
    from public.org_partner_units u
    where u.id = new.parent_id;

    if p_owner is null then
      raise exception 'org_partner_units: parent % not found', new.parent_id;
    end if;

    if p_type <> 'organization'::public.tm_org_partner_unit_type then
      raise exception 'org_partner_units: parent must be organization';
    end if;

    new.owner_user_id := p_owner;
  end if;

  return new;
end;
$$;

drop trigger if exists org_partner_units_inherit_owner on public.org_partner_units;
create trigger org_partner_units_inherit_owner
  before insert or update on public.org_partner_units
  for each row execute function public.org_partner_units_inherit_owner_from_parent();

-- ---------------------------------------------------------------------------
-- 个人 × 自然教育课程活动 / 公益行动 / 公民科学家项目（单表）
-- ---------------------------------------------------------------------------
create table if not exists public.member_nat_ed_engagements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  engagement_domain public.tm_engagement_domain not null,
  catalog_slug text not null,
  status public.tm_engagement_status not null default 'interested',
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_nat_ed_engagements_catalog_slug_nonempty check (length(trim(catalog_slug)) > 0)
);

create unique index if not exists member_nat_ed_engagements_user_domain_slug_uidx
  on public.member_nat_ed_engagements (user_id, engagement_domain, catalog_slug);

create index if not exists member_nat_ed_engagements_user_created_idx
  on public.member_nat_ed_engagements (user_id, created_at desc);

drop trigger if exists member_nat_ed_engagements_set_updated_at on public.member_nat_ed_engagements;
create trigger member_nat_ed_engagements_set_updated_at
  before update on public.member_nat_ed_engagements
  for each row execute function public.tm_set_updated_at();

-- ---------------------------------------------------------------------------
-- 扩展物种记录（沿用 species_observations）
-- ---------------------------------------------------------------------------
alter table public.species_observations
  add column if not exists species_name_latin text;

alter table public.species_observations
  add column if not exists citizen_science_project_slug text;

alter table public.species_observations
  add column if not exists idempotency_key text;

create unique index if not exists species_observations_idempotency_key_uidx
  on public.species_observations (idempotency_key)
  where idempotency_key is not null;

create index if not exists species_observations_project_slug_idx
  on public.species_observations (citizen_science_project_slug)
  where citizen_science_project_slug is not null;

-- ---------------------------------------------------------------------------
-- RLS（仅 authenticated；anon 无 grant）
-- ---------------------------------------------------------------------------
alter table public.org_partner_units enable row level security;
alter table public.member_nat_ed_engagements enable row level security;

drop policy if exists org_partner_units_select_own on public.org_partner_units;
create policy org_partner_units_select_own
  on public.org_partner_units for select to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists org_partner_units_insert_own on public.org_partner_units;
create policy org_partner_units_insert_own
  on public.org_partner_units for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists org_partner_units_update_own on public.org_partner_units;
create policy org_partner_units_update_own
  on public.org_partner_units for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists org_partner_units_delete_own on public.org_partner_units;
create policy org_partner_units_delete_own
  on public.org_partner_units for delete to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists member_nat_ed_engagements_select_own on public.member_nat_ed_engagements;
create policy member_nat_ed_engagements_select_own
  on public.member_nat_ed_engagements for select to authenticated
  using (user_id = auth.uid());

drop policy if exists member_nat_ed_engagements_insert_own on public.member_nat_ed_engagements;
create policy member_nat_ed_engagements_insert_own
  on public.member_nat_ed_engagements for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists member_nat_ed_engagements_update_own on public.member_nat_ed_engagements;
create policy member_nat_ed_engagements_update_own
  on public.member_nat_ed_engagements for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists member_nat_ed_engagements_delete_own on public.member_nat_ed_engagements;
create policy member_nat_ed_engagements_delete_own
  on public.member_nat_ed_engagements for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants（不向 anon 授写权限）
-- ---------------------------------------------------------------------------
grant usage on type public.tm_org_partner_unit_type to authenticated;
grant usage on type public.tm_engagement_domain to authenticated;
grant usage on type public.tm_engagement_status to authenticated;

grant select, insert, update, delete on table public.org_partner_units to authenticated;
grant select, insert, update, delete on table public.member_nat_ed_engagements to authenticated;
