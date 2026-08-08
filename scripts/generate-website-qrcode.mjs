/**
 * 生成官网访问二维码 PNG，供微信等扫码打开网站。
 *
 * 用法：
 *   npm run generate:qrcode
 *   npm run generate:qrcode -- https://www.example.com
 *
 * 或在 .env 中设置 VITE_PUBLIC_SITE_URL（与 Supabase PUBLIC_SITE_URL 一致）。
 */
import QRCode from 'qrcode'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvSiteUrl() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return ''

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^VITE_PUBLIC_SITE_URL=(.+)$/)
    if (!match) continue
    return match[1].trim().replace(/^["']|["']$/g, '')
  }

  return ''
}

function normalizeUrl(raw) {
  const url = raw.trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`无效 URL：${raw}（须以 http:// 或 https:// 开头）`)
  }
  return url
}

const cliUrl = process.argv[2]
const siteUrl = normalizeUrl(cliUrl || loadEnvSiteUrl())

if (!siteUrl) {
  console.error('请提供网站地址：')
  console.error('  npm run generate:qrcode -- https://你的域名')
  console.error('或在 .env 中设置 VITE_PUBLIC_SITE_URL=https://你的域名')
  process.exit(1)
}

const outDir = resolve(root, 'public/assets')
const outPath = resolve(outDir, 'website-qrcode.png')

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

await QRCode.toFile(outPath, siteUrl, {
  width: 600,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#21362A',
    light: '#FFFFFF',
  },
})

console.log(`已生成二维码：${outPath}`)
console.log(`扫码跳转：${siteUrl}`)
console.log('')
console.log('微信扫码提示：')
console.log('- 须使用公网可访问的 HTTPS 地址（正式环境）')
console.log('- 本地测试可用局域网地址，例如 http://192.168.x.x:5173（手机与电脑同一 WiFi，且 npm run dev 带 --host）')
