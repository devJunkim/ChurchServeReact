import type { ReactNode } from 'react'
import { ServiceEventContext } from './serviceEventContext'
import type { ServiceEventRepository } from './serviceEventRepository'

type ServiceEventProviderProps = {
  children: ReactNode
  repository: ServiceEventRepository
}

export function ServiceEventProvider({
  children,
  repository,
}: ServiceEventProviderProps) {
  return (
    <ServiceEventContext value={repository}>
      {children}
    </ServiceEventContext>
  )
}
