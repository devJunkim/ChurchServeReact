import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import { seededServiceEvents } from './seededServiceEvents'
import type {
  ServiceEventListener,
  ServiceEventRepository,
} from './serviceEventRepository'

const createEventId = () => crypto.randomUUID()

export class InMemoryServiceEventRepository
  implements ServiceEventRepository
{
  private events: readonly ServiceEvent[]
  private readonly listeners = new Set<ServiceEventListener>()
  private readonly eventIdFactory: () => string

  constructor(
    initialEvents: readonly ServiceEvent[] = seededServiceEvents,
    eventIdFactory: () => string = createEventId,
  ) {
    this.events = [...initialEvents]
    this.eventIdFactory = eventIdFactory
  }

  readonly list = () => this.events

  readonly findById = (eventId: string) =>
    this.events.find((event) => event.id === eventId)

  readonly create = (command: CreateServiceEventCommand) => {
    const event: ServiceEvent = {
      id: this.eventIdFactory(),
      ...command,
      requiredPositions: 0,
      assignedPositions: 0,
    }

    this.events = [...this.events, event]
    this.listeners.forEach((listener) => listener())
    return event
  }

  readonly subscribe = (listener: ServiceEventListener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
