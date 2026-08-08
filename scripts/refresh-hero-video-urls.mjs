import dns from 'dns'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// 项目刚恢复时本机 DNS 缓存可能仍为 NXDOMAIN，优先用公共 DNS
dns.setServers(['8.8.8.8', '1.1.1.1'])

const envPath = resolve(process.cwd(), '.env')
const raw = readFileSync(envPath, 'utf8')

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = parseEnv(raw)
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const bucket = 'background video'
const files = [
  ['VITE_HERO_VIDEO_URL_HOME', 'Video-1777349956294.mp4'],
  ['VITE_HERO_VIDEO_URL_COOPERATION', 'Video-1777350338781.mp4'],
  ['VITE_HERO_VIDEO_URL_PROGRAMS', 'Video-1777350701136.mp4'],
  ['VITE_HERO_VIDEO_URL_IMPACT', 'Video-1777360155117.mp4'],
  ['VITE_HERO_VIDEO_URL_SCIENCE', 'Video-1777361552225.mp4'],
]

try {
  const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
  console.log('health', health.status, (await health.text()).slice(0, 120))
} catch (e) {
  console.error('无法连接 Supabase:', e.message, e.cause ?? '')
  process.exit(1)
}

const sb = createClient(url, key)
// Storage 签名最长约 1 年（秒）
const expiresIn = 60 * 60 * 24 * 365

const signed = {}
for (const [envKey, file] of files) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(file, expiresIn)
  if (error) {
    console.error(`失败 ${envKey} (${file}):`, error.message)
    process.exit(1)
  }
  signed[envKey] = data.signedUrl
  console.log(`OK ${envKey}`)
}

let next = raw
for (const [envKey, signedUrl] of Object.entries(signed)) {
  const line = `${envKey}="${signedUrl}"`
  const re = new RegExp(`^${envKey}=.*$`, 'm')
  if (re.test(next)) {
    next = next.replace(re, line)
  } else {
    next = next.replace(/\s*$/, `\n${line}\n`)
  }
}

writeFileSync(envPath, next, 'utf8')
console.log('已更新 .env 中的 VITE_HERO_VIDEO_URL_*（约 1 年有效）')
console.log('请重启 npm run dev 后刷新页面')
