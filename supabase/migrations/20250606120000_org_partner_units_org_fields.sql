-- org_partner_units：补充机构常用字段（从业人数、经纬度）
-- 已有列：name、summary、contact；位置以 latitude/longitude 为准（location 可由后续迁移删除）
-- 伙伴项目名称：插入 unit_type = partner_project 的子行，name 填伙伴项目名称，parent_id 指向机构行的 id

alter table public.org_partner_units
  add column if not exists staff_headcount integer;

alter table public.org_partner_units
  add column if not exists latitude double precision;

alter table public.org_partner_units
  add column if not exists longitude double precision;

comment on column public.org_partner_units.name is '机构名称（organization）或伙伴项目名称（partner_project 子行）';
comment on column public.org_partner_units.summary is '简介';
comment on column public.org_partner_units.staff_headcount is '机构从业人数；伙伴项目行建议留空';
comment on column public.org_partner_units.latitude is '机构位置纬度 WGS84（-90~90）';
comment on column public.org_partner_units.longitude is '机构位置经度 WGS84（-180~180）';
comment on column public.org_partner_units.contact is '联系方式';
