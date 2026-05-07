-- 公益志愿报名表：中文列说明 + 运营快照列 volunteer_profile（与 leads 结构化字段配套）
-- 若未先执行 20250619120000_welfare_project_slug_and_kpis_rpc.sql，此处会补建 welfare_project_slug，避免 COMMENT 报「列不存在」。

alter table public.platform_welfare_enrollments
  add column if not exists welfare_project_slug text;

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

alter table public.platform_welfare_enrollments
  add column if not exists volunteer_profile jsonb not null default '{}'::jsonb;

comment on table public.platform_welfare_enrollments is
  '公益志愿参与登记：与 public.leads（lead_type=impact、山河云志愿入口）配套。详细 PII 以 leads 及 profiles 为准；本表记录参与关系、公益项目、坐标、metadata 与 volunteer_profile 运营快照。';

comment on column public.platform_welfare_enrollments.id is '主键 UUID';
comment on column public.platform_welfare_enrollments.user_id is '志愿者用户 ID（auth.users；与 profiles.user_id 一致）';
comment on column public.platform_welfare_enrollments.catalog_slug is
  '入口总线 slug；山河云公益志愿固定为 shanhaiyun_volunteer，与 (user_id, catalog_slug) 唯一约束配合';
comment on column public.platform_welfare_enrollments.status is '参与状态 public.tm_engagement_status（如 registered）';
comment on column public.platform_welfare_enrollments.latitude is '登记纬度（地图选点/定位，WGS84）';
comment on column public.platform_welfare_enrollments.longitude is '登记经度（地图选点/定位，WGS84）';
comment on column public.platform_welfare_enrollments.metadata is
  '扩展 JSON：来源 source、入口 entry、兴趣点标签、补同步 repair_sync 等；与业务代码写入字段一致';
comment on column public.platform_welfare_enrollments.idempotency_key is '可选幂等键（客户端去重）';
comment on column public.platform_welfare_enrollments.created_at is '首次写入时间';
comment on column public.platform_welfare_enrollments.updated_at is '最近更新时间';
comment on column public.platform_welfare_enrollments.welfare_project_slug is
  '参与公益项目（四选一）：eco-culture | citizen-science | child-nature-class | community-capacity';
comment on column public.platform_welfare_enrollments.volunteer_profile is
  '志愿登记表单快照（JSON）：display_name、gender、age、education、phone、wechat、email、address_detail、note 等；与 leads 结构化列对应，便于运营在本表直接浏览（仍以 leads 为权威 PII）';
