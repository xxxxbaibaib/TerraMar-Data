import { haversineKm } from '../geo'

export type NearbyMapPoiSource = 'overpass' | 'geoapify'

export type NearbyMapPoi = {
  id: string
  source: NearbyMapPoiSource
  /** Overpass 要素类型；Geoapify 为 other */
  osmType: 'node' | 'way' | 'relation' | 'other'
  osmId: number
  name: string
  /** amenity / shop / leisure 等主标签 */
  category?: string
  lat: number
  lng: number
}

type OverpassElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const DEFAULT_RADIUS_M = 1000
const DEFAULT_LIMIT = 22

function geoapifyPlacesBaseUrl(): string {
  const raw = import.meta.env.VITE_GEOAPIFY_PLACES_BASE_URL
  const t = typeof raw === 'string' ? raw.trim() : ''
  return t.length > 0 ? t.replace(/\/+$/, '') : 'https://api.geoapify.com/v2/places'
}

/** 公开 Overpass 镜像（支持浏览器 CORS）；若不可用可自行改为自建代理 */
const OVERPASS_INTERPRETER = 'https://overpass.kumi.systems/api/interpreter'

function pickCategory(tags: Record<string, string>): string | undefined {
  return (
    tags.amenity ||
    tags.shop ||
    tags.leisure ||
    tags.tourism ||
    tags.office ||
    tags.healthcare ||
    tags.sport ||
    tags.man_made
  )
}

function buildOverpassQuery(lat: number, lng: number, radiusM: number, cap: number): string {
  const r = Math.round(radiusM)
  return `[out:json][timeout:22];
(
  node(around:${r},${lat},${lng})["name"]["amenity"];
  node(around:${r},${lat},${lng})["name"]["shop"];
  node(around:${r},${lat},${lng})["name"]["leisure"];
  node(around:${r},${lat},${lng})["name"]["tourism"];
  way(around:${r},${lat},${lng})["name"]["amenity"];
  way(around:${r},${lat},${lng})["name"]["shop"];
);
out center ${cap};
`
}

