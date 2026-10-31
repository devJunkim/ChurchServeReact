import type { CreateServiceEventCommand } from './createServiceEvent'
import type { ServiceEvent } from './serviceEvent'
import type { ServiceEventRepository } from './serviceEventRepository'
import { isServiceEvent } from './serviceEventValidation'
import { seededServiceEvents } from './seededServiceEvents'

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

type StoredServiceEvents = {
  readonly version: 1
  readonly events: readonly ServiceEvent[]
}

export const serviceEventStorageKey = 'churchserve.service-events'

const createEventId = () => crypto.randomUUID()
const ignorePersistenceError = () => undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStoredEvents(value: string): readonly ServiceEvent[] | undefined {
  const parsed: unknown = JSON.parse(value)

  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.events) ||
    !parsed.events.every(isServiceEvent)
  ) {
    return undefined
  }

  return parsed.events.map((event) => ({ ...event }))
}

export class LocalStorageServiceEventRepository
  implements ServiceEventRepository
{
  private events: readonly ServiceEvent[]
  private readonly eventIdFactory: () => string
  private readonly onPersistenceError: (error: unknown) => void
  private storage: StoragePort | undefined

  constructor(
    storageFactory: () => StoragePort = () => window.localStorage,
    initialEvents: readonly ServiceEvent[] = seededServiceEvents,
    eventIdFactory: () => string = createEventId,
    onPersistenceError: (error: unknown) => void = ignorePersistenceError,
  ) {
    this.events = [...initialEvents]
    this.eventIdFactory = eventIdFactory
    this.onPersistenceError = onPersistenceError
    this.restore(storageFactory)
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
      version: 1,
    }
    const nextEvents = [...this.events, event]

    this.persist(nextEvents)
    this.events = nextEvents
    return event
  }

  private restore(storageFactory: () => StoragePort) {
    let storedValue: string | null

    try {
      this.storage = storageFactory()
      storedValue = this.storage.getItem(serviceEventStorageKey)
    } catch (error) {
      this.disablePersistence(error)
      return
    }

    if (storedValue === null) {
      this.persist(this.events)
      return
    }

    try {
      const storedEvents = parseStoredEvents(storedValue)

      if (!storedEvents) {
        this.onPersistenceError(
          new Error('Stored service events do not match schema version 1.'),
        )
        this.persist(this.events)
        return
      }

      this.events = storedEvents
    } catch (error) {
      this.onPersistenceError(error)
      this.persist(this.events)
    }
  }

  private persist(events: readonly ServiceEvent[]) {
    if (!this.storage) {
      return
    }

    const payload: StoredServiceEvents = { version: 1, events }

    try {
      this.storage.setItem(serviceEventStorageKey, JSON.stringify(payload))
    } catch (error) {
      this.disablePersistence(error)
    }
  }

  private disablePersistence(error: unknown) {
    this.storage = undefined
    this.onPersistenceError(error)
  }
}
