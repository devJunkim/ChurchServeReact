import type { CreateServiceEventCommand } from './createServiceEvent'
import { RequestCache } from '../../core/data/requestCache'
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
  private readonly listCache: RequestCache<'events', readonly ServiceEvent[]>
  private readonly eventCache: RequestCache<string, ServiceEvent | undefined>
  private snapshot: ScheduleSnapshot = idleSnapshot
  private readonly listeners = new Set<Listener>()
  private activeListRequest?: Promise<void>

  constructor(repository: ServiceEventRepository, now: () => number = Date.now) {
    this.repository = repository
    this.listCache = new RequestCache({
      maxAgeMs: 30_000,
      maxEntries: 1,
      now,
    })
    this.eventCache = new RequestCache({
      maxAgeMs: 60_000,
      maxEntries: 20,
      now,
    })
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = () => this.snapshot

  load(force = false): Promise<void> {
    if (!force) {
      const cached = this.listCache.read('events')
      if (cached.hit) {
        this.applyEvents(cached.value)
        return Promise.resolve()
      }
    }

    if (!force && this.activeListRequest) {
      return this.activeListRequest
    }

    this.setSnapshot(loadingSnapshot)
    const request = this.listCache
      .getOrLoad('events', (signal) => this.repository.list(signal), force)
      .then((events) => {
        if (this.activeListRequest !== request) return
        this.applyEvents(events)
      })
      .catch((error: unknown) => {
        if (this.activeListRequest !== request || isAbortError(error)) return
        this.setSnapshot({
          status: 'error',
          message: 'The scheduling service did not respond. Try again.',
        })
      })
      .finally(() => {
        if (this.activeListRequest === request) {
          this.activeListRequest = undefined
        }
      })

    this.activeListRequest = request
    return request
  }

  retry() {
    return this.load(true)
  }

  findById(eventId: string, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const cached = this.eventCache.read(eventId)
    if (cached.hit) {
      return Promise.resolve(cached.value)
    }

    return this.eventCache.getOrLoad(eventId, (cacheSignal) => {
      const combinedSignal = combineSignals(signal, cacheSignal)
      return this.repository.findById(eventId, combinedSignal)
    })
  }

  async create(command: CreateServiceEventCommand, signal?: AbortSignal) {
    const event = await this.repository.create(command, signal)
    signal?.throwIfAborted()
    this.listCache.clear()
    this.eventCache.set(event.id, event)
    return event
  }

  updateStaffing(
    eventId: string,
    assignedPositions: number,
    version: number,
  ) {
    const cached = this.eventCache.read(eventId)
    const current = cached.hit ? cached.value : undefined
    if (current && version >= current.version) {
      this.eventCache.set(eventId, { ...current, assignedPositions, version })
    }

    if (this.snapshot.status === 'ready') {
      const events = this.snapshot.events.map((event) =>
        event.id === eventId && version >= event.version
          ? { ...event, assignedPositions, version }
          : event,
      )
      this.listCache.set('events', events)
      this.applyEvents(events)
    } else {
      this.listCache.clear()
    }
  }

  clear() {
    this.listCache.clear()
    this.eventCache.clear()
    this.activeListRequest = undefined
    this.setSnapshot(idleSnapshot)
  }

  dispose() {
    this.clear()
  }

  private applyEvents(events: readonly ServiceEvent[]) {
    this.cacheEvents(events)
    this.setSnapshot({
      status: 'ready',
      events,
      totalOpenPositions: countOpenPositions(events),
    })
  }

  private cacheEvents(events: readonly ServiceEvent[]) {
    for (const event of events) this.eventCache.set(event.id, event)
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

function combineSignals(
  external: AbortSignal | undefined,
  internal: AbortSignal,
) {
  return external ? AbortSignal.any([external, internal]) : internal
}

function countOpenPositions(events: readonly ServiceEvent[]) {
  return events.reduce(
    (total, event) =>
      total + Math.max(0, event.requiredPositions - event.assignedPositions),
    0,
  )
}
