import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import { seededServiceEvents } from './seededServiceEvents'
import type { ServiceEventRepository } from './serviceEventRepository'

const createEventId = () => crypto.randomUUID()

export class InMemoryServiceEventRepository
  implements ServiceEventRepository
{
  private events: readonly ServiceEvent[]
  private readonly eventIdFactory: () => string

  constructor(
    initialEvents: readonly ServiceEvent[] = seededServiceEvents,
    eventIdFactory: () => string = createEventId,
  ) {
    this.events = [...initialEvents]
    this.eventIdFactory = eventIdFactory
  }

  readonly list = async (signal?: AbortSignal) => {
    signal?.throwIfAborted()
    return this.events
  }

  readonly findById = async (eventId: string, signal?: AbortSignal) => {
    signal?.throwIfAborted()
    return this.events.find((event) => event.id === eventId)
  }

  readonly create = async (
    command: CreateServiceEventCommand,
    signal?: AbortSignal,
  ) => {
    signal?.throwIfAborted()
    const event: ServiceEvent = {
      id: this.eventIdFactory(),
      ...command,
      requiredPositions: 0,
      assignedPositions: 0,
    }

    this.events = [...this.events, event]
    return event
  }
}
