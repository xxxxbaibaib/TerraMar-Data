-- 个人资料扩展字段 + 用户收货地址（账户中心）；RLS 与 profiles 一致为本人读写

alter table public.profiles
  add column if not exists real_name text,
  add column if not exists bio text,
  add column if not exists profile_phone text,
  add column if not exists profile_email text;

comment on column public.profiles.real_name is '真实姓名（证书/合同）；与 leads.name 可并存，预填时 profiles 优先';
comment on column public.profiles.bio is '个人简介，最多 200 字（应用层校验）';
comment on column public.profiles.profile_phone is '业务联系手机，不替代 auth 登录手机';
comment on column public.profiles.profile_email is '业务联系邮箱，不替代 auth 登录邮箱';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'profiles' and c.conname = 'profiles_bio_len'
  ) then
    alter table public.profiles
      add constraint profiles_bio_len check (bio is null or char_length(bio) <= 200);
  end if;
end $$;

create table if not exists public.user_shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null,
  recipient_phone text not null,
  region_line text not null default '',
  detail_line text not null default '',
  poi_name text,
  latitude double precision,
  longitude double precision,
  location_extra jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_shipping_addresses_user_id_created_at_idx
  on public.user_shipping_addresses (user_id, created_at desc);

-- 同一用户至多一条默认地址（is_default = true）
create unique index if not exists user_shipping_addresses_one_default_per_user
  on public.user_shipping_addresses (user_id)
  where is_default;

drop trigger if exists user_shipping_addresses_set_updated_at on public.user_shipping_addresses;
create trigger user_shipping_addresses_set_updated_at
  before update on public.user_shipping_addresses
  for each row execute function public.tm_set_updated_at();

alter table public.user_shipping_addresses enable row level security;

drop policy if exists user_shipping_addresses_select_own on public.user_shipping_addresses;
create policy user_shipping_addresses_select_own
  on public.user_shipping_addresses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_shipping_addresses_insert_own on public.user_shipping_addresses;
create policy user_shipping_addresses_insert_own
  on public.user_shipping_addresses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_shipping_addresses_update_own on public.user_shipping_addresses;
create policy user_shipping_addresses_update_own
  on public.user_shipping_addresses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_shipping_addresses_delete_own on public.user_shipping_addresses;
create policy user_shipping_addresses_delete_own
  on public.user_shipping_addresses for delete
  to authenticated
  using (auth.uid() = user_id);
