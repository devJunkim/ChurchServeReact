import { createContext, useContext } from 'react'
import type { ServiceEventRepository } from './serviceEventRepository'

export const ServiceEventContext =
  createContext<ServiceEventRepository | null>(null)

export function useServiceEventRepository() {
  const repository = useContext(ServiceEventContext)

  if (!repository) {
    throw new Error(
      'Service event hooks must be used inside ServiceEventProvider.',
    )
  }

  return repository
}
