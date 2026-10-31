import { describe, expect, it } from 'vitest'
import { InMemoryServiceEventRepository } from './inMemoryServiceEventRepository'

describe('InMemoryServiceEventRepository', () => {
  it('finds a seeded event and represents a missing record', async () => {
    const repository = new InMemoryServiceEventRepository()

    expect((await repository.findById('sunday-2026-11-01'))?.title).toBe(
      'Sunday Morning Service',
    )
    expect(await repository.findById('missing')).toBeUndefined()
  })

  it('creates an event with an immutable snapshot', async () => {
    let nextId = 0
    const repository = new InMemoryServiceEventRepository(
      [],
      () => `event-${++nextId}`,
    )
    const previousEvents = await repository.list()

    const created = await repository.create({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    })

    expect(await repository.list()).not.toBe(previousEvents)
    expect(await repository.findById(created.id)).toEqual(created)
    expect(created).toEqual(
      expect.objectContaining({
        id: 'event-1',
        requiredPositions: 0,
        assignedPositions: 0,
      }),
    )
  })

  it('rejects work when the request is already aborted', async () => {
    const repository = new InMemoryServiceEventRepository()
    const controller = new AbortController()
    controller.abort()

    await expect(repository.list(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
