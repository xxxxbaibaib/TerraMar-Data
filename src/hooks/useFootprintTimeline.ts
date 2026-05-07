import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CloudUserRecord } from '../lib/auth/types'
import { buildFootprintTimeline } from '../lib/account/footprintTimeline'
import { FOOTPRINT_SOURCES_EVENT } from '../lib/account/footprintSourcesEvent'
import { PROGRAM_ORDERS_EVENT } from '../lib/account/programOrdersStore'
import { useProgramOrders } from './useProgramOrders'

export function useFootprintTimeline(user: CloudUserRecord | null) {
  const { orders } = useProgramOrders(user?.id)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((n) => n + 1), [])

  const items = useMemo(
    () => {
      if (!user) return []
      return buildFootprintTimeline(user, { programOrders: orders })
    },
    // tick：leads 等非 orders 源变更时仍触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, orders, tick],
  )

  useEffect(() => {
    const on = () => reload()
    window.addEventListener('storage', on)
    window.addEventListener(PROGRAM_ORDERS_EVENT, on)
    window.addEventListener(FOOTPRINT_SOURCES_EVENT, on)
    return () => {
      window.removeEventListener('storage', on)
      window.removeEventListener(PROGRAM_ORDERS_EVENT, on)
      window.removeEventListener(FOOTPRINT_SOURCES_EVENT, on)
    }
  }, [reload])

  return { items, reload }
}
