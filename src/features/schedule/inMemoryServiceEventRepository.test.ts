import { describe, expect, it, vi } from 'vitest'
import { InMemoryServiceEventRepository } from './inMemoryServiceEventRepository'

describe('InMemoryServiceEventRepository', () => {
  it('finds a seeded event and represents a missing record', () => {
    const repository = new InMemoryServiceEventRepository()

    expect(repository.findById('sunday-2026-11-01')?.title).toBe(
      'Sunday Morning Service',
    )
    expect(repository.findById('missing')).toBeUndefined()
  })

  it('creates an event with an immutable snapshot and notifies subscribers', () => {
    let nextId = 0
    const repository = new InMemoryServiceEventRepository(
      [],
      () => `event-${++nextId}`,
    )
    const previousEvents = repository.list()
    const listener = vi.fn()
    const unsubscribe = repository.subscribe(listener)

    const created = repository.create({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    })

    expect(repository.list()).not.toBe(previousEvents)
    expect(repository.findById(created.id)).toEqual(created)
    expect(created).toEqual(
      expect.objectContaining({
        id: 'event-1',
        requiredPositions: 0,
        assignedPositions: 0,
      }),
    )
    expect(listener).toHaveBeenCalledOnce()

    unsubscribe()
    repository.create({
      title: 'Second Event',
      startsAt: '2026-11-07T19:00:00.000Z',
      endsAt: '2026-11-07T20:00:00.000Z',
      location: 'Chapel',
    })
    expect(listener).toHaveBeenCalledOnce()
  })
})
