import { useCallback, useEffect, useState } from 'react'
import {
  readAllResourceProgressForUser,
  RESOURCE_PROGRESS_EVENT,
} from '../lib/resources/resourceProgressStore'
import type { SlugProgress } from '../lib/resources/resourceProgressStore'

export function useResourceProgressMap(userId: string | undefined) {
  const [map, setMap] = useState<Record<string, SlugProgress>>({})

  const reload = useCallback(() => {
    if (!userId) {
      setMap({})
      return
    }
    setMap(readAllResourceProgressForUser(userId))
  }, [userId])

  useEffect(() => {
    reload()
    const on = () => reload()
    window.addEventListener('storage', on)
    window.addEventListener(RESOURCE_PROGRESS_EVENT, on)
    return () => {
      window.removeEventListener('storage', on)
      window.removeEventListener(RESOURCE_PROGRESS_EVENT, on)
    }
  }, [reload])

  return { progressBySlug: map, reload }
}
