import { describe, expect, it, vi } from 'vitest'
import {
  LocalStorageServiceEventRepository,
  serviceEventStorageKey,
} from './localStorageServiceEventRepository'
import type { ServiceEvent } from './serviceEvent'

const storedEvent: ServiceEvent = {
  id: 'stored-event',
  title: 'Stored Service',
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-08T16:00:00.000Z',
  location: 'Main Sanctuary',
  requiredPositions: 4,
  assignedPositions: 2,
}

function createStorage(storedValue: string | null = null) {
  let value = storedValue

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue
    }),
    read: () => value,
  }
}

describe('LocalStorageServiceEventRepository', () => {
  it('restores a validated versioned snapshot', async () => {
    const storage = createStorage(
      JSON.stringify({ version: 1, events: [storedEvent] }),
    )
    const repository = new LocalStorageServiceEventRepository(() => storage)

    expect(storage.getItem).toHaveBeenCalledWith(serviceEventStorageKey)
    expect(await repository.list()).toEqual([storedEvent])
    expect(await repository.findById('stored-event')).toEqual(storedEvent)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('seeds empty storage and persists immutable created snapshots', async () => {
    const storage = createStorage()
    const repository = new LocalStorageServiceEventRepository(
      () => storage,
      [],
      () => 'created-event',
    )
    const previousEvents = await repository.list()

    await repository.create({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    })

    expect(await repository.list()).not.toBe(previousEvents)
    expect(JSON.parse(storage.read() ?? '')).toEqual({
      version: 1,
      events: [
        expect.objectContaining({
          id: 'created-event',
          title: 'Prayer Night',
          requiredPositions: 0,
          assignedPositions: 0,
        }),
      ],
    })
  })

  it.each([
    ['malformed JSON', '{not-json'],
    ['an unsupported schema', JSON.stringify({ version: 2, events: [] })],
    [
      'invalid event data',
      JSON.stringify({
        version: 1,
        events: [{ ...storedEvent, assignedPositions: 5 }],
      }),
    ],
  ])('repairs %s with a validated seed snapshot', async (_label, storedValue) => {
    const storage = createStorage(storedValue)
    const reportError = vi.fn()
    const repository = new LocalStorageServiceEventRepository(
      () => storage,
      [storedEvent],
      undefined,
      reportError,
    )

    expect(await repository.list()).toEqual([storedEvent])
    expect(reportError).toHaveBeenCalledOnce()
    expect(JSON.parse(storage.read() ?? '')).toEqual({
      version: 1,
      events: [storedEvent],
    })
  })

  it('continues in memory when browser storage is unavailable', async () => {
    const reportError = vi.fn()
    const repository = new LocalStorageServiceEventRepository(
      () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
      [],
      () => 'memory-only-event',
      reportError,
    )

    const created = await repository.create({
      title: 'Memory Only Service',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    })

    expect(await repository.findById(created.id)).toEqual(created)
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('keeps the current session usable when a storage write fails', async () => {
    const reportError = vi.fn()
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ version: 1, events: [] })),
      setItem: vi.fn(() => {
        throw new DOMException('Storage is full', 'QuotaExceededError')
      }),
    }
    const repository = new LocalStorageServiceEventRepository(
      () => storage,
      [],
      () => 'memory-only-event',
      reportError,
    )

    await repository.create({
      title: 'Memory Only Service',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    })

    expect(await repository.findById('memory-only-event')).toBeDefined()
    expect(reportError).toHaveBeenCalledOnce()
  })
})