function parseOverpassElements(
  elements: OverpassElement[] | undefined,
  lat0: number,
  lng0: number,
  maxResults: number,
): NearbyMapPoi[] {
  if (!elements?.length) return []
  const raw: NearbyMapPoi[] = []
  for (const el of elements) {
    const tags = el.tags ?? {}
    const name = tags.name?.trim()
    if (!name) continue

    let lat: number | undefined
    let lng: number | undefined
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      lat = el.lat
      lng = el.lon
    } else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
      lat = el.center.lat
      lng = el.center.lon
    }
    if (lat == null || lng == null) continue

    const t = el.type === 'way' || el.type === 'node' || el.type === 'relation' ? el.type : 'other'
    const category = pickCategory(tags)
    raw.push({
      id: `osm-${t}-${el.id}`,
      source: 'overpass',
      osmType: t,
      osmId: el.id,
      name,
      category,
      lat,
      lng,
    })
  }

  raw.sort(
    (a, b) =>
      haversineKm(lat0, lng0, a.lat, a.lng) - haversineKm(lat0, lng0, b.lat, b.lng),
  )

  const seen = new Set<string>()
  const deduped: NearbyMapPoi[] = []
  for (const p of raw) {
    const key = `${p.name.toLowerCase()}|${Math.round(p.lat * 500)}|${Math.round(p.lng * 500)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(p)
    if (deduped.length >= maxResults) break
  }
  return deduped
}

function linkAbortSignals(timeoutMs: number, external?: AbortSignal | null): { signal: AbortSignal; dispose: () => void } {
  const ac = new AbortController()
  const t = window.setTimeout(() => ac.abort(), timeoutMs)
  const onExternal = () => ac.abort()
  if (external) {
    if (external.aborted) ac.abort()
    else external.addEventListener('abort', onExternal, { once: true })
  }
  return {
    signal: ac.signal,
    dispose: () => {
      window.clearTimeout(t)
      external?.removeEventListener('abort', onExternal)
    },
  }
}

async function fetchOverpassNearby(
  lat: number,
  lng: number,
  radiusM: number,
  limit: number,
  externalSignal?: AbortSignal | null,
): Promise<NearbyMapPoi[]> {
  const body = buildOverpassQuery(lat, lng, radiusM, Math.min(60, limit * 3))
  const { signal, dispose } = linkAbortSignals(38_000, externalSignal ?? null)
  try {
    const res = await fetch(OVERPASS_INTERPRETER, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      signal,
    })
    if (!res.ok) {
      throw new Error(`Overpass HTTP ${res.status}`)
    }
    const json = (await res.json()) as { elements?: OverpassElement[] }
    return parseOverpassElements(json.elements, lat, lng, limit)
  } finally {
    dispose()
  }
}

async function fetchGeoapifyNearby(
  lat: number,
  lng: number,
  radiusM: number,
  limit: number,
  externalSignal?: AbortSignal | null,
): Promise<NearbyMapPoi[]> {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Geoapify key missing')
  }
  const url = new URL(geoapifyPlacesBaseUrl())
  // Geoapify 无顶层 `nature`，需用 `natural`（见 API 错误信息 supported categories）
  url.searchParams.set(
    'categories',
    'commercial,education,entertainment,catering,leisure,tourism,service,natural,religion',
  )
  url.searchParams.set('filter', `circle:${lng},${lat},${radiusM}`)
  // 官方格式为 proximity:lon,lat（逗号）；误用下划线会得到 HTTP 400
  url.searchParams.set('bias', `proximity:${lng},${lat}`)
  url.searchParams.set('limit', String(Math.min(40, limit)))
  url.searchParams.set('apiKey', key.trim())

  const res = await fetch(url.toString(), { signal: externalSignal ?? undefined })
  if (!res.ok) {
    throw new Error(`Geoapify HTTP ${res.status}`)
  }
  const data = (await res.json()) as {
    features?: {
      geometry?: { type: string; coordinates?: [number, number] }
      properties?: { name?: string; categories?: string[]; place_id?: string }
    }[]
  }
  const out: NearbyMapPoi[] = []
  let i = 0
  for (const f of data.features ?? []) {
    const coords = f.geometry?.coordinates
    if (!coords || coords.length < 2) continue
    const [flng, flat] = coords
    const name = f.properties?.name?.trim()
    if (!name) continue
    const id = f.properties?.place_id ?? `geoapify-${i}`
    i += 1
    out.push({
      id: String(id),
      source: 'geoapify',
      osmType: 'other',
      osmId: 0,
      name,
      category: f.properties?.categories?.[0],
      lat: flat,
      lng: flng,
    })
  }
  out.sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng))
  return out.slice(0, limit)
}

export type FetchNearbyMapPoisOptions = {
  radiusM?: number
  limit?: number
  /** 取消时抛出 AbortError；调用方应忽略「已取消」类错误 */
  signal?: AbortSignal | null
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error && /aborted/i.test(err.message)) return true
  return false
}

/**
 * 根据当前坐标拉取周边真实地图 POI（默认 OpenStreetMap / Overpass；可选 Geoapify）。
 */
export async function fetchNearbyMapPois(
  lat: number,
  lng: number,
  opts: FetchNearbyMapPoisOptions = {},
): Promise<NearbyMapPoi[]> {
  const radiusM = opts.radiusM ?? DEFAULT_RADIUS_M
  const limit = opts.limit ?? DEFAULT_LIMIT
  const signal = opts.signal ?? null
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const geoKey = import.meta.env.VITE_GEOAPIFY_API_KEY
  if (typeof geoKey === 'string' && geoKey.trim()) {
    try {
      return await fetchGeoapifyNearby(lat, lng, radiusM, limit, signal)
    } catch (e) {
      if (isAbortError(e)) throw e
      /* fall through to Overpass */
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
  return fetchOverpassNearby(lat, lng, radiusM, limit, signal)
}
