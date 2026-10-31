import { describe, expect, it, vi } from 'vitest'
import { HttpServiceEventRepository } from './httpServiceEventRepository'
import { InvalidServiceEventResponseError } from './serviceEventValidation'
import { seededServiceEvents } from './seededServiceEvents'

describe('HttpServiceEventRepository', () => {
  it('lists validated events and forwards cancellation', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(seededServiceEvents),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events/',
      fetcher,
    )

    await expect(repository.list(controller.signal)).resolves.toEqual(
      seededServiceEvents,
    )
    expect(fetcher).toHaveBeenCalledWith('/api/service-events', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
  })

  it('represents a missing detail response as undefined', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 404 }),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
    )

    await expect(repository.findById('missing/event')).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith(
      '/api/service-events/missing%2Fevent',
      { credentials: 'same-origin', signal: undefined },
    )
  })

  it('throws a status-aware error for non-success responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 503 }),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
    )

    await expect(repository.list()).rejects.toEqual(
      expect.objectContaining({
        name: 'ServiceEventHttpError',
        status: 503,
      }),
    )
  })

  it('rejects a successful response with an invalid body', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([{ id: 'incomplete' }]),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
    )

    await expect(repository.list()).rejects.toBeInstanceOf(
      InvalidServiceEventResponseError,
    )
  })

  it('rejects a successful response with malformed JSON', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
    )

    await expect(repository.list()).rejects.toBeInstanceOf(
      InvalidServiceEventResponseError,
    )
  })

  it('posts a creation command and validates the returned event', async () => {
    const created = { ...seededServiceEvents[0], id: 'created-event' }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(created, { status: 201 }),
    )
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
      () => 'XSRF-TOKEN=test-token',
    )
    const command = {
      title: created.title,
      startsAt: created.startsAt,
      endsAt: created.endsAt,
      location: created.location,
    }

    await expect(repository.create(command)).resolves.toEqual(created)
    expect(fetcher).toHaveBeenCalledWith('/api/service-events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'test-token',
      },
      body: JSON.stringify(command),
      signal: undefined,
    })
  })

  it('refuses to post without an antiforgery token', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const repository = new HttpServiceEventRepository(
      '/api/service-events',
      fetcher,
      () => '',
    )

    await expect(
      repository.create({
        title: 'Prayer Night',
        startsAt: '2026-11-06T19:00:00-05:00',
        endsAt: '2026-11-06T20:00:00-05:00',
        location: 'Chapel',
      }),
    ).rejects.toMatchObject({ name: 'MissingAntiforgeryTokenError' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
