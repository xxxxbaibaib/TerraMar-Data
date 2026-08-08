import { useEffect, useState } from 'react'
import {
  HERO_HOME_VIDEO_SRC as FALLBACK_HOME,
  heroMapVideoByPage as FALLBACK_MAP,
} from '../../config/heroMedia'
import type { MapPageType } from '../../mock/map/mapTypes'
import { fetchHeroPublicUrlMap } from './heroMediaRemote'

let cache: Record<string, string> | null = null
let inflight: Promise<Record<string, string>> | null = null

async function loadMap(): Promise<Record<string, string>> {
  if (cache) return cache
  if (!inflight) {
    inflight = fetchHeroPublicUrlMap()
      .then((m) => {
        cache = m
        return m
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useHomeHeroVideoSrc(): string {
  const [src, setSrc] = useState(FALLBACK_HOME)
  useEffect(() => {
    let cancelled = false
    void loadMap().then((m) => {
      if (!cancelled && m.home) setSrc(m.home)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return src
}

export function useMapHeroVideoSrc(page: MapPageType): string {
  const [src, setSrc] = useState(FALLBACK_MAP[page])
  useEffect(() => {
    let cancelled = false
    void loadMap().then((m) => {
      if (!cancelled && m[page]) setSrc(m[page])
    })
    return () => {
      cancelled = true
    }
  }, [page])
  return src
}
