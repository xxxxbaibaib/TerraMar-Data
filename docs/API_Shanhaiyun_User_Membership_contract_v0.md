# API 契约｜山海云用户、登录与会员（v0 草案）

文档版本：v0.1  
关联 PRD：[PRD_Shanhaiyun_Auth_Membership_v1.md](./PRD_Shanhaiyun_Auth_Membership_v1.md)  
约定：**REST + JSON**；版本前缀 `/v1`；时间 **ISO 8601**（UTC 或 `+08:00` 全文一致）；所有 **写接口** 支持请求头 `Idempotency-Key: <uuid>`（重复键返回首次成功结果语义）。

---

## 1. 通用约定

### 1.1 Base URL

```
{SHANHAIYUN_API_BASE}/v1
```

环境变量（官网）：`VITE_SHANHAIYUN_API_BASE_URL`（仅配置，未启用时不发请求）。

### 1.2 认证

| 场景 | 请求头 |
|------|--------|
| 用户上下文 | `Authorization: Bearer <access_token>` |
| 服务端回调（若启用） | `X-Shanhaiyun-Signature` + 时间戳（由山海云定义） |

**Token 响应（登录 / 刷新）**（示例形状）：

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": { "id": "uuid", "display_name": "string" }
}
```

### 1.3 错误体

```json
{
  "error": "string_code",
  "message": "人类可读说明",
  "details": {}
}
```

### 1.4 HTTP 状态与错误码（建议）

| HTTP | `error` 示例 | 说明 |
|------|----------------|------|
| 400 | `invalid_request` | 参数校验失败 |
| 401 | `unauthorized` | 未登录或 Token 无效 |
| 403 | `forbidden` | 已登录但无权限 |
| 404 | `not_found` | 资源不存在 |
| 409 | `conflict` | 如手机号已注册 |
| 429 | `rate_limited` | 验证码或登录过频 |
| 500 | `internal_error` | 服务端异常 |

---

## 2. 核心资源与字段（JSON 形状示例）

### 2.1 User

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+86-13800000000",
  "email": "user@example.com",
  "status": "active",
  "created_at": "2026-05-01T08:00:00+08:00"
}
```

### 2.2 UserProfile

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "山海用户",
  "avatar_url": "https://...",
  "region": "浙江"
}
```

### 2.3 MembershipIndividual

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "primary_role": "visitor",
  "roles": ["visitor"],
  "level": 1,
  "level_points": 120,
  "level_updated_at": "2026-05-06T00:00:00+08:00"
}
```

`primary_role` 枚举建议：`visitor` | `volunteer` | `citizen_scientist`（与 PRD 中文名映射表由前后端共用常量）。

### 2.4 MembershipOrganization

```json
{
  "org_id": "660e8400-e29b-41d4-a716-446655440001",
  "admin_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "某自然教育机构",
  "verification_status": "pending",
  "profile": {}
}
```

### 2.5 ContributionEvent（写入幂等）

```json
{
  "idempotency_key": "client-generated-uuid",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "species_record_verified",
  "payload": { "record_id": "...", "points": 10 },
  "occurred_at": "2026-05-06T12:00:00+08:00"
}
```

`event_type` 枚举 v0 建议：`species_record_submitted` | `species_record_verified` | `volunteer_hours` | `course_completed` | …（扩展表维护）。

### 2.6 Lead（对齐现网 LeadType）

```json
{
  "lead_type": "network_personal",
  "source_path": "/join-network/personal",
  "user_id": null,
  "anonymous_session_id": "optional",
  "name": "张三",
  "contact": "string",
  "message": "optional",
  "extra": {}
}
```

---

## 3. 端点列表（v0）

> 路径与字段名为契约草案；实现时可微调但需 **版本化** 变更。

### 3.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/register` | 注册（手机或邮箱 + 凭证） |
| `POST` | `/auth/login` | 登录 |
| `POST` | `/auth/refresh` | 刷新 `access_token` |
| `POST` | `/auth/logout` | 作废 refresh（可选） |

### 3.2 用户与资料

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/me` | 当前用户 + profile + individual_membership |
| `PATCH` | `/me/profile` | 更新展示资料 |

### 3.3 会员与身份

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/me/membership/individual/registration` | 提交统一登记（对应官网 join-network 表单；body 含 `entry` 等） |
| `GET` | `/me/membership/individual` | 查询个人会员与等级 |
| `POST` | `/orgs` | 创建机构档案（机构主账号） |
| `GET` | `/orgs/{org_id}` | 查询机构会员 |

### 3.4 贡献与线索

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/contribution_events` | 写入贡献事件（`Idempotency-Key` 必填） |
| `POST` | `/leads` | 匿名或登录留资 |

### 3.5 公民科学记录（与地图上传对齐）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/science/observations` | 创建观测记录（需登录；body 含物种、类群、位置、媒体引用等） |

---

## 4. 请求示例（节选）

### 4.1 `POST /v1/auth/login`

**Request**

```json
{
  "grant_type": "password",
  "phone": "+8613800000000",
  "password": "••••••••"
}
```

**Response 200**：见 §1.2 Token 响应。

### 4.2 `POST /v1/me/membership/individual/registration`

**Headers**：`Authorization`、`Idempotency-Key`

**Request**（示意，与现网表单字段对齐后细化）

```json
{
  "entry": "citizen_science",
  "primary_role": "citizen_scientist",
  "name": "张三",
  "contact_payload": {},
  "location": { "lat": 29.1, "lng": 118.2 },
  "selected_poi_id": "coop-node-id",
  "note": "可选"
}
```

**Response 201**：`{ "registration_id": "uuid", "status": "submitted" }`

---

## 5. Webhook（可选，P2）

**事件**：`membership.level_changed`  
**Payload**：`user_id`, `old_level`, `new_level`, `occurred_at`  
**用途**：官网缓存失效、运营通知。

---

## 6. OpenAPI

正式联调前由山海云导出 **OpenAPI 3.1** YAML 为单一事实源；本文档为其人类可读摘要，冲突以 OpenAPI 为准。

---

## 7. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-05 | 初稿，端点与枚举可随山海云设计迭代 |
