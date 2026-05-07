-- 若机构位置已用 latitude + longitude 表达，可删除冗余的 location(jsonb) 列。
-- 若仍需要存「非坐标」的地理信息（GeoJSON、地址结构体），请勿执行本迁移。

alter table public.org_partner_units
  drop column if exists location;
