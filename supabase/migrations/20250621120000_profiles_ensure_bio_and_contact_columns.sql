-- 若远程项目未应用 20250618120000_profile_account_fields_and_shipping_addresses.sql，
-- PostgREST 会报「Could not find the 'bio' column of 'profiles' in the schema cache」。
-- 本迁移幂等补全账户资料所需列（与 181 开头一致，重复执行安全）。

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
