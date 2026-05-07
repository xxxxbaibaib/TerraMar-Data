-- 移除地图「关系线」数据表（前端已不再绘制边线；策略随表删除）

drop table if exists public.map_edges cascade;
