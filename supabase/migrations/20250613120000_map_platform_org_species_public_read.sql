-- 地图大屏：合作共建读真实机构/伙伴坐标；公民科学读已审核观测点（仅含坐标与物种名等）
-- 依赖: 20250602120000_nat_ed_org_engagements.sql、20250606120000_org_partner_units_org_fields.sql
--
-- 说明：前端应 select 明确列，避免拉取 contact 等敏感字段（RLS 仍放行整行，但可减少暴露面）。

-- ---------------------------------------------------------------------------
-- org_partner_units：匿名与登录用户可读「已填经纬度」的行（用于地图叠加）
-- ---------------------------------------------------------------------------
grant select on table public.org_partner_units to anon;

drop policy if exists org_partner_units_select_public_mapcoords on public.org_partner_units;

create policy org_partner_units_select_public_mapcoords
  on public.org_partner_units for select
  to anon, authenticated
  using (
    latitude is not null
    and longitude is not null
    and latitude between -90 and 90
    and longitude between -180 and 180
  );

-- ---------------------------------------------------------------------------
-- species_observations：匿名与登录用户可读「已审核且含坐标」的记录（地图公开展示）
-- ---------------------------------------------------------------------------
grant select on table public.species_observations to anon;

drop policy if exists species_observations_select_public_approved_map on public.species_observations;

create policy species_observations_select_public_approved_map
  on public.species_observations for select
  to anon, authenticated
  using (
    verification_status = 'approved'::public.tm_species_verification_status
    and location is not null
    and (location ? 'lat')
    and (location ? 'lng')
  );
