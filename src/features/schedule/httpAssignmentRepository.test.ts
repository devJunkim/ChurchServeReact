import { describe, expect, it, vi } from 'vitest'
import { AssignmentConflictError } from './assignmentRepository'
import {
  AssignmentHttpError,
  HttpAssignmentRepository,
} from './httpAssignmentRepository'
import { InvalidAssignmentResponseError } from './assignmentValidation'

describe('HttpAssignmentRepository', () => {
  it('loads and validates an encoded assignment-board URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(boardResponse))
    const repository = new HttpAssignmentRepository(
      '/api/service-events/',
      fetcher,
    )

    const board = await repository.loadBoard('event/one')

    expect(fetcher).toHaveBeenCalledWith(
      '/api/service-events/event%2Fone/assignment-board',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(board.assignments).toEqual([])
  })

  it('posts a versioned idempotent command with antiforgery', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          assignment: assignmentResponse,
          eventVersion: 2,
          assignedPositions: 8,
        },
        201,
      ),
    )
    const repository = new HttpAssignmentRepository(
      '/api/service-events',
      fetcher,
      () => 'XSRF-TOKEN=token-value',
    )

    const result = await repository.assign({
      eventId: 'event-1',
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 1,
      clientRequestId: 'request-1',
    })

    expect(result.assignment.syncStatus).toBe('confirmed')
    expect(fetcher).toHaveBeenCalledWith(
      '/api/service-events/event-1/assignments',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': 'token-value',
        },
        body: JSON.stringify({
          positionId: 'sound-1',
          volunteerId: 'alex',
          expectedEventVersion: 1,
          clientRequestId: 'request-1',
        }),
      }),
    )
  })

  it('turns a 409 response into an authoritative conflict error', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        { message: 'The schedule changed.', board: boardResponse },
        409,
      ),
    )
    const repository = new HttpAssignmentRepository(
      '/api/service-events',
      fetcher,
      () => 'XSRF-TOKEN=token-value',
    )

    const request = repository.assign({
      eventId: 'event-1',
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 1,
      clientRequestId: 'request-1',
    })

    await expect(request).rejects.toMatchObject<AssignmentConflictError>({
      name: 'AssignmentConflictError',
      message: 'The schedule changed.',
      board: expect.objectContaining({ eventId: 'event-1' }),
    })
  })

  it('distinguishes invalid JSON contracts from non-conflict HTTP failures', async () => {
    const invalidRepository = new HttpAssignmentRepository(
      '/api/service-events',
      vi.fn().mockResolvedValue(jsonResponse({ eventId: 'event-1' })),
    )
    await expect(invalidRepository.loadBoard('event-1')).rejects.toBeInstanceOf(
      InvalidAssignmentResponseError,
    )

    const failedRepository = new HttpAssignmentRepository(
      '/api/service-events',
      vi.fn().mockResolvedValue(new Response('offline', { status: 503 })),
    )
    await expect(failedRepository.loadBoard('event-1')).rejects.toEqual(
      new AssignmentHttpError(503),
    )
  })
})

const assignmentResponse = {
  id: 'assignment-1',
  positionId: 'sound-1',
  volunteerId: 'alex',
  volunteerDisplayName: 'Alex Morgan',
  status: 'accepted',
}

const boardResponse = {
  eventId: 'event-1',
  eventVersion: 1,
  assignedPositions: 7,
  positions: [
    {
      id: 'sound-1',
      eventId: 'event-1',
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: '2026-11-01T14:30:00Z',
      endsAt: '2026-11-01T16:30:00Z',
    },
  ],
  volunteers: [
    {
      id: 'alex',
      displayName: 'Alex Morgan',
      eligibleMinistries: ['technical'],
    },
  ],
  assignments: [],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
