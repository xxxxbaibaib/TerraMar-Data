-- leads：将 contact 管道串拆分为独立列，并回填历史数据（兼容「|」与「 | 」）
-- 键名与前端一致：性别、年龄、学历、手机、微信、邮箱、地图兴趣点、定位纬度/经度

alter table public.leads
  add column if not exists contact_gender text,
  add column if not exists contact_age text,
  add column if not exists contact_education text,
  add column if not exists contact_phone text,
  add column if not exists contact_wechat text,
  add column if not exists contact_email text,
  add column if not exists contact_poi text,
  add column if not exists contact_longitude double precision,
  add column if not exists contact_latitude double precision;

comment on column public.leads.contact_gender is '来自 contact「性别:」';
comment on column public.leads.contact_age is '来自 contact「年龄:」；机构线索可为「机构人数:」';
comment on column public.leads.contact_education is '来自 contact「学历:」';
comment on column public.leads.contact_phone is '来自 contact「手机:」';
comment on column public.leads.contact_wechat is '来自 contact「微信:」';
comment on column public.leads.contact_email is '来自 contact「邮箱:」';
comment on column public.leads.contact_poi is '来自 contact「地图兴趣点:」（POI 名称）';
comment on column public.leads.contact_longitude is '来自 contact「定位:纬度x,经度y」';
comment on column public.leads.contact_latitude is '来自 contact「定位:纬度x,经度y」';

-- 单行内规范化分隔符
update public.leads l
set
  contact_gender = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'性别:([^|]+)'))[1]),
    '-'
  ),
  contact_age = coalesce(
    nullif(trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'年龄:([^|]+)'))[1]), '-'),
    nullif(trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'机构人数:([^|]+)'))[1]), '-')
  ),
  contact_education = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'学历:([^|]+)'))[1]),
    '-'
  ),
  contact_phone = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'手机:([^|]+)'))[1]),
    '-'
  ),
  contact_wechat = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'微信:([^|]+)'))[1]),
    '-'
  ),
  contact_email = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'邮箱:([^|]+)'))[1]),
    '-'
  ),
  contact_poi = nullif(
    trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'地图兴趣点:([^|]+)'))[1]),
    '-'
  ),
  contact_latitude = case
    when replace(replace(l.contact, ' | ', '|'), ' |', '|') ~ E'定位:纬度[^,]+,经度[^|]+' then
      case
        when
          trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'定位:纬度([^,]+),经度([^|]+)'))[1])
          ~ '^[-+0-9.eE]+$'
        then
          trim(
            (regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'定位:纬度([^,]+),经度([^|]+)'))[1]
          )::double precision
        else null
      end
    else null
  end,
  contact_longitude = case
    when replace(replace(l.contact, ' | ', '|'), ' |', '|') ~ E'定位:纬度[^,]+,经度[^|]+' then
      case
        when
          trim((regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'定位:纬度([^,]+),经度([^|]+)'))[2])
          ~ '^[-+0-9.eE]+$'
        then
          trim(
            (regexp_match(replace(replace(l.contact, ' | ', '|'), ' |', '|'), E'定位:纬度([^,]+),经度([^|]+)'))[2]
          )::double precision
        else null
      end
    else null
  end
where l.contact is not null;
