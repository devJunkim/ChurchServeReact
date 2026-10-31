import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'

export type ServiceEventListener = () => void

export interface ServiceEventRepository {
  list: () => readonly ServiceEvent[]
  findById: (eventId: string) => ServiceEvent | undefined
  create: (command: CreateServiceEventCommand) => ServiceEvent
  subscribe: (listener: ServiceEventListener) => () => void
}
