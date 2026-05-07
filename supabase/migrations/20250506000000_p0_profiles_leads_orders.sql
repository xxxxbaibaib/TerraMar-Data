-- TerraMar P0: profiles, leads, orders + RLS + auth signup profile row
-- Apply via Supabase Dashboard SQL editor or: supabase db push (linked project)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums（可重复执行：类型已存在则跳过，避免 42710 duplicate_object）
-- ---------------------------------------------------------------------------
do $enum_tm_membership_type$ begin
  create type public.tm_membership_type as enum ('individual', 'organization');
exception
  when duplicate_object then null;
end $enum_tm_membership_type$;

do $enum_tm_primary_role$ begin
  create type public.tm_primary_role as enum ('visitor', 'volunteer', 'citizen_scientist');
exception
  when duplicate_object then null;
end $enum_tm_primary_role$;

do $enum_tm_org_verification_status$ begin
  create type public.tm_org_verification_status as enum ('pending', 'verified');
exception
  when duplicate_object then null;
end $enum_tm_org_verification_status$;

do $enum_tm_order_status$ begin
  create type public.tm_order_status as enum (
    'pending_payment',
    'pending_fulfillment',
    'pending_receipt',
    'to_review',
    'refund_after_sale'
  );
exception
  when duplicate_object then null;
end $enum_tm_order_status$;

do $enum_tm_lead_type$ begin
  create type public.tm_lead_type as enum (
    'apply',
    'cooperation',
    'impact',
    'science',
    'subscribe',
    'network_personal'
  );
exception
  when duplicate_object then null;
end $enum_tm_lead_type$;

-- ---------------------------------------------------------------------------
-- Tables（可重复执行：IF NOT EXISTS）
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  membership_type public.tm_membership_type not null default 'individual',
  primary_role public.tm_primary_role not null default 'visitor',
  org_name text,
  org_verification_status public.tm_org_verification_status,
  total_points integer not null default 0,
  level smallint not null default 1,
  task_progress jsonb not null default '{"exploration":0,"welfare":0,"species":0,"resource":0}'::jsonb,
  courses_completed_count integer not null default 0,
  resource_courses_completed_count integer not null default 0,
  activities_participated_count integer not null default 0,
  volunteer_hours_total numeric(10, 2) not null default 0,
  species_records_submitted_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_type public.tm_lead_type not null,
  source_path text not null,
  name text not null,
  contact text not null,
  message text,
  extra jsonb,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_by_user_id_idx on public.leads (created_by_user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_slug text not null,
  program_title text not null,
  travel_date text not null,
  amount_cny integer not null default 0,
  status public.tm_order_status not null default 'pending_payment',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.tm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tm_set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.tm_set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mt text;
  pr text;
  org text;
  dn text;
begin
  dn := coalesce(new.raw_user_meta_data->>'display_name', '');
  mt := coalesce(new.raw_user_meta_data->>'membership_type', 'individual');
  pr := coalesce(new.raw_user_meta_data->>'primary_role', 'visitor');
  org := new.raw_user_meta_data->>'org_name';

  if mt not in ('individual', 'organization') then
    mt := 'individual';
  end if;

  if pr not in ('visitor', 'volunteer', 'citizen_scientist') then
    pr := 'visitor';
  end if;

  insert into public.profiles (user_id, display_name, membership_type, primary_role, org_name, org_verification_status)
  values (
    new.id,
    dn,
    mt::public.tm_membership_type,
    pr::public.tm_primary_role,
    nullif(trim(coalesce(org, '')), ''),
    case when mt = 'organization' then 'pending'::public.tm_org_verification_status else null end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists leads_insert_anon on public.leads;
create policy leads_insert_anon
  on public.leads for insert
  to anon
  with check (created_by_user_id is null);

drop policy if exists leads_insert_authenticated on public.leads;
create policy leads_insert_authenticated
  on public.leads for insert
  to authenticated
  with check (
    created_by_user_id is null or created_by_user_id = auth.uid()
  );

drop policy if exists leads_select_own on public.leads;
create policy leads_select_own
  on public.leads for select
  to authenticated
  using (created_by_user_id = auth.uid());

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists orders_update_own on public.orders;
create policy orders_update_own
  on public.orders for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (API roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant insert on table public.leads to anon;
grant select, insert on table public.leads to authenticated;
grant select, insert, update on table public.orders to authenticated;
