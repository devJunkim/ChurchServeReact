import { createContext, useContext } from 'react'
import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'

export type ServiceEventStoreValue = {
  readonly events: readonly ServiceEvent[]
  findById: (eventId: string) => ServiceEvent | undefined
  create: (command: CreateServiceEventCommand) => ServiceEvent
}

export const ServiceEventContext =
  createContext<ServiceEventStoreValue | null>(null)

export function useServiceEvents() {
  const store = useContext(ServiceEventContext)

  if (!store) {
    throw new Error('useServiceEvents must be used inside ServiceEventProvider.')
  }

  return store
}
