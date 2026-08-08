# TerraMar 官网 CMS 操作指南 v1

## 概述

运营后台地址：`/admin`（例如 `https://terramarnature.com/admin`）。

改文案、团队、活动、资源、Logo、背景视频后点**发布**，官网刷新即可生效，**无需**再改代码或 `git push`。

## 上线前准备（一次性）

1. 在 Supabase SQL Editor 执行迁移：  
   [`supabase/migrations/20260808120000_cms_website_admin.sql`](../supabase/migrations/20260808120000_cms_website_admin.sql)
2. 将管理员用户设为 staff（把 `<USER_UUID>` 换成 Auth → Users 中的 id）：

```sql
update public.profiles
set is_staff = true
where user_id = '<USER_UUID>';
```

3. 确认 Cloudflare / 本地已配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
4. 用该账号登录官网后打开 `/admin`。
5. 仪表盘点击「一键初始化目录数据」：把现有 mock 活动/资源导入库，并刷新 Hero public URL。

## 常用操作

| 模块 | 路径 | 说明 |
|------|------|------|
| 站点设置 | `/admin/settings` | 页脚电话/微信/邮箱、Logo |
| 页面文案 | `/admin/pages` | 首页 / 关于我们 Hero 文案 |
| 团队 | `/admin/team` | 成员增删改、头像上传、发布/下架 |
| 科考活动 | `/admin/programs` | slug、标题、详情 JSON、发布 |
| 资源中心 | `/admin/resources` | 文章段落（空行分隔）、发布 |
| 媒体库 | `/admin/media` | 图片上传，复制 URL 到别处使用 |
| 背景视频 | `/admin/heroes` | 上传替换各页 Hero；用 public URL，避免签名过期 |
| 线索 | `/admin/leads` | 表单线索列表 |
| 地图点位 | `/admin/maps` | 编辑 `map_locations` |
| 内容审核 | `/admin/review` | 物种记录 / 攻略待审 |
| 操作日志 | `/admin/audit` | 发布与审核审计 |

## 发布模型

- `draft`：仅 staff 可见  
- `published`：官网匿名可读  
- `archived`：下架（团队「下架」）

官网读库失败时会自动回退到前端 mock，避免白屏。

## 背景视频说明

优先使用 Storage 桶 `background video` 的 **public URL**（迁移已设 public read）。后台「刷新全部 public URL」可写入 `hero_media` 表。生产环境不再依赖易过期的 `VITE_HERO_VIDEO_URL_*` 签名链接（仍可作为本地兜底）。

## 安全

- 仅 `profiles.is_staff = true` 可进 `/admin`（路由守卫 + RLS）。  
- 普通用户无法把自己升为 staff。  
- 浏览器端禁止使用 `service_role`。
