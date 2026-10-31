import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import type {
  ServiceEventListener,
  ServiceEventRepository,
} from './serviceEventRepository'

const seededServiceEvents: readonly ServiceEvent[] = [
  {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  },
  {
    id: 'rehearsal-2026-11-05',
    title: 'Worship Team Rehearsal',
    startsAt: '2026-11-05T19:00:00-05:00',
    endsAt: '2026-11-05T20:30:00-05:00',
    location: 'Music Room',
    requiredPositions: 6,
    assignedPositions: 6,
  },
]

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
