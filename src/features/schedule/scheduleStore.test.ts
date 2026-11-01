import { describe, expect, it, vi } from 'vitest'
import type { CreateServiceEventCommand } from './createServiceEvent'
import { ScheduleStore } from './scheduleStore'
import { seededServiceEvents } from './seededServiceEvents'
import type { ServiceEvent } from './serviceEvent'
import type { ServiceEventRepository } from './serviceEventRepository'

describe('ScheduleStore', () => {
  it('loads events and derives the total number of open positions', async () => {
    const store = new ScheduleStore(createRepository())

    await store.load()

    expect(store.getSnapshot()).toEqual({
      status: 'ready',
      events: seededServiceEvents,
      totalOpenPositions: 5,
    })
  })

  it('reuses the same request while loading and skips a duplicate loaded request', async () => {
    const pending = deferred<readonly ServiceEvent[]>()
    const list = vi.fn().mockReturnValue(pending.promise)
    const store = new ScheduleStore(createRepository({ list }))

    const firstLoad = store.load()
    const duplicateLoad = store.load()

    await Promise.resolve()
    expect(list).toHaveBeenCalledOnce()
    pending.resolve(seededServiceEvents)
    await Promise.all([firstLoad, duplicateLoad])
    await store.load()
    expect(list).toHaveBeenCalledOnce()
  })

  it('ignores an obsolete list response after a forced reload', async () => {
    const first = deferred<readonly ServiceEvent[]>()
    const second = deferred<readonly ServiceEvent[]>()
    const list = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const store = new ScheduleStore(createRepository({ list }))

    const firstLoad = store.load()
    await Promise.resolve()
    const secondLoad = store.load(true)
    first.resolve([{ ...seededServiceEvents[0], id: 'obsolete' }])
    second.resolve([{ ...seededServiceEvents[0], id: 'current' }])
    await Promise.all([firstLoad, secondLoad])

    expect(store.getSnapshot()).toMatchObject({
      status: 'ready',
      events: [{ id: 'current' }],
    })
  })

  it('records a failure and retries the current list operation', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(seededServiceEvents)
    const store = new ScheduleStore(createRepository({ list }))

    await store.load()
    expect(store.getSnapshot()).toMatchObject({ status: 'error' })

    await store.retry()
    expect(store.getSnapshot()).toMatchObject({ status: 'ready' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('serves a listed event from the feature cache', async () => {
    const findById = vi.fn().mockResolvedValue(undefined)
    const store = new ScheduleStore(createRepository({ findById }))

    await store.load()
    const event = await store.findById(seededServiceEvents[0].id)

    expect(event).toEqual(seededServiceEvents[0])
    expect(findById).not.toHaveBeenCalled()
  })

  it('refreshes list and detail values only after their separate TTLs', async () => {
    let now = 0
    const list = vi.fn().mockResolvedValue(seededServiceEvents)
    const findById = vi.fn().mockResolvedValue(seededServiceEvents[0])
    const store = new ScheduleStore(
      createRepository({ list, findById }),
      () => now,
    )

    await store.load()
    await store.findById('not-listed')
    now = 30_000
    await store.load()
    now = 30_001
    await store.load()
    now = 60_000
    await store.findById('not-listed')
    now = 60_002
    await store.findById('not-listed')

    expect(list).toHaveBeenCalledTimes(2)
    expect(findById).toHaveBeenCalledTimes(2)
  })

  it('caches the confirmed result of creation for detail navigation', async () => {
    const createdEvent = { ...seededServiceEvents[0], id: 'created-event' }
    const create = vi.fn().mockResolvedValue(createdEvent)
    const findById = vi.fn().mockResolvedValue(undefined)
    const store = new ScheduleStore(createRepository({ create, findById }))

    const command: CreateServiceEventCommand = {
      title: createdEvent.title,
      startsAt: createdEvent.startsAt,
      endsAt: createdEvent.endsAt,
      location: createdEvent.location,
    }
    await store.create(command)
    const resolvedEvent = await store.findById(createdEvent.id)

    expect(create).toHaveBeenCalledWith(command, undefined)
    expect(resolvedEvent).toEqual(createdEvent)
    expect(findById).not.toHaveBeenCalled()
  })

  it('invalidates the retained list after event creation', async () => {
    const createdEvent = { ...seededServiceEvents[0], id: 'created-event' }
    const list = vi.fn().mockResolvedValue(seededServiceEvents)
    const create = vi.fn().mockResolvedValue(createdEvent)
    const store = new ScheduleStore(createRepository({ list, create }))

    await store.load()
    await store.create({
      title: createdEvent.title,
      startsAt: createdEvent.startsAt,
      endsAt: createdEvent.endsAt,
      location: createdEvent.location,
    })
    await store.load()

    expect(list).toHaveBeenCalledTimes(2)
  })

  it('synchronizes confirmed staffing in visible and retained event data', async () => {
    const findById = vi.fn().mockResolvedValue(undefined)
    const store = new ScheduleStore(createRepository({ findById }))
    await store.load()

    store.updateStaffing('sunday-2026-11-01', 8, 2)
    await store.load()
    const event = await store.findById('sunday-2026-11-01')

    const snapshot = store.getSnapshot()
    expect(snapshot.status).toBe('ready')
    expect(
      snapshot.status === 'ready'
        ? snapshot.events.find((item) => item.id === 'sunday-2026-11-01')
        : undefined,
    ).toMatchObject({ assignedPositions: 8, version: 2 })
    expect(event).toMatchObject({ assignedPositions: 8, version: 2 })
    expect(findById).not.toHaveBeenCalled()
  })

  it('aborts active work and clears state when the feature scope is disposed', async () => {
    let requestSignal: AbortSignal | undefined
    const list: ServiceEventRepository['list'] = (signal) => {
      requestSignal = signal
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        })
      })
    }
    const store = new ScheduleStore(createRepository({ list }))

    const load = store.load()
    await Promise.resolve()
    store.dispose()
    await load

    expect(requestSignal?.aborted).toBe(true)
    expect(store.getSnapshot()).toEqual({ status: 'idle' })
  })
})

function createRepository(
  overrides: Partial<ServiceEventRepository> = {},
): ServiceEventRepository {
  return {
    list: async () => seededServiceEvents,
    findById: async (eventId) =>
      seededServiceEvents.find((event) => event.id === eventId),
    create: async () => {
      throw new Error('Not configured for this test.')
    },
    ...overrides,
  }
}

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}
