-- TerraMar P1 扩展：自然体验攻略（Phase1 有限上传 + 审核）
-- 依赖：P0 profiles、tm_species_verification_status 枚举

do $enum_tm_guide_source$ begin
  create type public.tm_guide_source as enum ('official', 'ranger', 'ugc');
exception
  when duplicate_object then null;
end $enum_tm_guide_source$;

create table if not exists public.platform_experience_guides (
  id uuid primary key default gen_random_uuid(),
  protected_area_slug text not null,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  summary text,
  cover_url text,
  themes text[] not null default '{}'::text[],
  age_band text,
  intensity text,
  duration_hours numeric(6, 2),
  distance_km numeric(8, 2),
  source public.tm_guide_source not null default 'ugc',
  verification_status public.tm_species_verification_status not null default 'pending_review',
  track_json jsonb not null default '{}'::jsonb,
  steps_json jsonb not null default '[]'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_experience_guides_title_nonempty check (length(trim(title)) > 0),
  constraint platform_experience_guides_pa_slug_nonempty check (length(trim(protected_area_slug)) > 0)
);

create unique index if not exists platform_experience_guides_idempotency_key_uidx
  on public.platform_experience_guides (idempotency_key)
  where idempotency_key is not null;

create index if not exists platform_experience_guides_pa_status_idx
  on public.platform_experience_guides (protected_area_slug, verification_status);

create index if not exists platform_experience_guides_author_created_idx
  on public.platform_experience_guides (author_user_id, created_at desc);

drop trigger if exists platform_experience_guides_set_updated_at on public.platform_experience_guides;
create trigger platform_experience_guides_set_updated_at
  before update on public.platform_experience_guides
  for each row execute function public.tm_set_updated_at();

comment on table public.platform_experience_guides is '自然体验攻略；Phase1 机构/导赏员/参营用户有限上传';

-- 钱江源种子攻略（approved，供 App/官网浏览；仅当存在 profile 且尚无同名官方攻略）
insert into public.platform_experience_guides (
  protected_area_slug,
  author_user_id,
  title,
  summary,
  source,
  verification_status,
  age_band,
  intensity,
  duration_hours,
  distance_km,
  themes
)
select
  'pa-qianjiang',
  p.user_id,
  '春季观鸟半日线',
  '沿源头溪流慢行，识别常见林鸟与水鸟，适合亲子入门。',
  'official'::public.tm_guide_source,
  'approved'::public.tm_species_verification_status,
  'parent_child',
  'easy',
  2.5,
  4.2,
  array['birding']::text[]
from public.profiles p
where not exists (
  select 1 from public.platform_experience_guides g
  where g.protected_area_slug = 'pa-qianjiang'
    and g.title = '春季观鸟半日线'
)
limit 1;

alter table public.platform_experience_guides enable row level security;

drop policy if exists platform_experience_guides_select_approved on public.platform_experience_guides;
create policy platform_experience_guides_select_approved
  on public.platform_experience_guides for select
  using (verification_status = 'approved'::public.tm_species_verification_status);

drop policy if exists platform_experience_guides_select_own on public.platform_experience_guides;
create policy platform_experience_guides_select_own
  on public.platform_experience_guides for select to authenticated
  using (author_user_id = auth.uid());

drop policy if exists platform_experience_guides_insert_own on public.platform_experience_guides;
create policy platform_experience_guides_insert_own
  on public.platform_experience_guides for insert to authenticated
  with check (author_user_id = auth.uid());

drop policy if exists platform_experience_guides_update_own_pending on public.platform_experience_guides;
create policy platform_experience_guides_update_own_pending
  on public.platform_experience_guides for update to authenticated
  using (
    author_user_id = auth.uid()
    and verification_status = 'pending_review'::public.tm_species_verification_status
  )
  with check (author_user_id = auth.uid());

grant select on table public.platform_experience_guides to anon, authenticated;
grant select, insert, update on table public.platform_experience_guides to authenticated;
