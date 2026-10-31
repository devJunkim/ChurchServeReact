import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ScheduleStore } from './scheduleStore'

export const ScheduleStoreContext = createContext<ScheduleStore | null>(null)

export function useScheduleStore() {
  const store = useContext(ScheduleStoreContext)
  if (!store) {
    throw new Error(
      'Schedule store hooks must be used inside ScheduleStoreProvider.',
    )
  }
  return store
}

export function useScheduleSnapshot() {
  const store = useScheduleStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
