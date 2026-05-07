import { useCallback, useEffect, useState } from 'react'
import type { MockCourseOrder } from '../mock/accountOrders'
import { PROGRAM_ORDERS_EVENT, loadProgramOrders } from '../lib/account/programOrdersStore'

/** 科考活动课程订单（mock：localStorage；Supabase：`orders` 表） */
export function useProgramOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<MockCourseOrder[]>([])

  const reload = useCallback(async () => {
    if (!userId) {
      setOrders([])
      return
    }
    try {
      setOrders(await loadProgramOrders(userId))
    } catch {
      setOrders([])
    }
  }, [userId])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reload()
    }, 0)
    const on = () => {
      void reload()
    }
    window.addEventListener('storage', on)
    window.addEventListener(PROGRAM_ORDERS_EVENT, on)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('storage', on)
      window.removeEventListener(PROGRAM_ORDERS_EVENT, on)
    }
  }, [reload])

  return { orders, reload }
}
