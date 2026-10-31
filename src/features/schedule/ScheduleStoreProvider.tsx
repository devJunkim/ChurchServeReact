import { useEffect, type ReactNode } from 'react'
import type { ScheduleStore } from './scheduleStore'
import { ScheduleStoreContext } from './scheduleStoreContext'

type ScheduleStoreProviderProps = {
  readonly children: ReactNode
  readonly store: ScheduleStore
}

export function ScheduleStoreProvider({
  children,
  store,
}: ScheduleStoreProviderProps) {
  useEffect(() => () => store.dispose(), [store])

  return (
    <ScheduleStoreContext value={store}>{children}</ScheduleStoreContext>
  )
}
