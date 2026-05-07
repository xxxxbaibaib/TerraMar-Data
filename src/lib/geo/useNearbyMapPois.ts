import { useEffect, useState } from 'react'
import { fetchNearbyMapPois, type NearbyMapPoi } from './nearbyMapPois'

type Status = 'idle' | 'loading' | 'ready' | 'error'

/**
 * 在获得用户经纬度后，拉取周边真实地图 POI（OSM / 可选 Geoapify）。
 */
export function useNearbyMapPois(userGeo: { lat: number; lng: number } | null): {
  pois: NearbyMapPoi[]
  status: Status
  errorMessage: string | null
} {
  const [pois, setPois] = useState<NearbyMapPoi[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!userGeo) {
      setPois([])
      setStatus('idle')
      setErrorMessage(null)
      return
    }

    const ac = new AbortController()
    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

    void fetchNearbyMapPois(userGeo.lat, userGeo.lng, { signal: ac.signal })
      .then((rows) => {
        if (cancelled) return
        setPois(rows)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && /aborted/i.test(err.message))
        if (aborted) return
        setPois([])
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [userGeo?.lat, userGeo?.lng])

  return { pois, status, errorMessage }
}
