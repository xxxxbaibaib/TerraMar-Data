-- TerraMar P1: 与官网产品能力对齐的扩展表 + RLS
-- 依赖: 20250506000000_p0_profiles_leads_orders.sql（枚举、profiles、orders、tm_set_updated_at）
--
-- 策略变更（产品要求：仅登录后可向应用写入业务数据）:
--   - 撤销 anon 对 public.leads 的 INSERT；仅 authenticated 可插入，且 created_by_user_id 必须为本人

-- ---------------------------------------------------------------------------
-- 额外枚举
-- ---------------------------------------------------------------------------
create type public.tm_contribution_event_type as enum (
  'exploration_course',
  'volunteer_hours',
  'species_record',
  'welfare_activity',
  'resource_article',
  'invite_friend'
);

create type public.tm_species_verification_status as enum (
  'pending_review',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- 1) 资源学习进度（对齐 resourceProgressStore / PRD §4.8）
-- ---------------------------------------------------------------------------
create table public.resource_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_slug text not null,
  text_pct real not null default 0,
  video_pct real not null default 0,
  completed_once boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, resource_slug),
  constraint resource_progress_pct_check
    check (text_pct >= 0 and text_pct <= 100 and video_pct >= 0 and video_pct <= 100)
);

create trigger resource_progress_set_updated_at
  before update on public.resource_progress
  for each row execute function public.tm_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) 贡献事件（幂等键；对齐 PRD §4.2 / memberTierTable 积分语义）
-- ---------------------------------------------------------------------------
create table public.contribution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type public.tm_contribution_event_type not null,
  points_delta integer not null,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contribution_events_points_positive check (points_delta > 0)
);

create index contribution_events_user_id_created_at_idx
  on public.contribution_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3) 任务中心本级进度（对齐 PRD §4.3 / 前端四维 0–2）
-- ---------------------------------------------------------------------------
create table public.member_task_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  level_at_start smallint not null default 1,
  exploration smallint not null default 0,
  welfare smallint not null default 0,
  species smallint not null default 0,
  resource smallint not null default 0,
  updated_at timestamptz not null default now(),
  constraint member_task_progress_dim_check
    check (
      exploration between 0 and 2
      and welfare between 0 and 2
      and species between 0 and 2
      and resource between 0 and 2
    )
);

create trigger member_task_progress_set_updated_at
  before update on public.member_task_progress
  for each row execute function public.tm_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) 公民科学物种观测（登录后提交；对齐 PRD §4.7 / 地图上传叙事）
-- ---------------------------------------------------------------------------
create table public.species_observations (
  id uuid primary key default gen_random_uuid(),
  observer_user_id uuid not null references auth.users (id) on delete cascade,
  species_name_cn text not null,
  observed_at timestamptz not null default now(),
  location jsonb,
  verification_status public.tm_species_verification_status not null default 'pending_review',
  image_storage_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index species_observations_observer_created_idx
  on public.species_observations (observer_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS：业务表仅 authenticated；仅能读写本人 user_id
-- ---------------------------------------------------------------------------
alter table public.resource_progress enable row level security;
alter table public.contribution_events enable row level security;
alter table public.member_task_progress enable row level security;
alter table public.species_observations enable row level security;

-- resource_progress
create policy resource_progress_select_own
  on public.resource_progress for select to authenticated
  using (user_id = auth.uid());

create policy resource_progress_insert_own
  on public.resource_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy resource_progress_update_own
  on public.resource_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy resource_progress_delete_own
  on public.resource_progress for delete to authenticated
  using (user_id = auth.uid());

-- contribution_events（客户端可插正分事件；若仅信服务端可改为 service_role + RPC）
create policy contribution_events_select_own
  on public.contribution_events for select to authenticated
  using (user_id = auth.uid());

create policy contribution_events_insert_own
  on public.contribution_events for insert to authenticated
  with check (user_id = auth.uid());

-- member_task_progress
create policy member_task_progress_select_own
  on public.member_task_progress for select to authenticated
  using (user_id = auth.uid());

create policy member_task_progress_insert_own
  on public.member_task_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy member_task_progress_update_own
  on public.member_task_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- species_observations
create policy species_observations_select_own
  on public.species_observations for select to authenticated
  using (observer_user_id = auth.uid());

create policy species_observations_insert_own
  on public.species_observations for insert to authenticated
  with check (observer_user_id = auth.uid());

create policy species_observations_update_own_pending
  on public.species_observations for update to authenticated
  using (observer_user_id = auth.uid() and verification_status = 'pending_review')
  with check (
    observer_user_id = auth.uid()
    and verification_status = 'pending_review'::public.tm_species_verification_status
  );

create policy species_observations_delete_own_pending
  on public.species_observations for delete to authenticated
  using (observer_user_id = auth.uid() and verification_status = 'pending_review');

-- ---------------------------------------------------------------------------
-- leads：仅登录后可插入，且必须绑定当前用户（与 submitLead(..., { createdByUserId }) 一致）
-- ---------------------------------------------------------------------------
drop policy if exists leads_insert_anon on public.leads;
drop policy if exists leads_insert_authenticated on public.leads;

create policy leads_insert_authenticated_bound
  on public.leads for insert to authenticated
  with check (created_by_user_id = auth.uid());

revoke insert on table public.leads from anon;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.resource_progress to authenticated;
grant select, insert on table public.contribution_events to authenticated;
grant select, insert, update on table public.member_task_progress to authenticated;
grant select, insert, update, delete on table public.species_observations to authenticated;
