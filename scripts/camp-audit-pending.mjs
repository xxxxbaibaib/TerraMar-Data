#!/usr/bin/env node
/**
 * 营期简易审核后台：列出 pending 物种记录与攻略（需 service_role）
 *
 * 用法：
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/camp-audit-pending.mjs
 *   node scripts/camp-audit-pending.mjs --approve-species <uuid>
 *   node scripts/camp-audit-pending.mjs --approve-guide <uuid>
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('请设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const args = process.argv.slice(2)

async function listPending() {
  const [species, guides] = await Promise.all([
    supabase
      .from('platform_species_records')
      .select('id, species_name_cn, observer_user_id, created_at')
      .eq('verification_status', 'pending_review')
      .order('created_at', { ascending: true }),
    supabase
      .from('platform_experience_guides')
      .select('id, title, protected_area_slug, author_user_id, created_at')
      .eq('verification_status', 'pending_review')
      .order('created_at', { ascending: true }),
  ])

  console.log('\n=== 待审核物种记录 ===')
  for (const row of species.data ?? []) {
    console.log(`- ${row.id} | ${row.species_name_cn} | ${row.created_at}`)
  }
  if ((species.data ?? []).length === 0) console.log('（无）')

  console.log('\n=== 待审核攻略 ===')
  for (const row of guides.data ?? []) {
    console.log(`- ${row.id} | ${row.title} @ ${row.protected_area_slug} | ${row.created_at}`)
  }
  if ((guides.data ?? []).length === 0) console.log('（无）')
}

async function approve(table, id) {
  const { error } = await supabase
    .from(table)
    .update({ verification_status: 'approved' })
    .eq('id', id)
  if (error) throw error
  console.log(`已批准 ${table} ${id}`)
}

async function main() {
  if (args[0] === '--approve-species' && args[1]) {
    await approve('platform_species_records', args[1])
    return
  }
  if (args[0] === '--approve-guide' && args[1]) {
    await approve('platform_experience_guides', args[1])
    return
  }
  await listPending()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
