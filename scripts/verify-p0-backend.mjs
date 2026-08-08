#!/usr/bin/env node
/** 验证 P0 表是否存在于 Supabase（需 service_role 或 anon + 已部署 RLS） */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('请设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY（或 SUPABASE_ANON_KEY）')
  process.exit(1)
}

const supabase = createClient(url, key)
const tables = ['profiles', 'leads', 'orders']

for (const table of tables) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' })
  if (error) {
    console.error(`❌ ${table}: ${error.message}`)
  } else {
    console.log(`✅ ${table}: 可访问`)
  }
}

console.log('\nP0 验证完成。官网请配置 VITE_SUPABASE_* 并关闭 VITE_USE_MOCK_AUTH。')
