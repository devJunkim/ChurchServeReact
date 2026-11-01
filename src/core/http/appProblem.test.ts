import { describe, expect, it } from 'vitest'
import {
  AppProblemError,
  normalizeNetworkError,
  responseProblem,
  toAppProblem,
  unexpectedProblemMessage,
} from './appProblem'

describe('application problems', () => {
  it('maps validation fields without exposing unrelated response text', async () => {
    const error = await responseProblem(
      Response.json(
        {
          title: 'Internal validation details',
          errors: { Title: ['A service name is required.'], Ignored: [42] },
        },
        { status: 400 },
      ),
    )

    expect(error.problem).toEqual({
      kind: 'validation',
      fields: { title: 'A service name is required.' },
    })
  })

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [503, 'unavailable'],
  ] as const)('maps status %i to %s', async (status, kind) => {
    expect((await responseProblem(new Response(null, { status }))).problem.kind).toBe(
      kind,
    )
  })

  it('uses a safe correlation reference for unexpected server failures', async () => {
    const error = await responseProblem(
      Response.json(
        { traceId: 'trace-123', detail: 'Sensitive implementation detail' },
        { status: 500 },
      ),
    )

    expect(error.problem).toEqual({
      kind: 'unexpected',
      correlationId: 'trace-123',
    })
    expect(unexpectedProblemMessage(error.problem, 'Request failed.')).toBe(
      'Request failed. Reference: trace-123.',
    )
  })

  it('normalizes fetch network failures but preserves other exceptions', () => {
    expect(normalizeNetworkError(new TypeError('Failed to fetch'))).toBeInstanceOf(
      AppProblemError,
    )
    const contractError = new Error('Invalid response')
    expect(normalizeNetworkError(contractError)).toBe(contractError)
    expect(toAppProblem(contractError)).toEqual({ kind: 'unexpected' })
  })
})
