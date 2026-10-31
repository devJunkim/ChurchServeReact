import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'

export interface ServiceEventRepository {
  list: (signal?: AbortSignal) => Promise<readonly ServiceEvent[]>
  findById: (
    eventId: string,
    signal?: AbortSignal,
  ) => Promise<ServiceEvent | undefined>
  create: (
    command: CreateServiceEventCommand,
    signal?: AbortSignal,
  ) => Promise<ServiceEvent>
}
