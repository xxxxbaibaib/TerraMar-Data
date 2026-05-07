-- 首屏背景视频 bucket：允许匿名读取对象（<video src> 无 JWT 也能拉流）
-- 前提：已在 Dashboard 创建 bucket，id 与名称均为 `background video`（含空格）
-- 若你的 bucket id 不同，请全局替换后执行

update storage.buckets
set public = true
where id = 'background video';

drop policy if exists "Allow public read background video" on storage.objects;

create policy "Allow public read background video"
  on storage.objects
  for select
  using (bucket_id = 'background video');
