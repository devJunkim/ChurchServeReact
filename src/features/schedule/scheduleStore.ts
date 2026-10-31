import type { CreateServiceEventCommand } from './createServiceEvent'
import { isAbortError } from './requestError'
import type { ServiceEvent } from './serviceEvent'
import type { ServiceEventRepository } from './serviceEventRepository'

type ScheduleIdleSnapshot = {
  readonly status: 'idle'
}

type ScheduleLoadingSnapshot = {
  readonly status: 'loading'
}

type ScheduleErrorSnapshot = {
  readonly status: 'error'
  readonly message: string
}

type ScheduleReadySnapshot = {
  readonly status: 'ready'
  readonly events: readonly ServiceEvent[]
  readonly totalOpenPositions: number
}

export type ScheduleSnapshot =
  | ScheduleIdleSnapshot
  | ScheduleLoadingSnapshot
  | ScheduleErrorSnapshot
  | ScheduleReadySnapshot

type Listener = () => void

const idleSnapshot: ScheduleIdleSnapshot = { status: 'idle' }
const loadingSnapshot: ScheduleLoadingSnapshot = { status: 'loading' }

export class ScheduleStore {
  private readonly repository: ServiceEventRepository
  private snapshot: ScheduleSnapshot = idleSnapshot
  private readonly listeners = new Set<Listener>()
  private readonly eventCache = new Map<string, ServiceEvent>()
  private activeListRequest?: {
    readonly controller: AbortController
    readonly promise: Promise<void>
  }

  constructor(repository: ServiceEventRepository) {
    this.repository = repository
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = () => this.snapshot

  load(force = false): Promise<void> {
    if (!force && this.snapshot.status === 'ready') {
      return Promise.resolve()
    }

    if (!force && this.activeListRequest) {
      return this.activeListRequest.promise
    }

    this.activeListRequest?.controller.abort()
    const controller = new AbortController()
    this.setSnapshot(loadingSnapshot)

    const promise = this.repository
      .list(controller.signal)
      .then((events) => {
        if (
          controller.signal.aborted ||
          this.activeListRequest?.controller !== controller
        ) {
          return
        }

        this.cacheEvents(events)
        this.setSnapshot({
          status: 'ready',
          events,
          totalOpenPositions: countOpenPositions(events),
        })
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          this.activeListRequest?.controller !== controller ||
          isAbortError(error)
        ) {
          return
        }

        this.setSnapshot({
          status: 'error',
          message: 'The scheduling service did not respond. Try again.',
        })
      })
      .finally(() => {
        if (this.activeListRequest?.controller === controller) {
          this.activeListRequest = undefined
        }
      })

    this.activeListRequest = { controller, promise }
    return promise
  }

  retry() {
    return this.load(true)
  }

  async findById(eventId: string, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const cachedEvent = this.eventCache.get(eventId)
    if (cachedEvent) {
      return cachedEvent
    }

    const event = await this.repository.findById(eventId, signal)
    signal?.throwIfAborted()
    if (event) {
      this.cacheEvents([event])
    }
    return event
  }

  async create(command: CreateServiceEventCommand, signal?: AbortSignal) {
    const event = await this.repository.create(command, signal)
    signal?.throwIfAborted()
    this.cacheEvents([event])
    return event
  }

  dispose() {
    this.activeListRequest?.controller.abort()
    this.activeListRequest = undefined
    this.eventCache.clear()
    this.setSnapshot(idleSnapshot)
  }

  private cacheEvents(events: readonly ServiceEvent[]) {
    for (const event of events) {
      this.eventCache.set(event.id, event)
    }
  }

  private setSnapshot(snapshot: ScheduleSnapshot) {
    if (Object.is(this.snapshot, snapshot)) {
      return
    }

    this.snapshot = snapshot
    for (const listener of this.listeners) {
      listener()
    }
  }
}

function countOpenPositions(events: readonly ServiceEvent[]) {
  return events.reduce(
    (total, event) =>
      total + Math.max(0, event.requiredPositions - event.assignedPositions),
    0,
  )
}
